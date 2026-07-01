@echo off
title AI-WEB-MASTER Start

echo =====================================
echo      AI-WEB-MASTER START
echo =====================================
echo.

echo [1/4] GitHub 최신 프로젝트 가져오기...
git pull

if errorlevel 1 (
    echo.
    echo Git Pull 실패!
    pause
    exit
)

echo.
echo [2/4] 패키지 확인...
call npm install

if errorlevel 1 (
    echo.
    echo npm install 실패!
    pause
    exit
)

echo.
echo [3/4] VS Code 실행...
start "" code .

echo.
echo [4/4] 개발 서버 시작...
start "" cmd /k "npm run dev"

echo.
echo =====================================
echo 작업 준비 완료!
echo =====================================
exit