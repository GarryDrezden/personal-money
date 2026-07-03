<?php

require_once __DIR__ . '/../api/Database.php';

$file = $argv[1] ?? '';
$force = in_array('--force', $argv, true);

if ($file === '') {
    fwrite(STDERR, "Usage: php scripts/import-budget.php <path-to-xlsx> [--force]\n");
    fwrite(STDERR, "       python scripts/import-budget.py <path-to-xlsx> [--force]\n");
    exit(1);
}

$pythonScript = __DIR__ . '/import-budget.py';
$python = 'python';

if (!is_readable($file)) {
    fwrite(STDERR, "File not found: {$file}\n");
    exit(1);
}

$cmd = escapeshellarg($python) . ' ' . escapeshellarg($pythonScript) . ' ' . escapeshellarg($file);
if ($force) {
    $cmd .= ' --force';
}

$output = [];
$code = 0;
exec($cmd, $output, $code);

if ($code !== 0) {
    fwrite(STDERR, implode("\n", $output) . "\n");
    exit($code);
}

echo implode("\n", $output) . "\n";
