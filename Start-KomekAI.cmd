@echo off
cd /d "%~dp0"
title KomekAI local server
call npm run dev
echo.
echo KomekAI stopped. Keep this window open while using the app.
pause
