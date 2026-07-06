#requires -Version 5.1
<#
    AI Business OS - Setup Script
    ------------------------------
    새로운 PC에서 AI Business OS 개발 환경을 최초 1회 자동 구성하기 위한 스크립트다.

        powershell -File "D:\ai-web-master\scripts\setup.ps1"

    구성 항목
      1. PowerShell Profile 확인 및 생성
      2. AI Business OS Profile(ai-business-os.ps1) 연결
      3. startday/endday/health/sync/exit 명령 등록 확인
      4. 프로젝트 폴더 확인
      5. Git 설치 여부 확인
      6. Claude Code 사용 환경 확인
      7. 환경 변수(PATH) 확인 (git/node/npm)
      8. 설치 결과 Health Check 출력

    이 스크립트는 Git Commit/Push를 수행하지 않는다 (읽기 전용 확인만 수행).
    이미 실행한 적이 있어도 안전하게 다시 실행할 수 있다(중복 연결 방지).
#>

$script:AIBizOSRoot = "D:\ai-web-master"
$script:AIBizScriptPath = Join-Path $script:AIBizOSRoot "scripts\ai-business-os.ps1"
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

Write-Host ""
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host "AI Business OS - Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host ""

# ------------------------------------------------------------
# 1. PowerShell Profile 확인 및 생성
# ------------------------------------------------------------
Write-Host "[1/8] PowerShell Profile 확인" -ForegroundColor Yellow

$profilePath = $PROFILE.CurrentUserCurrentHost
if (-not $profilePath) { $profilePath = $PROFILE }

if (-not (Test-Path $profilePath)) {
    $profileDir = Split-Path $profilePath -Parent
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
    Write-Host "  생성됨: $profilePath" -ForegroundColor Green
    Add-AIBizSetupResult -Name "PowerShell Profile" -Success $true -Detail "신규 생성: $profilePath"
} else {
    Write-Host "  이미 존재함: $profilePath" -ForegroundColor Green
    Add-AIBizSetupResult -Name "PowerShell Profile" -Success $true -Detail "기존 파일 사용"
}
Write-Host ""

# ------------------------------------------------------------
# 2. AI Business OS Profile 연결
# ------------------------------------------------------------
Write-Host "[2/8] AI Business OS Profile 연결" -ForegroundColor Yellow

if (-not (Test-Path $script:AIBizScriptPath)) {
    Write-Host "  ai-business-os.ps1을 찾을 수 없습니다: $script:AIBizScriptPath" -ForegroundColor Red
    Add-AIBizSetupResult -Name "AI Business OS Profile 연결" -Success $false -Detail "스크립트 없음: $script:AIBizScriptPath"
} else {
    $profileContent = ""
    if (Test-Path $profilePath) {
        $profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
    }

    if ($profileContent -and $profileContent.Contains($script:AIBizScriptPath)) {
        Write-Host "  이미 연결되어 있음" -ForegroundColor Green
        Add-AIBizSetupResult -Name "AI Business OS Profile 연결" -Success $true -Detail "기존 연결 확인"
    } else {
        $dotSourceBlock = "`n# AI Business OS Terminal`n. `"$script:AIBizScriptPath`"`n"
        Add-Content -Path $profilePath -Value $dotSourceBlock -Encoding utf8
        Write-Host "  Profile에 연결 추가됨" -ForegroundColor Green
        Add-AIBizSetupResult -Name "AI Business OS Profile 연결" -Success $true -Detail "신규 연결"
    }
}
Write-Host ""

# ------------------------------------------------------------
# 3. 명령 등록 확인 (startday / endday / health / sync / exit)
# ------------------------------------------------------------
Write-Host "[3/8] 명령 등록 확인 (startday / endday / health / sync / exit)" -ForegroundColor Yellow

if (Test-Path $script:AIBizScriptPath) {
    # ai-business-os.ps1을 실제로 dot-source하면 배너 출력·prompt 재정의·exit 이벤트 등록
    # 같은 부작용이 함께 실행된다. Setup 단계에서는 그런 부작용 없이 "정의되어 있는지"만
    # 확인하면 되므로, 실행하지 않고 파일 내용에서 함수 선언 텍스트만 검사한다.
    $scriptContent = Get-Content $script:AIBizScriptPath -Raw -Encoding UTF8

    $allFound = $true
    foreach ($cmd in @("startday", "endday", "health", "sync")) {
        if ($scriptContent -match "(?m)^function\s+$cmd\s*\{") {
            Write-Host "  ✓ $cmd" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $cmd" -ForegroundColor Red
            $allFound = $false
        }
    }

    # exit는 PowerShell 예약 키워드라 함수로 등록되지 않고 PSReadLine 키 핸들러로 동작한다.
    if (Get-Module -ListAvailable -Name PSReadLine) {
        Write-Host "  ✓ exit (PSReadLine 키 핸들러)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ exit (PSReadLine 모듈 없음)" -ForegroundColor Red
        $allFound = $false
    }

    Add-AIBizSetupResult -Name "명령 등록 (startday/endday/health/sync/exit)" -Success $allFound
} else {
    Write-Host "  ai-business-os.ps1이 없어 확인할 수 없습니다." -ForegroundColor Red
    Add-AIBizSetupResult -Name "명령 등록 (startday/endday/health/sync/exit)" -Success $false -Detail "스크립트 없음"
}
Write-Host ""

