# AI Business OS CLI — Windows 설치 스크립트
#
# 사용법 (관리자 권한 불필요):
#   더블클릭 실행 :  Setup.cmd
#   또는 PowerShell : .\packages\cli\install.ps1
#
# 이 스크립트가 하는 일:
#   1) Git / Node.js / VS Code 설치 여부 확인 — 없으면 winget으로 자동 설치 시도
#   2) npm global install로 `ai` 명령을 등록 (실패하면 사용자 전용 npm prefix로 재시도)
#   3) npm 전역 bin 디렉터리를 사용자 PATH(레지스트리, 영구 반영)에 명시적으로 추가
#   4) 현재 세션의 PATH도 즉시 갱신 (새 터미널을 열지 않아도 바로 ai 명령 사용 가능)
#   5) 파일 존재 여부 + 전체 경로 실행으로 실제 동작을 증거 기반으로 검증
#   6) ai --help / ai doctor 로 최종 점검
#
# 별도의 MSI/EXE 컴파일 설치 프로그램이 아니라, Windows 10/11에 기본 내장된
# winget(패키지 매니저)과 npm의 표준 글로벌 bin 메커니즘을 그대로 사용하므로
# 관리자 권한이 필요 없고, `npm uninstall -g @cnbiz/ai-business-os-cli`로
# 언제든 완전히 제거할 수 있다.


# "Stop"으로 두면 안 된다: 네이티브 실행 파일(npm 등)이 stderr에 한 줄이라도
# 쓰면(예: "npm warn using --force ...") PowerShell 5.1이 이를 즉시 종료 오류로
# 승격시켜 스크립트 전체가 그 시점에서 강제 종료된다 — ai.cmd 생성 코드까지
# 도달하지 못하는 근본 원인이었다. 이 스크립트는 예외(try/catch)가 아니라
# 명시적 $LASTEXITCODE 확인으로 성공 여부를 판단하므로 "Continue"로 충분하다.
$ErrorActionPreference = "Continue"

# Windows PowerShell 5.1의 콘솔 기본 코드페이지가 UTF-8이 아닌 경우 한글/이모지가
# 깨져 보인다. 이 스크립트 안에서만 출력 인코딩을 UTF-8로 맞춘다.
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

Write-Host ""
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host "AI Business OS CLI - Installer" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host ""

$cliRoot = $PSScriptRoot
$overallOk = $true
$startTime = Get-Date

function Write-Step($ok, $label, $detail = "") {
    if ($ok) {
        Write-Host "✅ $label" -ForegroundColor Green -NoNewline
    } else {
        Write-Host "❌ $label" -ForegroundColor Red -NoNewline
        $script:overallOk = $false
    }
    if ($detail) { Write-Host "  $detail" -ForegroundColor DarkGray } else { Write-Host "" }
}

function Update-SessionPath {
    <# 방금 설치된(winget/npm) 프로그램이나 방금 레지스트리에 추가한 PATH는
       이미 열려 있는 이 PowerShell 세션의 $env:Path에 자동으로 반영되지
       않는다. Machine + User PATH를 다시 읽어 현재 세션에 즉시 반영해, 새
       터미널을 열지 않고도 이어서 설치를 계속하거나 바로 ai를 쓸 수 있게 한다. #>
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

function Add-ToUserPath($dir) {
    <# dir을 사용자 PATH(레지스트리, HKCU\Environment)에 영구적으로 추가한다.
       이미 포함되어 있으면 아무 것도 하지 않는다(중복 방지). .NET의
       SetEnvironmentVariable은 WM_SETTINGCHANGE를 브로드캐스트하므로, 이후
       새로 열리는 터미널/탐색기에서 별도 재부팅 없이 반영된다. #>
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ([string]::IsNullOrEmpty($userPath)) { $userPath = "" }
    $entries = $userPath.Split(";") | Where-Object { $_ -ne "" }
    $alreadyPresent = $entries | Where-Object { $_.TrimEnd('\') -ieq $dir.TrimEnd('\') }
    if ($alreadyPresent) { return $false }

    $newUserPath = if ($userPath -and -not $userPath.EndsWith(";")) { "$userPath;$dir" } else { "$userPath$dir" }
    [System.Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    return $true
}

function Install-ViaWinget($wingetId, $label) {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Host "  ⚠️  winget을 찾을 수 없어 $label 자동 설치를 건너뜁니다." -ForegroundColor Yellow
        Write-Host "     Windows 10(21H2+)/11에는 기본 내장되어 있습니다. 수동 설치 후 다시 실행하세요." -ForegroundColor DarkGray
        return $false
    }
    Write-Host "  [install] winget으로 $label 설치 중... (winget install $wingetId)" -ForegroundColor Cyan
    $wingetOutput = & winget install --id $wingetId --silent --accept-package-agreements --accept-source-agreements 2>&1
    $exitCode = $LASTEXITCODE
    $wingetOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    $ok = ($exitCode -eq 0)
    if ($ok) { Update-SessionPath }
    return $ok
}

Write-Host "Development Tools" -ForegroundColor Cyan
Write-Host "-----------------"

# 1) Git 확인 (없으면 winget으로 자동 설치 시도)
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    if (Install-ViaWinget "Git.Git" "Git") {
        $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    }
}
if ($gitCmd) { Write-Step $true "Git" (git --version) } else { Write-Step $false "Git" "https://git-scm.com 에서 설치 후 다시 실행하세요." }

# 2) Node.js 확인 (없으면 winget으로 자동 설치 시도)
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    if (Install-ViaWinget "OpenJS.NodeJS.LTS" "Node.js") {
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    }
}
if ($nodeCmd) { Write-Step $true "Node.js" (node -v) } else { Write-Step $false "Node.js" "https://nodejs.org 에서 LTS 버전 설치 후 다시 실행하세요." }

# 3) npm 확인 (Node.js에 포함됨, 별도 설치 없음)
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) { Write-Step $true "npm" (npm -v) } else { Write-Step $false "npm" "Node.js 설치에 포함되어야 합니다." }

