#requires -Version 5.1
<#
    AI Business OS Installer
    -------------------------
    새로운 PC에서 AI Business OS 개발 환경을 최초 1회 자동 구성하기 위한 스크립트다.
    프로젝트 루트를 하드코딩하지 않고, 이 스크립트 자신의 위치(scripts/)를 기준으로
    한 단계 상위 폴더를 프로젝트 루트로 자동 계산한다 — 어느 경로에 Git Clone해도 동작한다.

        powershell -File "<프로젝트 루트>\scripts\setup.ps1"

    확인/구성 항목
      1. Project Root         - 프로젝트 루트 자동 탐지 및 Git 저장소 확인
      2. PowerShell Profile   - Profile 확인·생성 + ai-business-os.ps1 연결 (저장소 전용 devmode/health 등)
      3. Git                  - Git 설치 여부
      4. Claude Code          - Claude Code 설치 여부
      5. Commands Registered  - startday/endday/health/sync/exit 명령 등록 확인
      6. Dynamic Root Detection - 루트가 하드코딩이 아닌 $PSScriptRoot 기준으로 계산됐는지 검증
      7. Health Check         - PATH(git/node/npm) 등 실행 환경 점검
      8. AI CLI (ai 명령)      - packages/cli/install.ps1을 호출해 전역 `ai` 명령 설치 (Get-Command ai 검증)

    2번(PowerShell Profile)은 이 저장소(ai-web-master)에서만 동작하는 `devmode`/`health`
    등 프로젝트 전용 함수를 프로필에 연결한다. 8번(AI CLI)은 이것과 별개로, 저장소
    유무와 무관하게 어떤 컴퓨터·어떤 프로젝트에서도 쓸 수 있는 전역 `ai` 명령
    (packages/cli, @cnbiz/ai-business-os-cli)을 설치한다 — 새 PC에서는 8번이 실제로
    `ai devmode`/`ai new` 등을 쓸 수 있게 해주는 핵심 단계다.

    이 스크립트는 Git Commit/Push를 수행하지 않는다. 8번 단계에서 `ai` 명령 전역
    설치(npm install -g)와 PATH 레지스트리 등록은 수행한다(그 외에는 읽기 전용 확인).
    이미 실행한 적이 있어도 안전하게 다시 실행할 수 있다(중복 연결 방지).
#>

$script:AIBizInstallerVersion = "1.0"

# $PSScriptRoot = 이 파일(scripts/setup.ps1)이 실제로 위치한 폴더.
# 그 상위 폴더(..)가 프로젝트 루트다. dot-source로 로드해도 $PSScriptRoot는
# 파일 자체의 경로를 기준으로 계산되므로 실행 위치(cwd)와 무관하게 항상 정확하다.
$script:AIBizOSRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:AIBizScriptPath = Join-Path $PSScriptRoot "ai-business-os.ps1"
$script:SetupResults = @()

function Add-AIBizSetupResult {
    param(
        [string]$Name,
        [bool]$Success,
        [string]$Detail = ""
    )
    $script:SetupResults += [PSCustomObject]@{
        Name    = $Name
        Success = $Success
        Detail  = $Detail
    }
}

# ------------------------------------------------------------
# 1. Project Root
# ------------------------------------------------------------
if (Test-Path $script:AIBizOSRoot) {
    $isGitRepo = Test-Path (Join-Path $script:AIBizOSRoot ".git")
    if ($isGitRepo) {
        Add-AIBizSetupResult -Name "Project Root" -Success $true -Detail $script:AIBizOSRoot
    } else {
        Add-AIBizSetupResult -Name "Project Root" -Success $false -Detail "$script:AIBizOSRoot 에 .git 폴더가 없습니다"
    }
} else {
    Add-AIBizSetupResult -Name "Project Root" -Success $false -Detail "경로를 찾을 수 없음: $script:AIBizOSRoot"
}

