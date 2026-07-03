@echo off
cd /d "%~dp0"
echo Personal Budget — автозапуск
echo.
echo [1] Папка Автозагрузка (без админа, рекомендуется)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-autostart-startup.ps1"
echo.
echo [2] Планировщик заданий (нужен администратор)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0scripts\install-autostart.ps1\"\"' -Verb RunAs -Wait" 2>nul
pause
