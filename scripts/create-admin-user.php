#!/usr/bin/env php
<?php

/**
 * Создать пользователя GarryDrezden на сервере (если миграция с локальной машины недоступна).
 *
 * Usage:
 *   php scripts/create-admin-user.php
 *   php scripts/create-admin-user.php --password=YourSecurePassword
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/api/Database.php';

$password = '123456';
foreach (array_slice($argv, 1) as $arg) {
    if (strncmp($arg, '--password=', 11) === 0) {
        $password = substr($arg, 11);
    }
}

$db = new Database();
$pdo = $db->getPdo();

$existing = $pdo->prepare('SELECT id FROM users WHERE username = :u');
$existing->execute(['u' => 'GarryDrezden']);
if ($existing->fetch()) {
    fwrite(STDERR, "User GarryDrezden already exists.\n");
    exit(0);
}

require_once $root . '/api/auth.php';

$id = $db->uuid();
$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo->prepare('INSERT INTO users (id, username, password_hash) VALUES (:id, :u, :h)')
    ->execute(['id' => $id, 'u' => 'GarryDrezden', 'h' => $hash]);
seedUserDefaults($pdo, $id);

echo "Created GarryDrezden (id={$id}). Password: {$password}\n";
echo "Run migrate-sqlite-to-mysql.php locally to import budget data.\n";
