#requires -Version 5.1
<#
    AI Business OS Terminal
    ------------------------
    이 스크립트는 PowerShell Profile에서 dot-source(. ) 방식으로 로드됩니다.
    실제 기능은 전부 이 파일에서 관리합니다. Profile에는 아래 한 줄만 있어야 합니다
    (경로는 실제 설치 위치에 맞게 scripts/setup.ps1이 자동으로 채워 넣는다).

        . "<프로젝트 루트>\scripts\ai-business-os.ps1"

    프로젝트 루트는 하드코딩하지 않고 이 파일 자신의 위치($PSScriptRoot)를 기준으로
    자동 계산되므로, 어느 경로에 Git Clone해도 동일하게 동작한다.

    제공 기능
      - 터미널 시작 배너
      - Prompt에 Git Branch / 변경사항 표시
      - sync      : 원격 최신 반영 (pull) + 의존성 동기화
      - health    : 저장소 상태 점검 (branch, ahead/behind, 변경사항, node/npm)
      - startday  : 하루 시작 루틴 (sync + 상태 요약 + WBS 현재 작업 표시)
      - endday    : 하루 종료 루틴 (상태 점검 + 커밋 안내)
      - release   : 버전 태그 릴리스 준비
      - deploy    : main 브랜치로 push (Vercel Git 연동 배포 트리거)
      - docs      : docs 폴더로 이동 + DOCUMENT_INDEX 목차 표시
      - 종료(exit) 시 변경사항이 있으면 Commit/Push 여부 확인
#>

# ------------------------------------------------------------
# 설정
# ------------------------------------------------------------

# $PSScriptRoot = 이 파일(scripts/ai-business-os.ps1)이 실제로 위치한 폴더.
# 그 상위 폴더(..)가 프로젝트 루트다. dot-source로 로드해도 $PSScriptRoot는
# 파일 자체의 경로를 기준으로 계산되므로 어느 위치에 Clone해도 항상 정확하다.
$script:AIBizOSRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# ------------------------------------------------------------
# 내부 헬퍼 함수 (Git)
# ------------------------------------------------------------

function Test-AIBizGitRepo {
    <# 현재 위치(또는 기본 Root)가 Git 저장소인지 확인 #>
    param([string]$Path = (Get-Location).Path)
    try {
        Push-Location $Path -ErrorAction Stop
        git rev-parse --is-inside-work-tree 2>$null | Out-Null
        $result = ($LASTEXITCODE -eq 0)
    } catch {
        $result = $false
    } finally {
        Pop-Location -ErrorAction SilentlyContinue
    }
    return $result
}

function Get-AIBizGitRoot {
    <# 현재 위치 기준 Git 루트. 실패하면 AIBizOSRoot로 대체 #>
    try {
        $top = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $top) {
            return ($top -replace '/', '\')
        }
    } catch {}
    return $script:AIBizOSRoot
}

function Get-AIBizGitBranch {
    try {
        $branch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($LASTEXITCODE -eq 0) { return $branch }
    } catch {}
    return $null
}

function Get-AIBizGitStatusSummary {
    <# 변경 파일 수, ahead/behind 커밋 수를 반환 #>
    $summary = [PSCustomObject]@{
        Changed = 0
        Ahead   = 0
        Behind  = 0
        Branch  = $null
    }
    if (-not (Test-AIBizGitRepo)) { return $summary }

    $summary.Branch = Get-AIBizGitBranch

    $porcelain = git status --porcelain 2>$null
    if ($LASTEXITCODE -eq 0 -and $porcelain) {
        $summary.Changed = ($porcelain | Measure-Object -Line).Lines
    }

    $upstream = git rev-parse --abbrev-ref '@{u}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $upstream) {
        $counts = git rev-list --left-right --count "HEAD...$upstream" 2>$null
        if ($LASTEXITCODE -eq 0 -and $counts) {
            $parts = $counts -split '\s+'
            if ($parts.Count -ge 2) {
                $summary.Ahead  = [int]$parts[0]
                $summary.Behind = [int]$parts[1]
            }
        }
    }

    return $summary
}

# ------------------------------------------------------------
# Prompt: Git Branch / 변경사항 표시
# ------------------------------------------------------------

