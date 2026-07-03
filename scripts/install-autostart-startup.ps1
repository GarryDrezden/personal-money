# Автозапуск Personal Budget через папку «Автозагрузка» (без прав администратора)
param(
    [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}

$StartBat = Join-Path $InstallDir "PersonalBudget-StartSilent.bat"
if (-not (Test-Path $StartBat)) {
    Write-Error "Не найден $StartBat"
    exit 1
}

$Startup = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $Startup "Personal Budget.lnk"

$Wsh = New-Object -ComObject WScript.Shell
$Shortcut = $Wsh.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $StartBat
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.WindowStyle = 7
$Shortcut.Description = "Personal Budget server on port 8081"
$Shortcut.Save()

Write-Host "Shortcut created: $ShortcutPath"
Write-Host "Server starts at logon: http://127.0.0.1:8081"
Write-Host ""
Write-Host "For Task Scheduler (hidden) run as Administrator:"
Write-Host "  scripts\install-autostart.ps1"