# ------------------------------------------------------------
# 2. PowerShell Profile (확인·생성 + ai-business-os.ps1 연결)
# ------------------------------------------------------------
$profilePath = $PROFILE.CurrentUserCurrentHost
if (-not $profilePath) { $profilePath = $PROFILE }

if (-not (Test-Path $profilePath)) {
    $profileDir = Split-Path $profilePath -Parent
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

if (-not (Test-Path $script:AIBizScriptPath)) {
    Add-AIBizSetupResult -Name "PowerShell Profile" -Success $false -Detail "ai-business-os.ps1을 찾을 수 없음: $script:AIBizScriptPath"
} else {
    $profileContent = ""
    if (Test-Path $profilePath) {
        $profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
    }

    if (-not ($profileContent -and $profileContent.Contains($script:AIBizScriptPath))) {
        $dotSourceBlock = "`n# AI Business OS Terminal`n. `"$script:AIBizScriptPath`"`n"
        Add-Content -Path $profilePath -Value $dotSourceBlock -Encoding utf8
    }
    Add-AIBizSetupResult -Name "PowerShell Profile" -Success $true -Detail $profilePath
}

# ------------------------------------------------------------
# 3. Git
# ------------------------------------------------------------
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    $gitVersion = git --version 2>$null
    Add-AIBizSetupResult -Name "Git" -Success $true -Detail $gitVersion
} else {
    Add-AIBizSetupResult -Name "Git" -Success $false -Detail "설치 필요: https://git-scm.com"
}

# ------------------------------------------------------------
# 4. Claude Code
# ------------------------------------------------------------
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCmd) {
    $claudeVersion = claude --version 2>$null
    Add-AIBizSetupResult -Name "Claude Code" -Success $true -Detail $claudeVersion
} else {
    Add-AIBizSetupResult -Name "Claude Code" -Success $false -Detail "claude 명령을 찾을 수 없음 (PATH 확인 필요)"
}

# ------------------------------------------------------------
# 5. Commands Registered (startday / endday / health / sync / exit)
# ------------------------------------------------------------
if (Test-Path $script:AIBizScriptPath) {
    # ai-business-os.ps1을 실제로 dot-source하면 배너 출력·prompt 재정의·exit 이벤트 등록
    # 같은 부작용이 함께 실행된다. Setup 단계에서는 그런 부작용 없이 "정의되어 있는지"만
    # 확인하면 되므로, 실행하지 않고 파일 내용에서 함수 선언 텍스트만 검사한다.
    $scriptContent = Get-Content $script:AIBizScriptPath -Raw -Encoding UTF8

    $missing = @()
    foreach ($cmd in @("startday", "endday", "health", "sync")) {
        if ($scriptContent -notmatch "(?m)^function\s+$cmd\s*\{") {
            $missing += $cmd
        }
    }
    if (-not (Get-Module -ListAvailable -Name PSReadLine)) {
        $missing += "exit(PSReadLine 없음)"
    }

    if ($missing.Count -eq 0) {
        Add-AIBizSetupResult -Name "Commands Registered" -Success $true -Detail "startday, endday, health, sync, exit"
    } else {
        Add-AIBizSetupResult -Name "Commands Registered" -Success $false -Detail "누락: $($missing -join ', ')"
    }
} else {
    Add-AIBizSetupResult -Name "Commands Registered" -Success $false -Detail "ai-business-os.ps1이 없어 확인할 수 없음"
}

# ------------------------------------------------------------
# 6. Dynamic Root Detection
#    루트가 "D:\ai-web-master" 같은 값으로 하드코딩되지 않고, 이 스크립트의
#    실제 위치($PSScriptRoot)로부터 매번 다시 계산되는지 확인한다.
# ------------------------------------------------------------
$expectedRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$selfConsistent = ($script:AIBizOSRoot -eq $expectedRoot) -and (Test-Path (Join-Path $script:AIBizOSRoot "scripts\setup.ps1"))
if ($selfConsistent) {
    Add-AIBizSetupResult -Name "Dynamic Root Detection" -Success $true -Detail $script:AIBizOSRoot
} else {
    Add-AIBizSetupResult -Name "Dynamic Root Detection" -Success $false -Detail "루트 자동 계산 결과가 일관되지 않음"
}

