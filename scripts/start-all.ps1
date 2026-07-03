# Start Personal Budget: php-cgi + nginx
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))).Path
$SubstDrive = "Q:"
$Runtime = Join-Path $ProjectRoot "server\runtime"
$PhpCgi = Join-Path $Runtime "php\php-cgi.exe"
$PhpExe = Join-Path $Runtime "php\php.exe"
$Nginx = Join-Path $Runtime "nginx\nginx.exe"
$NginxPrefix = Join-Path $Runtime "nginx"
$UseFallbackRuntime = $false

if (-not (Test-Path $PhpCgi)) {
    $FallbackRoot = "E:\Работа\OSPanel\domains\personal-rpg\server\runtime"
    if (Test-Path (Join-Path $FallbackRoot "php\php-cgi.exe")) {
        $PhpCgi = Join-Path $FallbackRoot "php\php-cgi.exe"
        $PhpExe = Join-Path $FallbackRoot "php\php.exe"
        $UseFallbackRuntime = $true
    }
}
if (-not (Test-Path $Nginx)) {
    $FallbackRoot = "E:\Работа\OSPanel\domains\personal-rpg\server\runtime"
    if (Test-Path (Join-Path $FallbackRoot "nginx\nginx.exe")) {
        $Nginx = Join-Path $FallbackRoot "nginx\nginx.exe"
        $NginxPrefix = Join-Path $FallbackRoot "nginx"
        $UseFallbackRuntime = $true
    }
}

if (-not (Test-Path $PhpCgi)) {
    Write-Error "php-cgi not found. Copy server/runtime from personal-rpg into personal-budget/server/runtime"
    exit 1
}
if (-not (Test-Path $Nginx)) {
    Write-Error "nginx not found. Copy server/runtime/nginx from personal-rpg."
    exit 1
}
if (-not (Test-Path (Join-Path $ProjectRoot "dist\index.html"))) {
    Write-Error "dist/index.html missing. Run: npm run build"
    exit 1
}

# subst Q: -> project (nginx cannot handle Cyrillic paths)
$existing = (subst 2>&1) | Where-Object { $_ -match "^$SubstDrive" }
if ($existing -and $existing -notmatch [regex]::Escape($ProjectRoot)) {
    subst $SubstDrive /d 2>$null
    $existing = $null
}
if (-not $existing) {
    subst $SubstDrive $ProjectRoot
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to map ${SubstDrive} -> $ProjectRoot"
        exit 1
    }
}

$Dist = "${SubstDrive}/dist"
$ApiIndex = "${SubstDrive}/api/index.php"

# nginx -p prefix: use subst path when runtime is inside project, else real path to nginx folder
if ($UseFallbackRuntime) {
    $NginxPrefixSubst = $NginxPrefix -replace '\\', '/'
} else {
    $NginxPrefixSubst = "${SubstDrive}/server/runtime/nginx"
}

$NginxConfDir = Join-Path $NginxPrefix "conf"
if (-not (Test-Path $NginxConfDir)) {
    New-Item -ItemType Directory -Path $NginxConfDir -Force | Out-Null
}
$NginxConf = Join-Path $NginxConfDir "personal-budget.conf"

$lines = @(
    "worker_processes  1;"
    "error_log  logs/personal-budget-error.log;"
    ""
    "events { worker_connections  1024; }"
    ""
    "http {"
    "    include       mime.types;"
    "    default_type  application/octet-stream;"
    "    sendfile      on;"
    "    keepalive_timeout  65;"
    "    server {"
    "        listen       8081;"
    "        server_name  localhost;"
    "        root $Dist;"
    "        index index.html;"
    "        location /api {"
    "            fastcgi_pass   127.0.0.1:9001;"
    "            include        fastcgi_params;"
    "            fastcgi_param  SCRIPT_FILENAME $ApiIndex;"
    "            fastcgi_param  REQUEST_URI `$request_uri;"
    "        }"
    "        location /assets/ {"
    "            try_files `$uri =404;"
    "            expires 7d;"
    "        }"
    "        location / { try_files `$uri `$uri/ /index.html; }"
    "    }"
    "}"
)
Set-Content -Path $NginxConf -Value $lines -Encoding ASCII

function Stop-PortListener([int]$Port) {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
}

function Test-PortInUse([int]$Port) {
    return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

# Stop stale php built-in server / old nginx on our ports
Stop-PortListener 8081
Stop-PortListener 9001
Start-Sleep -Seconds 1

Get-Process nginx -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Start-Process -FilePath $PhpCgi `
    -ArgumentList "-b", "127.0.0.1:9001" `
    -WorkingDirectory (Split-Path $PhpCgi) `
    -WindowStyle Hidden
Start-Sleep -Seconds 2

$nginxPrefixArg = $NginxPrefixSubst -replace '\\', '/'
Start-Process -FilePath $Nginx `
    -ArgumentList "-p", $nginxPrefixArg, "-c", "conf/personal-budget.conf" `
    -WorkingDirectory $NginxPrefix `
    -WindowStyle Hidden
Start-Sleep -Seconds 2

if (-not (Test-PortInUse 8081)) {
    Write-Error "nginx did not start on 8081. Check $NginxPrefix\logs\personal-budget-error.log"
    exit 1
}

Write-Host "Personal Budget: http://127.0.0.1:8081"
Write-Host "PHP: $PhpCgi"
Write-Host "nginx prefix: $nginxPrefixArg"
