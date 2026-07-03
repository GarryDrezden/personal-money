<?php
/**
 * Router for: php -S 127.0.0.1:8081 router-dev.php
 * Serves dist/ static files and /api.
 */
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';

if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/api/index.php';
    return true;
}

$distRoot = __DIR__ . DIRECTORY_SEPARATOR . 'dist';
$distFile = $distRoot . ($uri === '/' ? DIRECTORY_SEPARATOR . 'index.html' : $uri);

if (!is_file($distFile)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found: ' . $uri;
    return true;
}

$ext = strtolower(pathinfo($distFile, PATHINFO_EXTENSION));
$types = [
    'html' => 'text/html; charset=utf-8',
    'js' => 'application/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'svg' => 'image/svg+xml',
    'json' => 'application/json',
    'ico' => 'image/x-icon',
    'woff2' => 'font/woff2',
];
if (isset($types[$ext])) {
    header('Content-Type: ' . $types[$ext]);
}

readfile($distFile);
return true;
