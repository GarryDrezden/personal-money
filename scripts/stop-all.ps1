# Stop Personal Budget (ports 8081, 9001)
$ErrorActionPreference = "SilentlyContinue"

Get-Process nginx -ErrorAction SilentlyContinue | Stop-Process -Force

foreach ($port in @(8081, 9001)) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
}

subst Q: /d 2>$null

Write-Host "Personal Budget stopped (ports 8081, 9001)"
