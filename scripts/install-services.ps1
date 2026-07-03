# Register Personal Budget nginx + php-cgi as Windows services (NSSM required)
# Run as Administrator. Adjust paths if needed.

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))).Path
$Nssm = Get-Command nssm -ErrorAction SilentlyContinue

if (-not $Nssm) {
    Write-Error "NSSM not found in PATH. Install NSSM and retry."
    exit 1
}

$StartScript = Join-Path $ProjectRoot "scripts\start-all.ps1"
$StopScript = Join-Path $ProjectRoot "scripts\stop-all.ps1"

& nssm install PersonalBudgetStart "powershell.exe" "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""
& nssm set PersonalBudgetStart AppDirectory $ProjectRoot
& nssm set PersonalBudgetStart Start SERVICE_AUTO_START
& nssm set PersonalBudgetStart DisplayName "Personal Budget (start nginx+php)"

Write-Host "Installed PersonalBudgetStart service."
Write-Host "Manual start: scripts/start-all.ps1"
Write-Host "Site: http://127.0.0.1:8081"
