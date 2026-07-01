@echo off
title AI-WEB-MASTER Backup

echo =====================================
echo      AI-WEB-MASTER BACKUP
echo =====================================
echo.

git status

echo.
echo -------------------------------------
echo GitHub 백업을 시작합니다...
echo -------------------------------------
echo.

git add .

git diff --cached --quiet

if %errorlevel%==0 (
    echo.
    echo 변경된 파일이 없습니다.
    echo 백업을 종료합니다.
    pause
    exit
)

git commit -m "Backup %date% %time%"

if errorlevel 1 (
    echo.
    echo Commit 실패
    pause
    exit
)

git push

if errorlevel 1 (
    echo.
    echo Push 실패
    pause
    exit
)

echo.
echo =====================================
echo      GitHub 백업 완료!
echo =====================================
echo.

pause