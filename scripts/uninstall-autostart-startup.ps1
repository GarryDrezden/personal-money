# Удалить ярлык автозапуска из папки «Автозагрузка»
$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "Personal Budget.lnk"
if (Test-Path $ShortcutPath) {
    Remove-Item $ShortcutPath -Force
    Write-Host "Удалён: $ShortcutPath"
} else {
    Write-Host "Ярлык не найден: $ShortcutPath"
}
