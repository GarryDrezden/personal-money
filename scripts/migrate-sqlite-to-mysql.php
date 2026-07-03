#!/usr/bin/env php
<?php

/**
 * Миграция данных SQLite → MySQL для пользователя GarryDrezden.
 *
 * Usage:
 *   php scripts/migrate-sqlite-to-mysql.php --dry-run
 *   php scripts/migrate-sqlite-to-mysql.php
 *   php scripts/migrate-sqlite-to-mysql.php --force
 *   php scripts/migrate-sqlite-to-mysql.php --sqlite=path/to/file.sqlite
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/api/Database.php';
require_once $root . '/api/auth.php';

$args = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $args, true);
$force = in_array('--force', $args, true);
$sqlitePath = $root . '/data/personal-budget.sqlite';

foreach ($args as $arg) {
    if (str_starts_with($arg, '--sqlite=')) {
        $sqlitePath = substr($arg, 9);
    }
}

if (!is_readable($sqlitePath)) {
    fwrite(STDERR, "SQLite file not found: {$sqlitePath}\n");
    exit(1);
}

$configPath = $root . '/api/config.php';
if (!is_readable($configPath)) {
    fwrite(STDERR, "api/config.php not found. Set DB_DRIVER=mysql and MySQL credentials.\n");
    exit(1);
}
$config = require $configPath;
if (($config['DB_DRIVER'] ?? 'sqlite') !== 'mysql') {
    fwrite(STDERR, "config.php must have DB_DRIVER=mysql for migration target.\n");
    exit(1);
}

$host = $config['DB_HOST'] ?? 'localhost';
$dbName = $config['DB_NAME'] ?? '';
$charset = $config['DB_CHARSET'] ?? 'utf8mb4';
$mysql = new PDO(
    "mysql:host={$host};dbname={$dbName};charset={$charset}",
    $config['DB_USER'] ?? '',
    $config['DB_PASSWORD'] ?? '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);
$mysql->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$sqlite = new PDO('sqlite:' . $sqlitePath);
$sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$sqlite->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$tables = [
    'budget_months',
    'transactions',
    'accounts',
    'categories',
    'month_category_totals',
    'app_settings',
];

function countTable(PDO $pdo, string $table, bool $isSqlite): int
{
    if ($table === 'app_settings' && $isSqlite) {
        if (!tableExists($pdo, $table, $isSqlite)) {
            return 0;
        }
        return (int) $pdo->query('SELECT COUNT(*) FROM app_settings')->fetchColumn();
    }
    if (!tableExists($pdo, $table, $isSqlite)) {
        return 0;
    }
    return (int) $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
}

function tableExists(PDO $pdo, string $name, bool $isSqlite): bool
{
    if ($isSqlite) {
        $stmt = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = :n");
        $stmt->execute(['n' => $name]);
        return (bool) $stmt->fetch();
    }
    $stmt = $pdo->prepare(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :n',
    );
    $stmt->execute(['n' => $name]);
    return (bool) $stmt->fetch();
}

function sqliteHasUserId(PDO $sqlite): bool
{
    if (!tableExists($sqlite, 'budget_months', true)) {
        return false;
    }
    $cols = array_column($sqlite->query('PRAGMA table_info(budget_months)')->fetchAll(), 'name');
    return in_array('user_id', $cols, true);
}

echo "=== SQLite source: {$sqlitePath} ===\n";
foreach ($tables as $t) {
    echo str_pad($t, 24) . countTable($sqlite, $t, true) . "\n";
}

if ($dryRun) {
    echo "\nDry-run complete. No changes written.\n";
    exit(0);
}

$existing = $mysql->prepare('SELECT id FROM users WHERE username = :u');
$existing->execute(['u' => 'GarryDrezden']);
$existingUser = $existing->fetch();

if ($existingUser && !$force) {
    fwrite(STDERR, "User GarryDrezden already exists in MySQL. Use --force to re-migrate.\n");
    exit(1);
}

if ($existingUser && $force) {
    $uid = $existingUser['id'];
    echo "Force mode: clearing data for user {$uid}\n";
    $mysql->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $uid]);
}

$db = new Database();
$mysql = $db->getPdo();

$mysql->beginTransaction();

try {
    $userId = $db->uuid();
    $hash = password_hash('123456', PASSWORD_DEFAULT);
    $mysql->prepare(
        'INSERT INTO users (id, username, password_hash) VALUES (:id, :u, :h)',
    )->execute(['id' => $userId, 'u' => 'GarryDrezden', 'h' => $hash]);

    $hasUserId = sqliteHasUserId($sqlite);

    // app_settings
    $settingsRows = $sqlite->query('SELECT * FROM app_settings')->fetchAll();
    foreach ($settingsRows as $row) {
        $mysql->prepare(
            'INSERT INTO app_settings (user_id, currency, import_completed_at, initial_opening_balance, theme_id)
             VALUES (:uid, :cur, :ica, :iob, :theme)',
        )->execute([
            'uid' => $userId,
            'cur' => $row['currency'] ?? 'RUB',
            'ica' => $row['import_completed_at'] ?? null,
            'iob' => $row['initial_opening_balance'] ?? 2007,
            'theme' => $row['theme_id'] ?? 'cozy',
        ]);
        break;
    }
    if (count($settingsRows) === 0) {
        $mysql->prepare('INSERT INTO app_settings (user_id) VALUES (:uid)')->execute(['uid' => $userId]);
    }

    // budget_months
    $months = $sqlite->query('SELECT * FROM budget_months ORDER BY sort_order')->fetchAll();
    $monthStmt = $mysql->prepare(
        'INSERT INTO budget_months (id, user_id, year_month, sort_order, opening_balance, imported_balance, collapsed)
         VALUES (:id, :uid, :ym, :so, :ob, :ib, :col)',
    );
    foreach ($months as $m) {
        if ($hasUserId && !empty($m['user_id']) && $m['user_id'] !== $userId) {
            continue;
        }
        $monthStmt->execute([
            'id' => $m['id'],
            'uid' => $userId,
            'ym' => $m['year_month'],
            'so' => $m['sort_order'],
            'ob' => $m['opening_balance'],
            'ib' => $m['imported_balance'],
            'col' => $m['collapsed'],
        ]);
    }

    // accounts
    $accounts = $sqlite->query('SELECT * FROM accounts ORDER BY sort_order')->fetchAll();
    $accStmt = $mysql->prepare(
        'INSERT INTO accounts (id, user_id, name, type, color, icon, initial_balance, credit_limit, status, is_active, sort_order, created_at, updated_at)
         VALUES (:id, :uid, :name, :type, :color, :icon, :ib, :cl, :st, :ia, :so, :ca, :ua)',
    );
    foreach ($accounts as $a) {
        if ($hasUserId && !empty($a['user_id']) && $a['user_id'] !== $userId) {
            continue;
        }
        $accStmt->execute([
            'id' => $a['id'],
            'uid' => $userId,
            'name' => $a['name'],
            'type' => $a['type'],
            'color' => $a['color'],
            'icon' => $a['icon'],
            'ib' => $a['initial_balance'],
            'cl' => $a['credit_limit'],
            'st' => $a['status'] ?? 'active',
            'ia' => $a['is_active'] ?? 1,
            'so' => $a['sort_order'] ?? 0,
            'ca' => $a['created_at'] ?? gmdate('Y-m-d H:i:s'),
            'ua' => $a['updated_at'] ?? gmdate('Y-m-d H:i:s'),
        ]);
    }

    // categories
    $categories = $sqlite->query('SELECT * FROM categories ORDER BY sort_order')->fetchAll();
    $catStmt = $mysql->prepare(
        'INSERT INTO categories (id, user_id, name, type, color, icon, monthly_limit, is_active, sort_order, created_at, updated_at)
         VALUES (:id, :uid, :name, :type, :color, :icon, :ml, :ia, :so, :ca, :ua)',
    );
    foreach ($categories as $c) {
        if ($hasUserId && !empty($c['user_id']) && $c['user_id'] !== $userId) {
            continue;
        }
        $catStmt->execute([
            'id' => $c['id'],
            'uid' => $userId,
            'name' => $c['name'],
            'type' => $c['type'],
            'color' => $c['color'],
            'icon' => $c['icon'],
            'ml' => $c['monthly_limit'],
            'ia' => $c['is_active'] ?? 1,
            'so' => $c['sort_order'] ?? 0,
            'ca' => $c['created_at'] ?? gmdate('Y-m-d H:i:s'),
            'ua' => $c['updated_at'] ?? gmdate('Y-m-d H:i:s'),
        ]);
    }

    // transactions (via month ids from sqlite)
    $monthIds = array_column($months, 'id');
    if ($monthIds) {
        $transactions = $sqlite->query('SELECT * FROM transactions ORDER BY month_id, sort_order')->fetchAll();
        $txStmt = $mysql->prepare(
            'INSERT INTO transactions (id, month_id, sort_order, tx_date, expense_name, expense_amount,
             income_source, income_amount, category, account_id, target_account_id, category_id,
             operation_kind, payment_status, note)
             VALUES (:id, :mid, :so, :td, :en, :ea, :is, :ia, :cat, :aid, :taid, :cid, :ok, :ps, :note)',
        );
        foreach ($transactions as $t) {
            if (!in_array($t['month_id'], $monthIds, true)) {
                continue;
            }
            $txStmt->execute([
                'id' => $t['id'],
                'mid' => $t['month_id'],
                'so' => $t['sort_order'],
                'td' => $t['tx_date'],
                'en' => $t['expense_name'],
                'ea' => $t['expense_amount'],
                'is' => $t['income_source'],
                'ia' => $t['income_amount'],
                'cat' => $t['category'],
                'aid' => $t['account_id'] ?? null,
                'taid' => $t['target_account_id'] ?? null,
                'cid' => $t['category_id'] ?? null,
                'ok' => $t['operation_kind'] ?? 'regular',
                'ps' => $t['payment_status'] ?? 'done',
                'note' => $t['note'] ?? '',
            ]);
        }
    }

    // month_category_totals
    $totals = $sqlite->query('SELECT * FROM month_category_totals ORDER BY month_id, category')->fetchAll();
    $totStmt = $mysql->prepare(
        'INSERT INTO month_category_totals (month_id, category, amount) VALUES (:mid, :cat, :amt)',
    );
    foreach ($totals as $tot) {
        if (!in_array($tot['month_id'], $monthIds, true)) {
            continue;
        }
        $totStmt->execute([
            'mid' => $tot['month_id'],
            'cat' => $tot['category'],
            'amt' => $tot['amount'],
        ]);
    }

    $mysql->commit();
    echo "\nMigration committed for user GarryDrezden ({$userId})\n";
} catch (Throwable $e) {
    $mysql->rollBack();
    fwrite(STDERR, 'Migration failed: ' . $e->getMessage() . "\n");
    exit(1);
}

echo "\n=== MySQL after migration ===\n";
$uid = $mysql->query("SELECT id FROM users WHERE username = 'GarryDrezden'")->fetchColumn();
foreach ($tables as $t) {
  if ($t === 'app_settings') {
    $c = $mysql->prepare('SELECT COUNT(*) FROM app_settings WHERE user_id = :uid');
    $c->execute(['uid' => $uid]);
    echo str_pad($t, 24) . $c->fetchColumn() . "\n";
    continue;
  }
  if (in_array($t, ['budget_months', 'accounts', 'categories'], true)) {
    $c = $mysql->prepare("SELECT COUNT(*) FROM {$t} WHERE user_id = :uid");
    $c->execute(['uid' => $uid]);
    echo str_pad($t, 24) . $c->fetchColumn() . "\n";
    continue;
  }
  if ($t === 'transactions') {
    $c = $mysql->prepare(
      'SELECT COUNT(*) FROM transactions t INNER JOIN budget_months m ON m.id = t.month_id WHERE m.user_id = :uid',
    );
    $c->execute(['uid' => $uid]);
    echo str_pad($t, 24) . $c->fetchColumn() . "\n";
    continue;
  }
  if ($t === 'month_category_totals') {
    $c = $mysql->prepare(
      'SELECT COUNT(*) FROM month_category_totals mct INNER JOIN budget_months m ON m.id = mct.month_id WHERE m.user_id = :uid',
    );
    $c->execute(['uid' => $uid]);
    echo str_pad($t, 24) . $c->fetchColumn() . "\n";
  }
}

$failed = false;
foreach ($tables as $t) {
    $src = countTable($sqlite, $t, true);
    if ($t === 'app_settings') {
        $dst = 1;
    } elseif (in_array($t, ['budget_months', 'accounts', 'categories'], true)) {
        $c = $mysql->prepare("SELECT COUNT(*) FROM {$t} WHERE user_id = :uid");
        $c->execute(['uid' => $uid]);
        $dst = (int) $c->fetchColumn();
    } else {
        if ($t === 'month_category_totals') {
            $c = $mysql->prepare(
                'SELECT COUNT(*) FROM month_category_totals mct INNER JOIN budget_months m ON m.id = mct.month_id WHERE m.user_id = :uid',
            );
        } else {
            $c = $mysql->prepare(
                'SELECT COUNT(*) FROM transactions t INNER JOIN budget_months m ON m.id = t.month_id WHERE m.user_id = :uid',
            );
        }
        $c->execute(['uid' => $uid]);
        $dst = (int) $c->fetchColumn();
    }
    if ($src !== $dst) {
        echo "MISMATCH {$t}: sqlite={$src} mysql={$dst}\n";
        $failed = true;
    }
}

if ($failed) {
    fwrite(STDERR, "\nRow count verification FAILED.\n");
    exit(1);
}

echo "\nRow count verification OK.\n";
echo "Login: GarryDrezden / 123456 (change password after first login)\n";
