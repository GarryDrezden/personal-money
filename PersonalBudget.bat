@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\start-all.ps1"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8081"
