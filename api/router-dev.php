<?php
// Router for php -S (development without nginx)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri !== '/' && file_exists(__DIR__ . '/..' . $uri)) {
    return false;
}

require __DIR__ . '/index.php';