# 4) VS Code 확인 (없으면 winget으로 자동 설치 시도, devmode의 필수 요소는 아니므로 실패해도 계속 진행)
$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if (-not $codeCmd) {
    if (Install-ViaWinget "Microsoft.VisualStudioCode" "VS Code") {
        $codeCmd = Get-Command code -ErrorAction SilentlyContinue
    }
}
if ($codeCmd) { Write-Step $true "VS Code" (code --version | Select-Object -First 1) } else { Write-Step $false "VS Code" "선택 사항 — devmode가 VS Code 없이도 나머지 기능은 정상 동작합니다." }

if (-not $nodeCmd -or -not $npmCmd) {
    Write-Host ""
    Write-Host "Node.js/npm 없이는 ai CLI를 설치할 수 없습니다. 위 안내에 따라 설치 후 다시 실행하세요." -ForegroundColor Red
    exit 1
}

# 5) 전역 설치
#    npm의 기본 global prefix가 관리자 권한이 필요한 위치(예: Node.js를
#    "모든 사용자용"으로 설치한 경우 C:\Program Files\nodejs)를 가리키면,
#    관리자 권한 없이 실행하는 이 스크립트에서 `npm install -g`가 조용히
#    실패할 수 있다. 먼저 기본 prefix로 시도하고, 실패하면 사용자 전용(항상
#    쓰기 가능한) prefix로 전환해 재시도한다.
Write-Host ""
Write-Host "AI Business OS CLI" -ForegroundColor Cyan
Write-Host "------------------"

function Invoke-NpmGlobalInstall {
    Write-Host "[install] npm install -g 실행 중..." -ForegroundColor Cyan
    # --force가 반드시 필요하다: npm은 package.json의 버전이 바뀌지 않았고
    # node_modules 메타데이터가 이미 "설치됨"으로 기록되어 있으면 "up to date"로
    # 판단해 bin shim(ai/ai.cmd/ai.ps1) 재생성을 건너뛴다. 이전에 shim 파일만
    # 수동으로 삭제된 경우(재설치·정리 등) npm은 이를 감지하지 못하고 아무 파일도
    # 만들지 않은 채 종료 코드 0을 반환한다 — 이것이 "설치 완료"가 출력되는데
    # 실제로는 ai.cmd가 없는 상태의 근본 원인이다. --force로 매번 강제 재설치해
    # shim을 무조건 다시 생성시킨다.
    $npmOutput = & npm install -g "$cliRoot" --force 2>&1
    $exitCode = $LASTEXITCODE
    $npmOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    return ($exitCode -eq 0)
}

$installOk = Invoke-NpmGlobalInstall

