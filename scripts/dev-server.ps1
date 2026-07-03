# Dev server: bundled PHP serves dist + API on :8081 (no nginx needed)
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))).Path
$Php = Join-Path $ProjectRoot "server\runtime\php\php.exe"

if (-not (Test-Path $Php)) {
    $Php = "E:\Работа\OSPanel\domains\personal-rpg\server\runtime\php\php.exe"
}
if (-not (Test-Path $Php)) {
    Write-Error "php.exe not found. Copy server/runtime/php from personal-rpg."
    exit 1
}
if (-not (Test-Path (Join-Path $ProjectRoot "dist\index.html"))) {
    Write-Error "Run npm run build first."
    exit 1
}

& $ProjectRoot\scripts\stop-all.ps1 2>$null

Write-Host "Starting dev server at http://127.0.0.1:8081"
Write-Host "PHP: $Php"
Set-Location $ProjectRoot
& $Php -S 127.0.0.1:8081 router-dev.php
