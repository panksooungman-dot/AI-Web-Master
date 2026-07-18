<#
.SYNOPSIS
    /api/auth/login 요청을 보내 production 400 오류의 원인(A/B/C/D)을 판단하고,
    로그인 성공 시 보호 라우트(GET DeveloperUrl) 리다이렉트까지 확인하는 진단 스크립트.

.DESCRIPTION
    1) POST LoginUrl 에 {"email":TestEmail,"password":TestPassword} JSON 바디로 로그인 요청을 보낸다.
    2) HTTP status code, 응답 headers(특히 Set-Cookie 유무), 응답 body 원문을 터미널에 출력한다.
    3) 응답 body를 아래 4가지 문자열과 대조해 A/B/C/D 중 하나(또는 Unknown)로 결론을 1줄 출력한다.
         A 서버 설정 오류 : "서버 설정 오류로 로그인을 처리할 수 없습니다. 관리자에게 문의하세요."
         B 자격증명 오류  : "이메일 또는 비밀번호가 올바르지 않습니다."
         C JSON/포맷 오류 : "Invalid JSON"
         D 입력 누락      : "이메일과 비밀번호를 모두 입력하세요."
    4) 로그인 성공(HTTP 200 + body의 success:true)일 때만 세션 쿠키를 유지한 채
       GET DeveloperUrl 을 호출해 status와 Location(redirect) 헤더를 출력한다.

.PARAMETER LoginUrl
    로그인 API 엔드포인트 전체 URL. 예: https://www.cnbiz.kr/api/auth/login

.PARAMETER DeveloperUrl
    로그인 성공 후 접근을 확인할 보호 라우트 URL. 예: https://www.cnbiz.kr/developer

.PARAMETER TestEmail
    테스트용 로그인 이메일.

.PARAMETER TestPassword
    테스트용 로그인 비밀번호. 콘솔에는 마스킹되어 출력된다.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\test-login.ps1 `
        -LoginUrl "https://www.cnbiz.kr/api/auth/login" `
        -DeveloperUrl "https://www.cnbiz.kr/developer" `
        -TestEmail "test@example.com" `
        -TestPassword "whatever123"

.NOTES
    - Supabase Key 등 환경변수/민감정보는 이 스크립트가 다루지 않으며 어떤 값도 출력하지 않는다.
    - 쿠키는 이름만 출력하고 값은 출력하지 않는다.
    - Windows PowerShell 5.1 기준(Invoke-WebRequest의 WebException 처리 방식 사용).
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$LoginUrl,

    [Parameter(Mandatory = $true)]
    [string]$DeveloperUrl,

    [Parameter(Mandatory = $true)]
    [string]$TestEmail,

    [Parameter(Mandatory = $true)]
    [string]$TestPassword
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor DarkGray
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor DarkGray
}

function Invoke-HttpRequest {
    <#
        Invoke-WebRequest는 4xx/5xx/3xx(MaximumRedirection 0일 때)에서
        terminating error를 던지므로, 성공/실패 양쪽 모두
        {StatusCode, Headers, Content} 형태로 통일해서 돌려주는 래퍼.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [byte[]]$BodyBytes,
        [string]$ContentType,
        [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession,
        [switch]$NoAutoRedirect
    )

    $invokeParams = @{
        Method          = $Method
        Uri             = $Uri
        UseBasicParsing = $true
        ErrorAction     = "Stop"
    }
    if ($BodyBytes)      { $invokeParams.Body = $BodyBytes }
    if ($ContentType)    { $invokeParams.ContentType = $ContentType }
    if ($WebSession)     { $invokeParams.WebSession = $WebSession }
    if ($NoAutoRedirect) { $invokeParams.MaximumRedirection = 0 }

    try {
        $resp = Invoke-WebRequest @invokeParams
        return [PSCustomObject]@{
            StatusCode = [int]$resp.StatusCode
            Headers    = $resp.Headers
            Content    = $resp.Content
            NetworkOk  = $true
        }
    }
    catch {
        $webResponse = $_.Exception.Response

        if ($null -eq $webResponse) {
            # 응답 자체를 못 받은 네트워크 오류 (DNS 실패, timeout 등)
            return [PSCustomObject]@{
                StatusCode = $null
                Headers    = $null
                Content    = $null
                NetworkOk  = $false
                Error      = $_.Exception.Message
            }
        }

        $statusCode = [int]$webResponse.StatusCode
        $headerTable = @{}
        foreach ($key in $webResponse.Headers.AllKeys) {
            $headerTable[$key] = $webResponse.Headers[$key]
        }

        $content = $null
        try {
            $stream = $webResponse.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $content = $reader.ReadToEnd()
            $reader.Close()
        }
        catch {
            $content = "(응답 본문을 읽지 못했습니다: $($_.Exception.Message))"
        }

        return [PSCustomObject]@{
            StatusCode = $statusCode
            Headers    = $headerTable
            Content    = $content
            NetworkOk  = $true
        }
    }
}

