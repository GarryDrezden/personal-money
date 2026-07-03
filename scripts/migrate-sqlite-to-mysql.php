#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/api/Database.php';
require_once $root . '/api/MigrateFromSqlite.php';

$args = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $args, true);
$force = in_array('--force', $args, true);
$sqlitePath = $root . '/data/personal-budget.sqlite';

foreach ($args as $arg) {
    if (strncmp($arg, '--sqlite=', 9) === 0) {
        $sqlitePath = substr($arg, 9);
    }
}

if (!is_readable($sqlitePath)) {
    fwrite(STDERR, "SQLite file not found: {$sqlitePath}\n");
    exit(1);
}

$configPath = $root . '/api/config.php';
if (!is_readable($configPath)) {
    fwrite(STDERR, "api/config.php not found.\n");
    exit(1);
}
$config = require $configPath;
if (($config['DB_DRIVER'] ?? 'sqlite') !== 'mysql') {
    fwrite(STDERR, "config.php must have DB_DRIVER=mysql.\n");
    exit(1);
}

$sqlite = new PDO('sqlite:' . $sqlitePath);
$sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$sqlite->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$db = new Database();
$result = MigrateFromSqlite::run($sqlite, $db->getPdo(), $db, $dryRun, $force);

foreach ($result['lines'] as $line) {
    echo $line . "\n";
}

if (!$result['ok']) {
    fwrite(STDERR, ($result['error'] ?? 'Failed') . "\n");
    exit(1);
}
