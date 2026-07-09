#requires -Version 5.1
<#
    AI Business OS CLI — PowerShell 함수 Wrapper

    npm 전역 설치가 만드는 ai.cmd/ai.ps1/ai는 "실행 파일"이다. 실행 파일(자식
    프로세스)은 자기 자신의 작업 디렉터리만 바꿀 수 있고, 그 프로세스를 실행한
    부모 PowerShell 세션의 위치는 절대 바꿀 수 없다 — OS 프로세스 모델의
    근본적인 제약이며 Node/Python/Go 등 구현 언어와 무관하다(nvm, pyenv,
    conda 등이 실행 파일이 아니라 셸 함수로 배포되는 이유와 동일).

    그래서 `ai`를 여기서 PowerShell 함수로 다시 정의한다. 함수는 부모 셸과
    같은 프로세스/세션에서 실행되므로, 함수 안에서 호출하는 Set-Location은
    실제로 사용자가 보고 있는 그 프롬프트를 이동시킬 수 있다.

    동작 순서:
      1) 임시 파일 경로를 만들어 AI_PWSH_CWD_FILE 환경변수로 실제 CLI(ai.cmd)에
         전달한다.
      2) ai.cmd(= node bin/ai.js)가 평소처럼 실행된다 — 프로젝트 자동 인식·
         선택·메뉴 진행이 전부 그대로 이루어진다. bin/ai.js는 이 환경변수가
         설정되어 있으면, 종료되는 순간(process.on("exit"))의 자기 자신의
         작업 디렉터리(선택된 프로젝트 경로로 이미 이동해 있음)를 그 임시
         파일에 적어 놓는다.
      3) ai.cmd가 끝나면, 이 함수가 그 임시 파일을 읽어 Set-Location으로
         "이 PowerShell 세션 자신"을 그 경로로 이동시킨다.

    설치: install.ps1이 $PROFILE에 이 파일을 dot-source하는 줄을 추가한다.
    $PROFILE은 PowerShell 시작 시에만 읽히므로, 설치 후에는 새 PowerShell
    창을 열어야 이 함수가 적용된다.
#>

function ai {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$CliArgs
    )

    $cwdExportFile = [System.IO.Path]::GetTempFileName()
    $env:AI_PWSH_CWD_FILE = $cwdExportFile

    try {
        # 반드시 확장자(.cmd)를 명시해서 호출한다 — 그냥 "ai"라고 부르면
        # PowerShell이 이 함수 자신을 다시 찾아 호출하는 무한 재귀가 된다.
        # 확장자를 붙이면 함수가 아니라 PATH의 실제 실행 파일(npm이 설치한
        # ai.cmd)을 가리키는 별개의 이름이 되어 재귀를 피할 수 있다.
        & ai.cmd @CliArgs
    } finally {
        Remove-Item Env:\AI_PWSH_CWD_FILE -ErrorAction SilentlyContinue
    }

    if (Test-Path $cwdExportFile) {
        $resolvedPath = Get-Content $cwdExportFile -Raw -ErrorAction SilentlyContinue
        Remove-Item $cwdExportFile -ErrorAction SilentlyContinue

        if ($resolvedPath) {
            $resolvedPath = $resolvedPath.Trim()
            if ($resolvedPath -and (Test-Path -LiteralPath $resolvedPath)) {
                Set-Location -LiteralPath $resolvedPath
            }
        }
    }
}