function Get-LoginFailureCategory {
    param([string]$Body)

    if ([string]::IsNullOrWhiteSpace($Body)) { return "Unknown" }

    if ($Body.Contains("서버 설정 오류로 로그인을 처리할 수 없습니다. 관리자에게 문의하세요.")) { return "A (서버 설정 오류)" }
    if ($Body.Contains("이메일 또는 비밀번호가 올바르지 않습니다."))                          { return "B (자격증명 오류)" }
    if ($Body.Contains("Invalid JSON"))                                                        { return "C (JSON/요청 포맷 오류)" }
    if ($Body.Contains("이메일과 비밀번호를 모두 입력하세요."))                                { return "D (입력 누락)" }

    return "Unknown"
}

# ------------------------------------------------------------------
# 1) 로그인 요청
# ------------------------------------------------------------------
Write-Section "1. 로그인 요청 (POST $LoginUrl)"

Write-Host "Test Email    : $TestEmail"
Write-Host "Test Password : $('*' * $TestPassword.Length)  (마스킹됨, $($TestPassword.Length)자)"

$loginBodyJson = (@{ email = $TestEmail; password = $TestPassword } | ConvertTo-Json -Compress)
$loginBodyBytes = [System.Text.Encoding]::UTF8.GetBytes($loginBodyJson)

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginResult = Invoke-HttpRequest -Method Post -Uri $LoginUrl `
    -BodyBytes $loginBodyBytes -ContentType "application/json" `
    -WebSession $session

if (-not $loginResult.NetworkOk) {
    Write-Host ""
    Write-Host "[오류] 요청 자체가 실패했습니다: $($loginResult.Error)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Status Code   : $($loginResult.StatusCode)"

Write-Host ""
Write-Host "--- Response Headers ---"
if ($loginResult.Headers) {
    foreach ($h in $loginResult.Headers.Keys) {
        Write-Host ("  {0}: {1}" -f $h, $loginResult.Headers[$h])
    }
}

$hasSetCookieHeader = $loginResult.Headers -and ($loginResult.Headers.Keys -contains "Set-Cookie")
$sessionCookieNames = @()
if ($session.Cookies) {
    try {
        $cookieCollection = $session.Cookies.GetCookies([Uri]$LoginUrl)
        $sessionCookieNames = @($cookieCollection | ForEach-Object { $_.Name })
    }
    catch {
        $sessionCookieNames = @()
    }
}

Write-Host ""
Write-Host "Set-Cookie 헤더 존재 여부 : $hasSetCookieHeader"
if ($sessionCookieNames.Count -gt 0) {
    Write-Host ("저장된 쿠키 이름(값은 출력하지 않음) : {0}" -f ($sessionCookieNames -join ", "))
}
else {
    Write-Host "저장된 쿠키 없음"
}

Write-Host ""
Write-Host "--- Response Body (원문) ---"
Write-Host $loginResult.Content

# ------------------------------------------------------------------
# 2) A/B/C/D 결론
# ------------------------------------------------------------------
Write-Section "2. 결론 (A/B/C/D 분류)"

$category = Get-LoginFailureCategory -Body $loginResult.Content
Write-Host "[결론] HTTP $($loginResult.StatusCode) -> $category" -ForegroundColor Yellow

# ------------------------------------------------------------------
# 3) 로그인 성공 시에만 보호 라우트 확인
# ------------------------------------------------------------------
$isLoginSuccess = $false
if ($loginResult.StatusCode -eq 200) {
    try {
        $parsed = $loginResult.Content | ConvertFrom-Json
        if ($parsed.success -eq $true) { $isLoginSuccess = $true }
    }
    catch {
        # body가 JSON이 아니면 성공으로 취급하지 않는다.
    }
}

if ($isLoginSuccess) {
    Write-Section "3. 로그인 성공 확인 -> GET $DeveloperUrl 호출"

    $devResult = Invoke-HttpRequest -Method Get -Uri $DeveloperUrl `
        -WebSession $session -NoAutoRedirect

    if (-not $devResult.NetworkOk) {
        Write-Host "[오류] 요청 자체가 실패했습니다: $($devResult.Error)" -ForegroundColor Red
    }
    else {
        Write-Host "Status Code : $($devResult.StatusCode)"

        $location = $null
        if ($devResult.Headers -and ($devResult.Headers.Keys -contains "Location")) {
            $location = $devResult.Headers["Location"]
        }

        if ($location) {
            Write-Host "Location(redirect) 헤더 : $location"
        }
        else {
            Write-Host "Location 헤더 없음 (리다이렉트가 발생하지 않았습니다 - 바로 응답됨)"
        }
    }
}
else {
    Write-Section "3. 로그인 실패 - $DeveloperUrl 호출 생략"
    Write-Host "로그인이 성공(HTTP 200 + success:true)하지 않아 보호 라우트 확인을 건너뜁니다."
}

Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Green