# ------------------------------------------------------------
# 4. 프로젝트 폴더 확인
# ------------------------------------------------------------
Write-Host "[4/8] 프로젝트 폴더 확인" -ForegroundColor Yellow

if (Test-Path $script:AIBizOSRoot) {
    Write-Host "  경로: $script:AIBizOSRoot" -ForegroundColor Green
    $isGitRepo = Test-Path (Join-Path $script:AIBizOSRoot ".git")
    if ($isGitRepo) {
        Write-Host "  ✓ Git 저장소 확인됨" -ForegroundColor Green
    } else {
        Write-Host "  ✗ .git 폴더를 찾을 수 없음" -ForegroundColor Red
    }
    Add-AIBizSetupResult -Name "프로젝트 폴더" -Success $isGitRepo -Detail $script:AIBizOSRoot
} else {
    Write-Host "  프로젝트 폴더를 찾을 수 없습니다: $script:AIBizOSRoot" -ForegroundColor Red
    Add-AIBizSetupResult -Name "프로젝트 폴더" -Success $false -Detail "경로 없음: $script:AIBizOSRoot"
}
Write-Host ""

# ------------------------------------------------------------
# 5. Git 설치 여부 확인
# ------------------------------------------------------------
Write-Host "[5/8] Git 설치 여부 확인" -ForegroundColor Yellow

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    $gitVersion = git --version 2>$null
    Write-Host "  ✓ $gitVersion" -ForegroundColor Green
    Add-AIBizSetupResult -Name "Git" -Success $true -Detail $gitVersion
} else {
    Write-Host "  ✗ Git이 설치되어 있지 않거나 PATH에 없습니다." -ForegroundColor Red
    Add-AIBizSetupResult -Name "Git" -Success $false -Detail "설치 필요: https://git-scm.com"
}
Write-Host ""

# ------------------------------------------------------------
# 6. Claude Code 사용 환경 확인
# ------------------------------------------------------------
Write-Host "[6/8] Claude Code 사용 환경 확인" -ForegroundColor Yellow

$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCmd) {
    $claudeVersion = claude --version 2>$null
    Write-Host "  ✓ $claudeVersion" -ForegroundColor Green
    Add-AIBizSetupResult -Name "Claude Code" -Success $true -Detail $claudeVersion
} else {
    Write-Host "  ✗ claude 명령을 찾을 수 없습니다." -ForegroundColor Red
    Add-AIBizSetupResult -Name "Claude Code" -Success $false -Detail "설치 필요 (claude 명령이 PATH에 없음)"
}
Write-Host ""

# ------------------------------------------------------------
# 7. 환경 변수(PATH) 확인
# ------------------------------------------------------------
Write-Host "[7/8] 환경 변수(PATH) 확인" -ForegroundColor Yellow

$pathOk = $true
foreach ($tool in @("git", "node", "npm")) {
    $resolved = Get-Command $tool -ErrorAction SilentlyContinue
    if ($resolved) {
        Write-Host "  ✓ $tool -> $($resolved.Source)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $tool 이(가) PATH에 없습니다." -ForegroundColor Red
        $pathOk = $false
    }
}
Add-AIBizSetupResult -Name "환경 변수(PATH: git/node/npm)" -Success $pathOk
Write-Host ""

# ------------------------------------------------------------
# 8. 설치 결과 Health Check 출력
# ------------------------------------------------------------
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host "Setup Health Check" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host ""

$failCount = 0
foreach ($result in $script:SetupResults) {
    if ($result.Success) {
        Write-Host "✓ $($result.Name)" -ForegroundColor Green
    } else {
        Write-Host "✗ $($result.Name)" -ForegroundColor Red
        if ($result.Detail) { Write-Host "   -> $($result.Detail)" -ForegroundColor DarkGray }
        $failCount++
    }
}
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "AI Business OS 개발 환경 구성이 완료되었습니다." -ForegroundColor Green
    Write-Host "새 PowerShell 창을 열면 startday / endday / health / sync 명령을 사용할 수 있습니다." -ForegroundColor Green
} else {
    Write-Host "$failCount 건의 항목을 확인해야 합니다. 위 안내를 참고해 조치한 뒤 다시 실행하세요." -ForegroundColor Yellow
}
Write-Host "====================================" -ForegroundColor DarkCyan
Write-Host ""