function prompt {
    $location = Get-Location
    $isRepo = Test-AIBizGitRepo

    Write-Host "PS " -NoNewline -ForegroundColor DarkGray
    Write-Host $location -NoNewline -ForegroundColor Cyan

    if ($isRepo) {
        $status = Get-AIBizGitStatusSummary
        Write-Host " [" -NoNewline -ForegroundColor DarkGray
        Write-Host $status.Branch -NoNewline -ForegroundColor Yellow

        if ($status.Ahead -gt 0) {
            Write-Host " ↑$($status.Ahead)" -NoNewline -ForegroundColor Green
        }
        if ($status.Behind -gt 0) {
            Write-Host " ↓$($status.Behind)" -NoNewline -ForegroundColor Red
        }
        if ($status.Changed -gt 0) {
            Write-Host " ±$($status.Changed)" -NoNewline -ForegroundColor Magenta
        } else {
            Write-Host " clean" -NoNewline -ForegroundColor DarkGreen
        }
        Write-Host "]" -NoNewline -ForegroundColor DarkGray
    }

    return "`n> "
}

# ------------------------------------------------------------
# 시작 배너
# ------------------------------------------------------------

function Show-AIBizBanner {
    $branch = if (Test-AIBizGitRepo) { Get-AIBizGitBranch } else { $null }

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor DarkCyan
    Write-Host "  AI Business OS Terminal" -ForegroundColor Cyan
    Write-Host "  Repo : $script:AIBizOSRoot" -ForegroundColor Gray
    if ($branch) {
        Write-Host "  Branch: $branch" -ForegroundColor Gray
    }
    Write-Host "  Date : $(Get-Date -Format 'yyyy-MM-dd (ddd) HH:mm')" -ForegroundColor Gray
    Write-Host "--------------------------------------------------" -ForegroundColor DarkCyan
    Write-Host "  sync | health | startday | endday | release | deploy | docs" -ForegroundColor DarkYellow
    Write-Host "==================================================" -ForegroundColor DarkCyan
    Write-Host ""
}

# ------------------------------------------------------------
# 명령: sync
# ------------------------------------------------------------