if (-not $installOk) {
    Write-Host "  ⚠️  기본 위치에 설치하지 못했습니다 (권한 문제일 수 있음). 사용자 전용 위치로 재시도합니다..." -ForegroundColor Yellow
    $userNpmRoot = Join-Path $env:LOCALAPPDATA "ai-business-os\npm-global"
    New-Item -ItemType Directory -Force -Path $userNpmRoot | Out-Null
    npm config set prefix "$userNpmRoot" | Out-Null
    Update-SessionPath
    $env:Path = "$userNpmRoot;$env:Path"
    $installOk = Invoke-NpmGlobalInstall
}

Write-Step $installOk "전역 설치"

if (-not $installOk) {
    Write-Host ""
    Write-Host "설치에 실패했습니다. 위 로그를 확인하세요." -ForegroundColor Red
    exit 1
}

# 6) npm 전역 bin 디렉터리를 실제로 조회해(가정하지 않음) PATH에 명시적으로 추가
#    Windows에서 npm은 prefix 디렉터리 자체에 ai.cmd/ai.ps1/ai 셸 스크립트를 만든다.
$npmPrefix = (npm config get prefix).Trim()
$pathAdded = Add-ToUserPath $npmPrefix
Update-SessionPath

$aiCmdPath = Join-Path $npmPrefix "ai.cmd"
$aiShimExists = Test-Path $aiCmdPath

if (-not $aiShimExists) {
    # --force로 설치했는데도 shim이 없다면, npm이 내부적으로 참조하는
    # node_modules 메타데이터 자체가 꼬여 있을 가능성이 있다. 한 번 완전히
    # 제거한 뒤 처음부터 다시 설치해 확실히 재생성을 시도한다(최후 자동 복구,
    # 그래도 없으면 아래에서 하드 실패 처리).
    Write-Host "  ⚠️  ai.cmd가 생성되지 않았습니다. 완전 재설치로 복구를 시도합니다..." -ForegroundColor Yellow
    & npm uninstall -g "@cnbiz/ai-business-os-cli" 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    Invoke-NpmGlobalInstall | Out-Null
    $aiShimExists = Test-Path $aiCmdPath
}

Write-Step $aiShimExists "ai 실행 파일 생성 확인" $aiCmdPath

if ($pathAdded) {
    Write-Step $true "사용자 PATH 등록" "$npmPrefix (새로 추가함)"
} else {
    $stillInUserPath = ([System.Environment]::GetEnvironmentVariable("Path", "User") -split ";") -icontains $npmPrefix.TrimEnd('\')
    Write-Step $stillInUserPath "사용자 PATH 등록" $(if ($stillInUserPath) { "$npmPrefix (이미 등록됨)" } else { "$npmPrefix (등록 실패)" })
}

$aiCmd = Get-Command ai -ErrorAction SilentlyContinue
Write-Step ([bool]$aiCmd) "현재 세션에서 ai 인식" $(if ($aiCmd) { $aiCmd.Source } else { "PATH는 등록됐지만 이 세션에는 아직 반영되지 않음 (새 터미널에서는 정상 동작)" })

# 7) 최종 점검 — PATH 조회에 의존하지 않고 방금 확인한 전체 경로로 직접 실행해
#    "파일이 실제로 존재하고 실행 가능한가"를 증거로 남긴다.
if ($aiShimExists) {
    Write-Host ""
    Write-Host "최종 점검 (ai --help / ai doctor)" -ForegroundColor Cyan
    Write-Host "----------------------------------"
    & "$aiCmdPath" --help
    & "$aiCmdPath" doctor
} else {
    $overallOk = $false
}

$elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)

Write-Host ""
Write-Host "====================================" -ForegroundColor DarkCyan
if ($overallOk) {
    Write-Host "설치 완료! (${elapsed}초 소요)" -ForegroundColor Green
    Write-Host ""
    if (-not $aiCmd) {
        Write-Host "⚠️  이 창에서는 'ai' 명령이 아직 인식되지 않을 수 있습니다." -ForegroundColor Yellow
        Write-Host "   새 PowerShell 창을 열고 확인하세요: ai doctor" -ForegroundColor Yellow
        Write-Host ""
    }
    Write-Host "다음 단계:" -ForegroundColor Cyan
    Write-Host "  ai new         새 프로젝트 생성"
    Write-Host "  ai devmode     VS Code + 실시간 미리보기 + Visual Editor 바로 실행"
    Write-Host "  ai doctor      개발 환경 재점검"
} else {
    Write-Host "설치가 완전히 끝나지 않았습니다. 위 ❌ 항목을 확인하세요." -ForegroundColor Red
    Write-Host "직접 실행: $aiCmdPath doctor" -ForegroundColor DarkGray
}
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host ""

if (-not $overallOk) { exit 1 }