# ------------------------------------------------------------
# 7. Health Check (PATH: git/node/npm)
# ------------------------------------------------------------
$missingTools = @()
foreach ($tool in @("git", "node", "npm")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        $missingTools += $tool
    }
}
if ($missingTools.Count -eq 0) {
    Add-AIBizSetupResult -Name "Health Check" -Success $true -Detail "git/node/npm 모두 PATH에서 확인됨"
} else {
    Add-AIBizSetupResult -Name "Health Check" -Success $false -Detail "PATH에 없음: $($missingTools -join ', ')"
}

# ------------------------------------------------------------
# 8. AI CLI (전역 `ai` 명령) — packages/cli/install.ps1을 호출해 실제 설치까지 수행
#    2번(PowerShell Profile)은 이 저장소 전용 devmode만 연결할 뿐, `ai` 명령
#    자체는 설치하지 않는다. 새 PC에서 Get-Command ai가 동작하려면 이 단계가
#    반드시 실행되어야 한다. 이미 설치되어 있으면 install.ps1이 자체적으로
#    빠르게(수 초) 재확인만 하고 지나간다(멱등).
# ------------------------------------------------------------
$cliInstallScript = Join-Path $script:AIBizOSRoot "packages\cli\install.ps1"
if (Test-Path $cliInstallScript) {
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host "[setup] AI CLI(ai 명령) 설치 중... (packages/cli/install.ps1)" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    & $cliInstallScript

    # install.ps1이 현재 세션의 $env:Path를 이미 갱신했지만, 그 프로세스
    # 범위를 벗어나 이 스크립트로 돌아왔을 때도 반영되도록 한 번 더 읽는다.
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"

    $aiCmd = Get-Command ai -ErrorAction SilentlyContinue
    if ($aiCmd) {
        Add-AIBizSetupResult -Name "AI CLI (ai 명령)" -Success $true -Detail $aiCmd.Source
    } else {
        Add-AIBizSetupResult -Name "AI CLI (ai 명령)" -Success $false -Detail "설치 후에도 Get-Command ai가 실패함 - 새 터미널에서 다시 확인하세요"
    }
} else {
    Add-AIBizSetupResult -Name "AI CLI (ai 명령)" -Success $false -Detail "packages/cli/install.ps1을 찾을 수 없음: $cliInstallScript"
}

# ------------------------------------------------------------
# 결과 출력
# ------------------------------------------------------------
$separator = "========================================="

Write-Host ""
Write-Host $separator -ForegroundColor DarkCyan
Write-Host "AI Business OS Installer v$script:AIBizInstallerVersion" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor DarkCyan
Write-Host ""

$failCount = 0
foreach ($result in $script:SetupResults) {
    if ($result.Success) {
        Write-Host "✔ $($result.Name)" -ForegroundColor Green
    } else {
        Write-Host "✘ $($result.Name)" -ForegroundColor Red
        if ($result.Detail) { Write-Host "   -> $($result.Detail)" -ForegroundColor DarkGray }
        $failCount++
    }
}

Write-Host ""

if ($failCount -eq 0) {
    Write-Host "Installation Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Step" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ai doctor      개발 환경 재점검"
    Write-Host "ai devmode     VS Code + 실시간 미리보기 + Visual Editor 실행"
    Write-Host "health         (이 저장소 전용) 세부 환경 점검"
    Write-Host "startday       (이 저장소 전용) 오늘 작업 컨텍스트 확인"
} else {
    Write-Host "Installation Incomplete ($failCount 건 확인 필요)" -ForegroundColor Yellow
    Write-Host "위 안내(->)를 참고해 조치한 뒤 다시 실행하세요." -ForegroundColor Yellow
}

Write-Host ""
Write-Host $separator -ForegroundColor DarkCyan
Write-Host ""