function sync {
    <# 원격 최신 반영 + 의존성 동기화 #>
    $root = Get-AIBizGitRoot
    if (-not (Test-AIBizGitRepo)) {
        Write-Host "[sync] Git 저장소가 아닙니다." -ForegroundColor Red
        return
    }

    Push-Location $root
    try {
        Write-Host "[sync] git fetch..." -ForegroundColor Cyan
        git fetch --prune

        $before = git rev-parse HEAD 2>$null
        $lockBefore = if (Test-Path "package-lock.json") { (Get-Item "package-lock.json").LastWriteTimeUtc } else { $null }

        Write-Host "[sync] git pull..." -ForegroundColor Cyan
        git pull --ff-only

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[sync] pull 실패 - fast-forward 불가. 수동으로 확인하세요 (git pull / rebase)." -ForegroundColor Red
            return
        }

        $after = git rev-parse HEAD 2>$null
        $lockAfter = if (Test-Path "package-lock.json") { (Get-Item "package-lock.json").LastWriteTimeUtc } else { $null }

        if ($before -ne $after -and $lockBefore -ne $lockAfter -and (Test-Path "package.json")) {
            Write-Host "[sync] package-lock.json 변경 감지 -> npm install 실행" -ForegroundColor Cyan
            npm install
        }

        Write-Host "[sync] 완료." -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------------
# 명령: health
#
#   새 PC에서도 health 한 번으로 개발 환경 전체(Development Tools /
#   Environment / AI Business OS 문서 체계 / Git 상태)가 정상인지 확인한다.
#   각 항목은 실패 시 원인과 해결 방법을 함께 출력하고, 마지막에 Overall
#   Status(PASS/FAIL)로 요약한다.
# ------------------------------------------------------------

function Write-AIBizHealthLine {
    param(
        [bool]$Ok,
        [string]$Label,
        [string]$Detail = "",
        [string]$FixHint = ""
    )
    if ($Ok) {
        if ($Detail) {
            Write-Host ("✅ {0,-14} {1}" -f $Label, $Detail) -ForegroundColor Green
        } else {
            Write-Host "✅ $Label" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ $Label" -ForegroundColor Red
        if ($Detail) { Write-Host "   원인 : $Detail" -ForegroundColor DarkGray }
        if ($FixHint) { Write-Host "   해결 : $FixHint" -ForegroundColor DarkGray }
        $script:AIBizHealthFail = $true
    }
}

function health {
    param([switch]$Full)

    $root = $script:AIBizOSRoot
    $sep = "================================================="
    $script:AIBizHealthFail = $false

    Write-Host ""
    Write-Host $sep -ForegroundColor DarkCyan
    Write-Host "AI Business OS Health Check" -ForegroundColor Cyan
    Write-Host $sep -ForegroundColor DarkCyan

    # --- Development Tools ---
    Write-Host ""
    Write-Host "Development Tools" -ForegroundColor Yellow
    Write-Host "-----------------" -ForegroundColor DarkGray

    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-AIBizHealthLine $true "Git" (git --version 2>$null)
    } else {
        Write-AIBizHealthLine $false "Git" "git 명령을 찾을 수 없음" "https://git-scm.com 에서 설치 후 새 터미널을 여세요"
    }

    if (Get-Command code -ErrorAction SilentlyContinue) {
        $codeVersion = (code --version 2>$null | Select-Object -First 1)
        Write-AIBizHealthLine $true "VS Code" $codeVersion
    } else {
        Write-AIBizHealthLine $false "VS Code" "code 명령을 찾을 수 없음" "VS Code 설치 후 Command Palette에서 'Shell Command: Install code command in PATH' 실행"
    }

    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-AIBizHealthLine $true "Node.js" (node -v 2>$null)
    } else {
        Write-AIBizHealthLine $false "Node.js" "node 명령을 찾을 수 없음" "https://nodejs.org 에서 LTS 버전 설치 후 새 터미널을 여세요"
    }

    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-AIBizHealthLine $true "npm" (npm -v 2>$null)
    } else {
        Write-AIBizHealthLine $false "npm" "npm 명령을 찾을 수 없음" "Node.js를 설치하면 npm이 함께 설치됩니다"
    }

    if (Get-Command claude -ErrorAction SilentlyContinue) {
        Write-AIBizHealthLine $true "Claude Code" (claude --version 2>$null)
    } else {
        Write-AIBizHealthLine $false "Claude Code" "claude 명령을 찾을 수 없음" "https://claude.com/claude-code 설치 후 PATH를 확인하세요"
    }

    # --- Environment ---
    Write-Host ""
    Write-Host "Environment" -ForegroundColor Yellow
    Write-Host "-----------" -ForegroundColor DarkGray

    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion -ge [Version]"5.1") {
        Write-AIBizHealthLine $true "PowerShell" "$psVersion"
    } else {
        Write-AIBizHealthLine $false "PowerShell" "5.1 이상 필요 (현재 $psVersion)" "Windows Update 또는 PowerShell 7 설치 후 재시도"
    }

    $profilePath = $PROFILE.CurrentUserCurrentHost
    if (-not $profilePath) { $profilePath = $PROFILE }
    $scriptPath = Join-Path $root "scripts\ai-business-os.ps1"
    $profileOk = $false
    if (Test-Path $profilePath) {
        $profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
        if ($profileContent -and $profileContent.Contains($scriptPath)) { $profileOk = $true }
    }
    if ($profileOk) {
        Write-AIBizHealthLine $true "Profile" $profilePath
    } else {
        Write-AIBizHealthLine $false "Profile" "PowerShell Profile에 ai-business-os.ps1이 연결되어 있지 않음" "scripts\setup.ps1 실행"
    }

    $pathMissing = @()
    foreach ($tool in @("git", "node", "npm")) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { $pathMissing += $tool }
    }
    if ($pathMissing.Count -eq 0) {
        Write-AIBizHealthLine $true "PATH" "git/node/npm 확인됨"
    } else {
        Write-AIBizHealthLine $false "PATH" "PATH에 없음: $($pathMissing -join ', ')" "설치 후 새 터미널을 열어 PATH를 다시 로드하세요"
    }

    if (Test-Path $root) {
        Write-AIBizHealthLine $true "Project Root" $root
    } else {
        Write-AIBizHealthLine $false "Project Root" "경로를 찾을 수 없음: $root" "저장소를 다시 Clone하세요"
    }

    $isRepo = Test-AIBizGitRepo -Path $root
    if ($isRepo) {
        Write-AIBizHealthLine $true "Git Repository" $root
    } else {
        Write-AIBizHealthLine $false "Git Repository" "$root 는 Git 저장소가 아님" "git clone으로 프로젝트를 다시 받으세요"
    }

    # --- AI Business OS ---
    Write-Host ""
    Write-Host "AI Business OS" -ForegroundColor Yellow
    Write-Host "--------------" -ForegroundColor DarkGray

    $contextPath     = Join-Path $root "docs\09_WORK_HISTORY\CURRENT_CONTEXT.md"
    $workHistoryPath = Join-Path $root "docs\09_WORK_HISTORY\WORK_HISTORY.md"
    $sessionsDir     = Join-Path $root "docs\09_WORK_HISTORY\sessions"

    if (Test-Path $contextPath) {
        Write-AIBizHealthLine $true "CURRENT_CONTEXT"
    } else {
        Write-AIBizHealthLine $false "CURRENT_CONTEXT" "$contextPath 없음" "docs\09_WORK_HISTORY\CURRENT_CONTEXT.md 를 생성하세요"
    }

    if (Test-Path $workHistoryPath) {
        Write-AIBizHealthLine $true "WORK_HISTORY"
    } else {
        Write-AIBizHealthLine $false "WORK_HISTORY" "$workHistoryPath 없음" "docs\09_WORK_HISTORY\WORK_HISTORY.md 를 생성하세요"
    }

    if (Test-Path $sessionsDir) {
        Write-AIBizHealthLine $true "Sessions"
    } else {
        Write-AIBizHealthLine $false "Sessions" "$sessionsDir 없음" "docs\09_WORK_HISTORY\sessions 폴더를 생성하세요"
    }

    if (Get-Command startday -ErrorAction SilentlyContinue) {
        Write-AIBizHealthLine $true "startday"
    } else {
        Write-AIBizHealthLine $false "startday" "함수가 등록되지 않음" "scripts\setup.ps1 실행 후 새 터미널을 여세요"
    }

    if (Get-Command endday -ErrorAction SilentlyContinue) {
        Write-AIBizHealthLine $true "endday"
    } else {
        Write-AIBizHealthLine $false "endday" "함수가 등록되지 않음" "scripts\setup.ps1 실행 후 새 터미널을 여세요"
    }

    if (Get-Module -ListAvailable -Name PSReadLine) {
        Write-AIBizHealthLine $true "exit"
    } else {
        Write-AIBizHealthLine $false "exit" "PSReadLine 모듈이 없어 exit 커밋/푸시 훅이 동작하지 않음" "Install-Module -Name PSReadLine -Scope CurrentUser"
    }

    if (Get-Command health -ErrorAction SilentlyContinue) {
        Write-AIBizHealthLine $true "health"
    } else {
        Write-AIBizHealthLine $false "health" "함수가 등록되지 않음" "scripts\setup.ps1 실행 후 새 터미널을 여세요"
    }

    # --- Git ---
    Write-Host ""
    Write-Host "Git" -ForegroundColor Yellow
    Write-Host "---" -ForegroundColor DarkGray

    if ($isRepo) {
        Push-Location $root
        try {
            $status = Get-AIBizGitStatusSummary
            Write-Host "Branch : $($status.Branch)"
            if ($status.Changed -gt 0) {
                Write-Host "Status : $($status.Changed)건 변경" -ForegroundColor Yellow
            } else {
                Write-Host "Status : clean" -ForegroundColor Green
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "Branch : -" -ForegroundColor DarkGray
        Write-Host "Status : Git 저장소가 아니라 확인 불가" -ForegroundColor Red
    }

    Write-Host ""
    if ($Full) {
        Push-Location $root
        try {
            if (Test-Path "package.json") {
                $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
                if ($pkg.scripts.PSObject.Properties.Name -contains "lint") {
                    Write-Host "[health] npm run lint 실행 중..." -ForegroundColor Cyan
                    npm run lint
                    Write-Host ""
                }
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "(린트/빌드까지 확인하려면: health -Full)" -ForegroundColor DarkGray
        Write-Host ""
    }

    Write-Host $sep -ForegroundColor DarkCyan
    if ($script:AIBizHealthFail) {
        Write-Host "Overall Status : FAIL" -ForegroundColor Red
    } else {
        Write-Host "Overall Status : PASS" -ForegroundColor Green
    }
    Write-Host $sep -ForegroundColor DarkCyan
    Write-Host ""
}

# ------------------------------------------------------------
# 명령: startday
# ------------------------------------------------------------
#
#   Git Commit/Push는 수행하지 않는다. docs/09_WORK_HISTORY/CURRENT_CONTEXT.md와
#   가장 최근 sessions/MM-DD.md만 읽어 하루를 바로 이어갈 수 있도록 요약해 보여준다.
# ------------------------------------------------------------

function Get-AIBizMarkdownSection {
    <# 마크다운 라인 배열에서 지정한 헤더(예: '# 다음 작업') 다음 줄부터
       다음 헤더 줄(#으로 시작) 전까지의 내용을 반환한다. #>
    param(
        [string[]]$Lines,
        [string]$Header
    )
    $capture = $false
    $result = @()
    foreach ($line in $Lines) {
        if (-not $capture -and $line.TrimEnd() -eq $Header) {
            $capture = $true
            continue
        }
        if ($capture -and $line -match '^#{1,6}\s') {
            break
        }
        if ($capture) { $result += $line }
    }
    return $result
}

function startday {
    $root = Get-AIBizGitRoot
    $contextPath     = Join-Path $root "docs\09_WORK_HISTORY\CURRENT_CONTEXT.md"
    $workHistoryPath = Join-Path $root "docs\09_WORK_HISTORY\WORK_HISTORY.md"
    $sessionsDir     = Join-Path $root "docs\09_WORK_HISTORY\sessions"

    Write-Host ""
    Write-Host "====================================" -ForegroundColor DarkCyan
    Write-Host "AI Business OS - Start Day" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor DarkCyan
    Write-Host ""

    if (-not (Test-Path $contextPath)) {
        Write-Host "[startday] CURRENT_CONTEXT.md를 찾을 수 없습니다: $contextPath" -ForegroundColor Red
        return
    }

    $contextLines = Get-Content $contextPath -Encoding UTF8

    # --- Project ---
    $projectName = "AI Business OS"
    $projectLine = $contextLines | Where-Object { $_ -match '^- 프로젝트명\s*:\s*(.+)$' } | Select-Object -First 1
    if ($projectLine -match '^- 프로젝트명\s*:\s*(.+)$') { $projectName = $Matches[1].Trim() }

    Write-Host "Project" -ForegroundColor Yellow
    Write-Host $projectName
    Write-Host ""

    # --- Current Status (프로젝트 정보 > 현재 단계) ---
    $currentStage = "정보 없음"
    $stageLine = $contextLines | Where-Object { $_ -match '^- 현재 단계\s*:\s*(.+)$' } | Select-Object -First 1
    if ($stageLine -match '^- 현재 단계\s*:\s*(.+)$') { $currentStage = $Matches[1].Trim() }

    Write-Host "Current Status" -ForegroundColor Yellow
    Write-Host $currentStage
    Write-Host ""

    # --- Yesterday (가장 최근 session 파일의 완료한 작업) ---
    $lastSession = $null
    if (Test-Path $sessionsDir) {
        $lastSession = Get-ChildItem -Path $sessionsDir -Filter "*.md" -File |
            Sort-Object Name -Descending | Select-Object -First 1
    }

    Write-Host "Yesterday" -ForegroundColor Yellow
    if ($lastSession) {
        $sessionLines = Get-Content $lastSession.FullName -Encoding UTF8
        $completedLines = Get-AIBizMarkdownSection -Lines $sessionLines -Header "# 완료한 작업"
        $completedItems = $completedLines | Where-Object { $_ -match '^\s*-\s+(.+)$' } | ForEach-Object { $_ -replace '^\s*-\s+', '' }
        if ($completedItems.Count -gt 0) {
            foreach ($item in $completedItems) {
                Write-Host "✓ $item" -ForegroundColor Green
            }
        } else {
            Write-Host "(기록된 완료 작업 없음)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "(세션 기록 없음)" -ForegroundColor DarkGray
    }
    Write-Host ""

    # --- Today's Priority (CURRENT_CONTEXT.md > 다음 작업) ---
    $todoLines = Get-AIBizMarkdownSection -Lines $contextLines -Header "# 다음 작업"
    $todoItems = $todoLines | Where-Object { $_ -match '^\s*\d+\.\s+(.+)$' } | ForEach-Object { $_ -replace '^\s*\d+\.\s+', '' }

    Write-Host "Today's Priority" -ForegroundColor Yellow
    if ($todoItems.Count -gt 0) {
        $i = 1
        foreach ($item in $todoItems) {
            Write-Host "$i. $item"
            $i++
        }
    } else {
        Write-Host "(등록된 TODO 없음)" -ForegroundColor DarkGray
    }
    Write-Host ""

    # --- Health Check (읽기 전용 - 문서 존재 여부만 확인, Git Commit/Push 없음) ---
    Write-Host "Health Check" -ForegroundColor Yellow
    if (Test-Path $contextPath) {
        Write-Host "✓ CURRENT_CONTEXT" -ForegroundColor Green
    } else {
        Write-Host "✗ CURRENT_CONTEXT" -ForegroundColor Red
    }
    if (Test-Path $workHistoryPath) {
        Write-Host "✓ WORK_HISTORY" -ForegroundColor Green
    } else {
        Write-Host "✗ WORK_HISTORY" -ForegroundColor Red
    }
    if ($lastSession) {
        Write-Host "✓ Session" -ForegroundColor Green
    } else {
        Write-Host "✗ Session" -ForegroundColor Red
    }
    Write-Host ""

    Write-Host "좋은 하루입니다." -ForegroundColor Cyan
    Write-Host "작업을 시작하세요." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "====================================" -ForegroundColor DarkCyan
}

# ------------------------------------------------------------
# 명령: endday
# ------------------------------------------------------------

function endday {
    $root = Get-AIBizGitRoot
    Write-Host "[endday] 하루 종료 점검을 시작합니다." -ForegroundColor Cyan

    health

    if (-not (Test-AIBizGitRepo)) { return }

    Push-Location $root
    try {
        $status = Get-AIBizGitStatusSummary
        if ($status.Changed -gt 0) {
            Write-Host "[endday] 커밋되지 않은 변경사항이 있습니다." -ForegroundColor Yellow
            Write-Host "  - CHANGELOG.md / WBS.md 갱신 여부를 확인하세요 (AGENTS.md 작업 종료 절차)" -ForegroundColor DarkGray

            $answer = Read-Host "지금 커밋하시겠습니까? (y/N)"
            if ($answer -eq 'y' -or $answer -eq 'Y') {
                git add -A
                $msg = Read-Host "커밋 메시지를 입력하세요"
                if (-not $msg) { $msg = "chore: end of day commit" }
                git commit -m $msg
                Write-Host "[endday] 커밋 완료. push는 'deploy' 명령으로 진행하세요." -ForegroundColor Green
            } else {
                Write-Host "[endday] 커밋을 건너뛰었습니다." -ForegroundColor DarkGray
            }
        } else {
            Write-Host "[endday] 변경사항 없음 (clean). 오늘도 수고하셨습니다." -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------------
# 명령: release
# ------------------------------------------------------------

function release {
    param(
        [ValidateSet("patch", "minor", "major")]
        [string]$Bump = "patch"
    )

    $root = Get-AIBizGitRoot
    $pkgPath = Join-Path $root "package.json"
    if (-not (Test-Path $pkgPath)) {
        Write-Host "[release] package.json을 찾을 수 없습니다: $pkgPath" -ForegroundColor Red
        return
    }

    Push-Location $root
    try {
        $status = Get-AIBizGitStatusSummary
        if ($status.Changed -gt 0) {
            Write-Host "[release] 커밋되지 않은 변경사항이 있습니다. 먼저 endday로 정리하세요." -ForegroundColor Red
            return
        }

        $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
        $currentVersion = $pkg.version
        Write-Host "[release] 현재 버전: $currentVersion (Bump: $Bump)" -ForegroundColor Cyan

        $parts = $currentVersion -split '\.'
        if ($parts.Count -ne 3) {
            Write-Host "[release] 버전 형식을 해석할 수 없습니다: $currentVersion" -ForegroundColor Red
            return
        }
        [int]$major, [int]$minor, [int]$patch = $parts

        switch ($Bump) {
            "major" { $major++; $minor = 0; $patch = 0 }
            "minor" { $minor++; $patch = 0 }
            "patch" { $patch++ }
        }
        $newVersion = "$major.$minor.$patch"

        $answer = Read-Host "새 버전 v$newVersion 로 릴리스를 진행할까요? (y/N)"
        if ($answer -ne 'y' -and $answer -ne 'Y') {
            Write-Host "[release] 취소되었습니다." -ForegroundColor DarkGray
            return
        }

        $pkg.version = $newVersion
        ($pkg | ConvertTo-Json -Depth 10) | Set-Content $pkgPath -Encoding utf8

        git add $pkgPath
        git commit -m "chore(release): v$newVersion"
        git tag "v$newVersion"

        Write-Host "[release] v$newVersion 태그 생성 완료." -ForegroundColor Green
        Write-Host "  push하려면: git push && git push --tags (또는 deploy 명령 사용)" -ForegroundColor DarkGray
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------------
# 명령: deploy
# ------------------------------------------------------------

function deploy {
    param(
        [string]$Branch = "main"
    )

    $root = Get-AIBizGitRoot
    if (-not (Test-AIBizGitRepo)) {
        Write-Host "[deploy] Git 저장소가 아닙니다." -ForegroundColor Red
        return
    }

    Push-Location $root
    try {
        $current = Get-AIBizGitBranch
        if ($current -ne $Branch) {
            Write-Host "[deploy] 현재 브랜치($current)가 대상 브랜치($Branch)와 다릅니다." -ForegroundColor Yellow
            $answer = Read-Host "$Branch 브랜치로 전환할까요? (y/N)"
            if ($answer -eq 'y' -or $answer -eq 'Y') {
                git checkout $Branch
            } else {
                Write-Host "[deploy] 취소되었습니다." -ForegroundColor DarkGray
                return
            }
        }

        $status = Get-AIBizGitStatusSummary
        if ($status.Changed -gt 0) {
            Write-Host "[deploy] 커밋되지 않은 변경사항이 있습니다. 먼저 커밋하세요 (endday 명령 참고)." -ForegroundColor Red
            return
        }

        Write-Host "[deploy] $Branch 브랜치를 원격에 push 합니다 (Vercel Git 연동 자동 배포 트리거)." -ForegroundColor Cyan
        $answer = Read-Host "계속할까요? (y/N)"
        if ($answer -ne 'y' -and $answer -ne 'Y') {
            Write-Host "[deploy] 취소되었습니다." -ForegroundColor DarkGray
            return
        }

        git push origin $Branch
        git push origin --tags

        Write-Host "[deploy] push 완료. Vercel 배포 상태를 대시보드에서 확인하세요." -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------------
# 명령: docs
# ------------------------------------------------------------

function docs {
    param([string]$Name)

    $root = Get-AIBizGitRoot
    $docsPath = Join-Path $root "docs"

    if (-not (Test-Path $docsPath)) {
        Write-Host "[docs] docs 폴더를 찾을 수 없습니다: $docsPath" -ForegroundColor Red
        return
    }

    if ($Name) {
        $match = Get-ChildItem -Path $docsPath -Recurse -Filter "*$Name*" -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($match) {
            Write-Host "[docs] 열기: $($match.FullName)" -ForegroundColor Cyan
            Invoke-Item $match.FullName
        } else {
            Write-Host "[docs] '$Name'와(과) 일치하는 문서를 찾지 못했습니다." -ForegroundColor Yellow
        }
        return
    }

    Set-Location $docsPath
    $indexPath = Join-Path $docsPath "00_COMPANY\DOCUMENT_INDEX.md"
    if (Test-Path $indexPath) {
        Write-Host "[docs] DOCUMENT_INDEX.md 목차" -ForegroundColor Cyan
        Get-Content $indexPath | Where-Object { $_ -match '^##\s' } | ForEach-Object {
            Write-Host "  $_"
        }
    } else {
        Write-Host "[docs] DOCUMENT_INDEX.md를 찾을 수 없습니다." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# 종료 시 Commit/Push 여부 확인
#
#   `exit`는 PowerShell 예약 키워드다. function으로 재정의해도
#   Get-Command에는 잡히지만 실제 `exit` 입력 시에는 절대 호출되지
#   않는다(파서가 키워드로 처리하고 세션을 바로 종료함). 그래서
#   PowerShell.Exiting 엔진 이벤트만으로는 액션이 별도 컨텍스트에서
#   실행되어 Read-Host가 응답을 받지 못해 무반응으로 보였다.
#
#   해결: PSReadLine의 Enter 키를 가로채 입력 버퍼가 정확히 "exit"일
#   때는 실제 exit 키워드로 넘기지 않고, 이 자리(메인 스레드)에서 로직을
#   실행한 뒤 [Environment]::Exit()으로 프로세스를 직접 종료한다. 창을
#   X로 닫는 등 PSReadLine을 거치지 않는 종료 경로를 대비해
#   PowerShell.Exiting 이벤트는 폴백으로 유지한다(동일 세션에서 스크립트를
#   다시 dot-source 할 경우를 대비해 기존 구독은 먼저 해제 후 재등록).
# ------------------------------------------------------------

$script:AIBizExitHandled = $false

function Invoke-AIBizExitFlow {
    # git이 어떤 이유로도(core.pager/pager.<cmd> 설정, tty 감지 등) pager를 띄우지
    # 못하도록 환경 변수 + -c 옵션 + --no-pager를 모두 함께 사용해 이중, 삼중으로 막는다.
    $prevGitPager = $env:GIT_PAGER
    $prevPager    = $env:PAGER
    $env:GIT_PAGER = "cat"
    $env:PAGER     = "cat"

    try {
        $root = $script:AIBizOSRoot
        if (Test-Path (Join-Path $root ".git")) {
            Push-Location $root
            try {
                # 변경된 파일 "개수"만 확인한다. 파일 목록 자체는 화면에 출력하지 않는다.
                $porcelain = git -c core.pager=cat -c pager.status=false --no-pager status --porcelain 2>$null
                if ($LASTEXITCODE -eq 0 -and $porcelain) {
                    $count = ($porcelain | Measure-Object -Line).Lines

                    Write-Host ""
                    Write-Host "[exit] 커밋되지 않은 변경사항 $count 건" -ForegroundColor Yellow

                    $commitAnswer = Read-Host "Commit 하시겠습니까? (y/N)"
                    if ($commitAnswer -eq 'y' -or $commitAnswer -eq 'Y') {
                        git -c core.pager=cat --no-pager add -A *> $null

                        $msg = Read-Host "커밋 메시지를 입력하세요"
                        if (-not $msg) { $msg = "chore: session end commit" }

                        git -c core.pager=cat --no-pager commit -m $msg *> $null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Host "[exit] Commit 성공" -ForegroundColor Green
                        } else {
                            Write-Host "[exit] Commit 실패" -ForegroundColor Red
                        }

                        $pushAnswer = Read-Host "Push 하시겠습니까? (y/N)"
                        if ($pushAnswer -eq 'y' -or $pushAnswer -eq 'Y') {
                            git -c core.pager=cat --no-pager push *> $null
                            if ($LASTEXITCODE -eq 0) {
                                Write-Host "[exit] Push 성공" -ForegroundColor Green
                            } else {
                                Write-Host "[exit] Push 실패" -ForegroundColor Red
                            }
                        }
                    }
                }
            } finally {
                Pop-Location
            }
        }
    } catch {
        # 종료 과정 중 오류는 무시 (세션 종료를 막지 않음)
    } finally {
        $env:GIT_PAGER = $prevGitPager
        $env:PAGER     = $prevPager
    }
    Write-Host "안전하게 종료되었습니다." -ForegroundColor Cyan
}

if (Get-Module -ListAvailable -Name PSReadLine) {
    Set-PSReadLineKeyHandler -Chord "Enter" -ScriptBlock {
        param($key, $arg)

        $line = $null
        $cursor = $null
        [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$cursor)

        if ($line -and $line.Trim() -eq "exit") {
            # 실제 exit 키워드로는 절대 넘기지 않는다(넘기면 우리 로직 전에 세션이 즉시 종료됨).
            [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
            Write-Host ""
            $script:AIBizExitHandled = $true
            Invoke-AIBizExitFlow
            [Environment]::Exit(0)
        } else {
            [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine($key, $arg)
        }
    }
}

Get-EventSubscriber -SourceIdentifier "PowerShell.Exiting" -ErrorAction SilentlyContinue | Unregister-Event -Force

Register-EngineEvent -SourceIdentifier "PowerShell.Exiting" -Action {
    if (-not $script:AIBizExitHandled) {
        Invoke-AIBizExitFlow
    }
} | Out-Null

# ------------------------------------------------------------
# 로드 시 배너 표시
# ------------------------------------------------------------

Show-AIBizBanner
