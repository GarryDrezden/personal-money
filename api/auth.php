<?php

require_once __DIR__ . '/Database.php';

function appConfig(): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/config.php';
        if (is_readable($path)) {
            $config = require $path;
        } else {
            $config = [
                'DB_DRIVER' => 'sqlite',
                'APP_URL' => 'http://127.0.0.1:8081',
                'APP_HTTPS' => false,
            ];
        }
    }
    return $config;
}

function initSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = !empty(appConfig()['APP_HTTPS']);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => $secure,
    ]);
    session_start();
}

function currentUserId(): ?string
{
    initSession();
    $id = $_SESSION['user_id'] ?? null;
    return is_string($id) && $id !== '' ? $id : null;
}

function requireAuth(): string
{
    $userId = currentUserId();
    if (!$userId) {
        jsonError('Unauthorized', 401);
    }
    return $userId;
}

function isAuthRoute(string $uri, string $method): bool
{
    if (strncmp($uri, '/auth/', 6) === 0) {
        return in_array($uri, ['/auth/login', '/auth/register', '/auth/logout', '/auth/me'], true);
    }
    return false;
}

function authRequiresLogin(string $uri, string $method): bool
{
    if ($uri === '/auth/logout' && $method === 'POST') {
        return true;
    }
    return !isAuthRoute($uri, $method);
}

function seedUserDefaults(PDO $pdo, string $userId): void
{
    $accounts = json_decode(file_get_contents(__DIR__ . '/seed-accounts.json'), true);
    $stmtAcc = $pdo->prepare(
        'INSERT INTO accounts (id, user_id, name, type, color, icon, initial_balance, credit_limit, status, is_active, sort_order)
         VALUES (:id, :uid, :name, :type, :color, :icon, :ib, :cl, :st, :ia, :so)',
    );
    foreach ($accounts as $a) {
        $limit = $a['credit_limit'] ?? null;
        $ib = (float) ($a['initial_balance'] ?? 0);
        if (($a['type'] ?? '') === 'credit' && $limit !== null) {
            $ib = (float) $limit;
        }
        $status = $a['status'] ?? 'active';
        $stmtAcc->execute([
            'id' => $a['id'],
            'uid' => $userId,
            'name' => $a['name'],
            'type' => $a['type'],
            'color' => $a['color'] ?? null,
            'icon' => $a['icon'] ?? null,
            'ib' => $ib,
            'cl' => $limit,
            'st' => $status,
            'ia' => $status === 'active' ? 1 : 0,
            'so' => (int) ($a['sort_order'] ?? 0),
        ]);
    }

    $categories = json_decode(file_get_contents(__DIR__ . '/seed-categories.json'), true);
    $stmtCat = $pdo->prepare(
        'INSERT INTO categories (id, user_id, name, type, color, icon, monthly_limit, is_active, sort_order)
         VALUES (:id, :uid, :name, :type, :color, :icon, :ml, :ia, :so)',
    );
    foreach ($categories as $c) {
        $stmtCat->execute([
            'id' => $c['id'],
            'uid' => $userId,
            'name' => $c['name'],
            'type' => $c['type'],
            'color' => $c['color'] ?? null,
            'icon' => $c['icon'] ?? null,
            'ml' => $c['monthly_limit'] ?? null,
            'ia' => 1,
            'so' => (int) ($c['sort_order'] ?? 0),
        ]);
    }

    $pdo->prepare(
        'INSERT INTO app_settings (user_id, currency, import_completed_at, initial_opening_balance, theme_id)
         VALUES (:uid, \'RUB\', NULL, 0, \'cozy\')',
    )->execute(['uid' => $userId]);
}

function findUserByUsername(PDO $pdo, string $username): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :u');
    $stmt->execute(['u' => $username]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function createUser(PDO $pdo, Database $db, string $username, string $password): array
{
    $username = trim($username);
    if ($username === '' || strlen($username) < 3) {
        jsonError('Username must be at least 3 characters');
    }
    if (strlen($password) < 6) {
        jsonError('Password must be at least 6 characters');
    }
    if (findUserByUsername($pdo, $username)) {
        jsonError('Username already taken', 409);
    }
    $id = $db->uuid();
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare(
        'INSERT INTO users (id, username, password_hash) VALUES (:id, :u, :h)',
    )->execute(['id' => $id, 'u' => $username, 'h' => $hash]);
    seedUserDefaults($pdo, $id);
    return ['id' => $id, 'username' => $username];
}

function loginUser(PDO $pdo, string $username, string $password): array
{
    $user = findUserByUsername($pdo, trim($username));
    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonError('Invalid username or password', 401);
    }
    initSession();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    return ['id' => $user['id'], 'username' => $user['username']];
}

function logoutUser(): void
{
    initSession();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', $p['secure'], $p['httponly']);
    }
    session_destroy();
}
