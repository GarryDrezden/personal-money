#Requires -RunAsAdministrator
# Регистрирует автозапуск Personal Budget при входе в Windows
param(
    [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}

$StartScript = Join-Path $InstallDir "scripts\start-all.ps1"
$TaskName = "PersonalBudgetAutostart"

if (-not (Test-Path $StartScript)) {
    Write-Error "Не найден $StartScript"
    exit 1
}

$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`""

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Автозапуск Personal Budget (nginx + PHP на :8081)" `
    -Force

Write-Host "Задача '$TaskName' создана для: $InstallDir"
Write-Host "При входе в Windows: http://127.0.0.1:8081"
