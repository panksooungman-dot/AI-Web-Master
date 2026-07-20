@echo off
REM AI Business OS CLI - 더블클릭 설치 실행기
REM install.ps1을 실행 정책 제약 없이 실행한다. 관리자 권한이 필요 없다.
setlocal
set SCRIPT_DIR=%~dp0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install.ps1"
echo.
pause
endlocal
