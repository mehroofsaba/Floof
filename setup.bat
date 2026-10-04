@echo off
cd /d "%~dp0server"
call npm i
if not exist .env copy .env.example .env
cd /d "%~dp0client"
call npm i
notepad "%~dp0server\.env"
echo Setup done. Add GEMINI_API_KEY in .env, save, then run start.bat
pause
