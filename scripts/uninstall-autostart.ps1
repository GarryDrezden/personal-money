#Requires -RunAsAdministrator
# Удаление задачи автозапуска Personal Budget
$ErrorActionPreference = "SilentlyContinue"
$TaskName = "PersonalBudgetAutostart"

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Задача '$TaskName' удалена (если была)."
