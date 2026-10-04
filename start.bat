@echo off
start "Floof server" cmd /k "cd /d %~dp0server && npm start"
start "Floof client" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 5 >nul
start http://localhost:5173
