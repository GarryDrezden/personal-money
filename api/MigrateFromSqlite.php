<?php

declare(strict_types=1);

/**
 * Перенос данных SQLite → MySQL на сервере (shared-хостинг).
 */
class MigrateFromSqlite
{
    private const TABLES = [
        'budget_months',
        'transactions',
        'accounts',
        'categories',
        'month_category_totals',
        'app_settings',
    ];

    public static function countSqliteTables(PDO $sqlite): array
    {
        $counts = [];
        foreach (self::TABLES as $table) {
            $counts[$table] = self::countTable($sqlite, $table, true);
        }
        return $counts;
    }

    public static function run(
        PDO $sqlite,
        PDO $mysql,
        Database $db,
        bool $dryRun = false,
        bool $force = false,
        string $username = 'GarryDrezden',
        string $password = '123456',
    ): array {
        $lines = [];
        $sqlitePath = '(uploaded sqlite)';

        $lines[] = '=== SQLite source ===';
        foreach (self::countSqliteTables($sqlite) as $table => $count) {
            $lines[] = str_pad($table, 24) . $count;
        }

        if ($dryRun) {
            $lines[] = '';
            $lines[] = 'Dry-run complete. No changes written.';
            return ['ok' => true, 'dryRun' => true, 'lines' => $lines];
        }

        $existing = $mysql->prepare('SELECT id FROM users WHERE username = :u');
        $existing->execute(['u' => $username]);
        $existingUser = $existing->fetch();

        if ($existingUser && !$force) {
            return [
                'ok' => false,
                'lines' => $lines,
                'error' => "User {$username} already exists in MySQL. Add &force=1 to re-migrate.",
            ];
        }

        if ($existingUser && $force) {
            $uid = $existingUser['id'];
            $lines[] = "Force mode: clearing user {$uid}";
            $mysql->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $uid]);
        }

        $mysql->beginTransaction();

        try {
            $userId = $db->uuid();
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $mysql->prepare(
                'INSERT INTO users (id, username, password_hash) VALUES (:id, :u, :h)',
            )->execute(['id' => $userId, 'u' => $username, 'h' => $hash]);

            $hasUserId = self::sqliteHasUserId($sqlite);

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
            $lines[] = '';
            $lines[] = "Migration committed for user {$username} ({$userId})";
        } catch (Throwable $e) {
            $mysql->rollBack();
            return ['ok' => false, 'lines' => $lines, 'error' => 'Migration failed: ' . $e->getMessage()];
        }

        $lines[] = '';
        $lines[] = '=== MySQL after migration ===';
        $uid = $mysql->query("SELECT id FROM users WHERE username = " . $mysql->quote($username))->fetchColumn();

        foreach (self::TABLES as $t) {
            $lines[] = str_pad($t, 24) . self::countMysqlTableForUser($mysql, $t, (string) $uid);
        }

        $failed = false;
        foreach (self::TABLES as $t) {
            $src = self::countTable($sqlite, $t, true);
            $dst = $t === 'app_settings'
                ? 1
                : self::countMysqlTableForUser($mysql, $t, (string) $uid);
            if ($src !== $dst) {
                $lines[] = "MISMATCH {$t}: sqlite={$src} mysql={$dst}";
                $failed = true;
            }
        }

        if ($failed) {
            return ['ok' => false, 'lines' => $lines, 'error' => 'Row count verification FAILED'];
        }

        $lines[] = '';
        $lines[] = 'Row count verification OK.';
        $lines[] = "Login: {$username} / {$password} (change password after first login)";

        return ['ok' => true, 'lines' => $lines, 'userId' => $uid];
    }

    private static function countMysqlTableForUser(PDO $mysql, string $table, string $uid): int
    {
        if ($table === 'app_settings') {
            $c = $mysql->prepare('SELECT COUNT(*) FROM app_settings WHERE user_id = :uid');
            $c->execute(['uid' => $uid]);
            return (int) $c->fetchColumn();
        }
        if (in_array($table, ['budget_months', 'accounts', 'categories'], true)) {
            $c = $mysql->prepare("SELECT COUNT(*) FROM {$table} WHERE user_id = :uid");
            $c->execute(['uid' => $uid]);
            return (int) $c->fetchColumn();
        }
        if ($table === 'month_category_totals') {
            $c = $mysql->prepare(
                'SELECT COUNT(*) FROM month_category_totals mct INNER JOIN budget_months m ON m.id = mct.month_id WHERE m.user_id = :uid',
            );
        } else {
            $c = $mysql->prepare(
                'SELECT COUNT(*) FROM transactions t INNER JOIN budget_months m ON m.id = t.month_id WHERE m.user_id = :uid',
            );
        }
        $c->execute(['uid' => $uid]);
        return (int) $c->fetchColumn();
    }

    private static function countTable(PDO $pdo, string $table, bool $isSqlite): int
    {
        if (!self::tableExists($pdo, $table, $isSqlite)) {
            return 0;
        }
        return (int) $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
    }

    private static function tableExists(PDO $pdo, string $name, bool $isSqlite): bool
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

    private static function sqliteHasUserId(PDO $sqlite): bool
    {
        if (!self::tableExists($sqlite, 'budget_months', true)) {
            return false;
        }
        $cols = array_column($sqlite->query('PRAGMA table_info(budget_months)')->fetchAll(), 'name');
        return in_array('user_id', $cols, true);
    }
}
