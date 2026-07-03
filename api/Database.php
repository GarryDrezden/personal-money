<?php



class Database

{

    private PDO $pdo;

    private string $dbPath;

    private string $driver;

    private array $config;



    public function __construct()

    {

        $this->config = $this->loadConfig();

        $this->driver = $this->config['DB_DRIVER'] ?? 'sqlite';



        if ($this->driver === 'mysql') {

            $host = $this->config['DB_HOST'] ?? 'localhost';

            $name = $this->config['DB_NAME'] ?? '';

            $charset = $this->config['DB_CHARSET'] ?? 'utf8mb4';

            $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";

            $this->pdo = new PDO($dsn, $this->config['DB_USER'] ?? '', $this->config['DB_PASSWORD'] ?? '');

            $this->dbPath = '';

        } else {

            $dataDir = dirname(__DIR__) . '/data';

            if (!is_dir($dataDir)) {

                mkdir($dataDir, 0755, true);

            }

            $this->dbPath = $dataDir . '/personal-budget.sqlite';

            $this->pdo = new PDO('sqlite:' . $this->dbPath);

            $this->pdo->exec('PRAGMA foreign_keys = ON');

        }



        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $this->migrate();

    }



    public function isMysql(): bool

    {

        return $this->driver === 'mysql';

    }



    public function getPdo(): PDO

    {

        return $this->pdo;

    }



    public function getDbPath(): string

    {

        return $this->dbPath;

    }



    private function loadConfig(): array

    {

        $path = __DIR__ . '/config.php';

        if (is_readable($path)) {

            return require $path;

        }

        return [

            'DB_DRIVER' => 'sqlite',

            'APP_URL' => 'http://127.0.0.1:8081',

            'APP_HTTPS' => false,

        ];

    }



    private function migrate(): void

    {

        if ($this->isMysql()) {

            if (!$this->tableExists('users')) {

                $schema = file_get_contents(__DIR__ . '/schema-mysql.sql');

                foreach (array_filter(array_map('trim', explode(';', $schema))) as $stmt) {

                    if ($stmt !== '') {

                        $this->pdo->exec($stmt);

                    }

                }

            }

            return;

        }



        $schema = file_get_contents(__DIR__ . '/schema.sql');

        $this->pdo->exec($schema);

        $this->migrateColumns();

        $this->migrateIndexes();

        $this->migrateTheme();

        $this->migrateMultiUser();

    }



    private function tableExists(string $name): bool

    {

        if ($this->isMysql()) {

            $stmt = $this->pdo->prepare(

                'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :n',

            );

            $stmt->execute(['n' => $name]);

            return (bool) $stmt->fetch();

        }

        $stmt = $this->pdo->prepare(

            "SELECT name FROM sqlite_master WHERE type='table' AND name = :n",

        );

        $stmt->execute(['n' => $name]);

        return (bool) $stmt->fetch();

    }



    private function columnExists(string $table, string $column): bool

    {

        if ($this->isMysql()) {

            $stmt = $this->pdo->prepare(

                'SELECT COLUMN_NAME FROM information_schema.COLUMNS

                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c',

            );

            $stmt->execute(['t' => $table, 'c' => $column]);

            return (bool) $stmt->fetch();

        }

        $cols = array_column(

            $this->pdo->query("PRAGMA table_info({$table})")->fetchAll(),

            'name',

        );

        return in_array($column, $cols, true);

    }



    private function migrateColumns(): void

    {

        if (!$this->tableExists('transactions')) {

            return;

        }



        $accountCols = [

            'credit_limit' => 'REAL',

            'status' => "TEXT NOT NULL DEFAULT 'active'",

        ];

        if ($this->tableExists('accounts')) {

            foreach ($accountCols as $col => $def) {

                if (!$this->columnExists('accounts', $col)) {

                    $this->pdo->exec("ALTER TABLE accounts ADD COLUMN {$col} {$def}");

                }

            }

            $this->pdo->exec("UPDATE accounts SET status = 'hidden' WHERE is_active = 0 AND status = 'active'");

        }



        $txCols = [

            'tx_date' => 'TEXT',

            'account_id' => 'TEXT',

            'target_account_id' => 'TEXT',

            'category_id' => 'TEXT',

            'operation_kind' => "TEXT NOT NULL DEFAULT 'regular'",

            'payment_status' => "TEXT NOT NULL DEFAULT 'done'",

        ];

        foreach ($txCols as $col => $def) {

            if (!$this->columnExists('transactions', $col)) {

                $this->pdo->exec("ALTER TABLE transactions ADD COLUMN {$col} {$def}");

            }

        }

    }



    private function migrateIndexes(): void

    {

        if (!$this->tableExists('transactions')) {

            return;

        }

        if ($this->columnExists('transactions', 'account_id')) {

            $this->pdo->exec(

                'CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)',

            );

        }

        if ($this->columnExists('transactions', 'category_id')) {

            $this->pdo->exec(

                'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)',

            );

        }

    }



    private function migrateTheme(): void

    {

        if (!$this->tableExists('app_settings')) {

            return;

        }

        if ($this->columnExists('app_settings', 'theme_id')) {

            $this->pdo->exec("UPDATE app_settings SET theme_id = 'cozy' WHERE theme_id = 'light'");

            $this->pdo->exec("UPDATE app_settings SET theme_id = 'darkFantasy' WHERE theme_id = 'dark'");

        }

    }



    private function migrateMultiUser(): void

    {

        if (!$this->tableExists('users')) {

            $this->pdo->exec(

                'CREATE TABLE users (

                    id TEXT PRIMARY KEY,

                    username TEXT NOT NULL UNIQUE,

                    password_hash TEXT NOT NULL,

                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

                )',

            );

        }



        foreach (['budget_months', 'accounts', 'categories'] as $table) {

            if ($this->tableExists($table) && !$this->columnExists($table, 'user_id')) {

                $this->pdo->exec("ALTER TABLE {$table} ADD COLUMN user_id TEXT");

            }

        }



        if ($this->tableExists('app_settings') && $this->columnExists('app_settings', 'id')

            && !$this->columnExists('app_settings', 'user_id')) {

            $this->pdo->exec(

                'CREATE TABLE app_settings_v2 (

                    user_id TEXT PRIMARY KEY,

                    currency TEXT NOT NULL DEFAULT \'RUB\',

                    import_completed_at TEXT,

                    initial_opening_balance REAL NOT NULL DEFAULT 2007,

                    theme_id TEXT NOT NULL DEFAULT \'cozy\'

                )',

            );

            $this->pdo->exec('INSERT OR IGNORE INTO app_settings_v2 (user_id, currency, import_completed_at, initial_opening_balance, theme_id)

                SELECT \'__pending__\', currency, import_completed_at, initial_opening_balance, theme_id FROM app_settings WHERE id = 1');

            $this->pdo->exec('DROP TABLE app_settings');

            $this->pdo->exec('ALTER TABLE app_settings_v2 RENAME TO app_settings');

        }



        $userCount = (int) $this->pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();

        $hasOrphanData = false;

        if ($this->tableExists('budget_months') && $this->columnExists('budget_months', 'user_id')) {

            $orphan = $this->pdo->query(

                'SELECT COUNT(*) FROM budget_months WHERE user_id IS NULL OR user_id = \'\'',

            )->fetchColumn();

            $hasOrphanData = (int) $orphan > 0;

        }



        if ($userCount === 0 && $hasOrphanData) {

            $id = $this->uuid();

            $hash = password_hash('123456', PASSWORD_DEFAULT);

            $this->pdo->prepare(

                'INSERT INTO users (id, username, password_hash) VALUES (:id, :u, :h)',

            )->execute(['id' => $id, 'u' => 'GarryDrezden', 'h' => $hash]);



            foreach (['budget_months', 'accounts', 'categories'] as $table) {

                if ($this->tableExists($table) && $this->columnExists($table, 'user_id')) {

                    $this->pdo->prepare("UPDATE {$table} SET user_id = :uid WHERE user_id IS NULL OR user_id = ''")

                        ->execute(['uid' => $id]);

                }

            }



            $settings = $this->pdo->query('SELECT * FROM app_settings LIMIT 1')->fetch();

            if ($settings && ($settings['user_id'] ?? '') === '__pending__') {

                $this->pdo->prepare(

                    'UPDATE app_settings SET user_id = :uid WHERE user_id = \'__pending__\'',

                )->execute(['uid' => $id]);

            } else {

                $this->pdo->prepare(

                    'INSERT OR REPLACE INTO app_settings (user_id, currency, import_completed_at, initial_opening_balance, theme_id)

                     SELECT :uid, currency, import_completed_at, initial_opening_balance, theme_id FROM app_settings LIMIT 1',

                )->execute(['uid' => $id]);

            }

        }

    }



    public function uuid(): string

    {

        return sprintf(

            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',

            mt_rand(0, 0xffff),

            mt_rand(0, 0xffff),

            mt_rand(0, 0xffff),

            mt_rand(0, 0x0fff) | 0x4000,

            mt_rand(0, 0x3fff) | 0x8000,

            mt_rand(0, 0xffff),

            mt_rand(0, 0xffff),

            mt_rand(0, 0xffff),

        );

    }



    public function wipeBudgetData(string $userId): void

    {

        $monthIds = $this->pdo->prepare('SELECT id FROM budget_months WHERE user_id = :uid');

        $monthIds->execute(['uid' => $userId]);

        $ids = $monthIds->fetchAll(PDO::FETCH_COLUMN);

        if ($ids) {

            $ph = implode(',', array_fill(0, count($ids), '?'));

            $this->pdo->prepare("DELETE FROM month_category_totals WHERE month_id IN ({$ph})")->execute($ids);

            $this->pdo->prepare("DELETE FROM transactions WHERE month_id IN ({$ph})")->execute($ids);

        }

        $this->pdo->prepare('DELETE FROM budget_months WHERE user_id = :uid')->execute(['uid' => $userId]);

        $this->pdo->prepare(

            'UPDATE app_settings SET import_completed_at = NULL WHERE user_id = :uid',

        )->execute(['uid' => $userId]);

    }



    public function getSettings(string $userId): array

    {

        $stmt = $this->pdo->prepare('SELECT * FROM app_settings WHERE user_id = :uid');

        $stmt->execute(['uid' => $userId]);

        $row = $stmt->fetch();

        if (!$row) {

            $this->pdo->prepare(

                'INSERT INTO app_settings (user_id) VALUES (:uid)',

            )->execute(['uid' => $userId]);

            $stmt->execute(['uid' => $userId]);

            $row = $stmt->fetch();

        }

        if (!$row) {

            throw new RuntimeException('Settings not found');

        }

        return rowToSettings($row);

    }



    public function updateSettings(string $userId, array $patch): array

    {

        $fields = [];

        $params = ['uid' => $userId];

        if (array_key_exists('initialOpeningBalance', $patch)) {

            $fields[] = 'initial_opening_balance = :iob';

            $params['iob'] = (float) $patch['initialOpeningBalance'];

        }

        if (array_key_exists('themeId', $patch)) {

            $fields[] = 'theme_id = :theme';

            $theme = $patch['themeId'];

            $params['theme'] = in_array($theme, ['cozy', 'darkFantasy', 'light', 'dark'], true)

                ? ($theme === 'light' ? 'cozy' : ($theme === 'dark' ? 'darkFantasy' : $theme))

                : 'cozy';

        }

        if ($fields) {

            $sql = 'UPDATE app_settings SET ' . implode(', ', $fields) . ' WHERE user_id = :uid';

            $this->pdo->prepare($sql)->execute($params);

        }

        return $this->getSettings($userId);

    }



    public function markImportComplete(string $userId): void

    {

        $this->pdo->prepare(

            'UPDATE app_settings SET import_completed_at = :at WHERE user_id = :uid',

        )->execute(['at' => gmdate('c'), 'uid' => $userId]);

    }

}



function rowToSettings(array $row): array

{

    $theme = $row['theme_id'] ?? 'cozy';

    if ($theme === 'light') {

        $theme = 'cozy';

    }

    if ($theme === 'dark') {

        $theme = 'darkFantasy';

    }

    if (!in_array($theme, ['cozy', 'darkFantasy'], true)) {

        $theme = 'cozy';

    }

    return [

        'currency' => $row['currency'] ?? 'RUB',

        'importCompletedAt' => $row['import_completed_at'],

        'initialOpeningBalance' => (float) ($row['initial_opening_balance'] ?? 2007),

        'themeId' => $theme,

    ];

}



function rowToMonth(array $row): array

{

    return [

        'id' => $row['id'],

        'yearMonth' => $row['year_month'],

        'sortOrder' => (int) $row['sort_order'],

        'openingBalance' => $row['opening_balance'] !== null ? (float) $row['opening_balance'] : null,

        'importedBalance' => $row['imported_balance'] !== null ? (float) $row['imported_balance'] : null,

        'collapsed' => (bool) $row['collapsed'],

    ];

}



function rowToAccount(array $row): array

{

    $status = $row['status'] ?? 'active';

    if (!in_array($status, ['active', 'closed', 'hidden'], true)) {

        $status = ($row['is_active'] ?? 1) ? 'active' : 'hidden';

    }

    return [

        'id' => $row['id'],

        'name' => $row['name'],

        'type' => $row['type'],

        'color' => $row['color'],

        'icon' => $row['icon'],

        'initialBalance' => (float) ($row['initial_balance'] ?? 0),

        'creditLimit' => isset($row['credit_limit']) && $row['credit_limit'] !== null

            ? (float) $row['credit_limit']

            : null,

        'status' => $status,

        'isActive' => $status === 'active',

        'sortOrder' => (int) ($row['sort_order'] ?? 0),

    ];

}



function rowToCategory(array $row): array

{

    return [

        'id' => $row['id'],

        'name' => $row['name'],

        'type' => $row['type'],

        'color' => $row['color'],

        'icon' => $row['icon'],

        'monthlyLimit' => isset($row['monthly_limit']) && $row['monthly_limit'] !== null

            ? (float) $row['monthly_limit']

            : null,

        'isActive' => (bool) ($row['is_active'] ?? 1),

        'sortOrder' => (int) ($row['sort_order'] ?? 0),

    ];

}



function rowToTransaction(array $row): array

{

    return [

        'id' => $row['id'],

        'monthId' => $row['month_id'],

        'sortOrder' => (int) $row['sort_order'],

        'txDate' => $row['tx_date'] ?? null,

        'expenseName' => $row['expense_name'],

        'expenseAmount' => $row['expense_amount'] !== null ? (float) $row['expense_amount'] : null,

        'incomeSource' => $row['income_source'],

        'incomeAmount' => $row['income_amount'] !== null ? (float) $row['income_amount'] : null,

        'category' => $row['category'],

        'accountId' => $row['account_id'] ?? null,

        'targetAccountId' => $row['target_account_id'] ?? null,

        'categoryId' => $row['category_id'] ?? null,

        'operationKind' => $row['operation_kind'] ?? 'regular',

        'paymentStatus' => $row['payment_status'] ?? 'done',

        'note' => $row['note'] ?? '',

    ];

}



function rowToCategoryTotal(array $row): array

{

    return [

        'monthId' => $row['month_id'],

        'category' => $row['category'],

        'amount' => (float) $row['amount'],

    ];

}



function suggestCategoryFromTitle(string $title): ?string

{

    $rulesPath = __DIR__ . '/rules/categorize.json';

    if (!is_readable($rulesPath)) {

        return null;

    }

    $rules = json_decode(file_get_contents($rulesPath), true);

    if (!is_array($rules)) {

        return null;

    }

    $lower = mb_strtolower($title, 'UTF-8');

    foreach ($rules as $rule) {

        foreach ($rule['keywords'] ?? [] as $kw) {

            if (mb_strpos($lower, mb_strtolower($kw, 'UTF-8')) !== false) {

                return $rule['categoryId'];

            }

        }

    }

    return null;

}



function monthBelongsToUser(PDO $pdo, string $monthId, string $userId): bool

{

    $stmt = $pdo->prepare('SELECT id FROM budget_months WHERE id = :id AND user_id = :uid');

    $stmt->execute(['id' => $monthId, 'uid' => $userId]);

    return (bool) $stmt->fetch();

}



function accountBelongsToUser(PDO $pdo, string $accountId, string $userId): bool

{

    $stmt = $pdo->prepare('SELECT id FROM accounts WHERE id = :id AND user_id = :uid');

    $stmt->execute(['id' => $accountId, 'uid' => $userId]);

    return (bool) $stmt->fetch();

}



function categoryBelongsToUser(PDO $pdo, string $categoryId, string $userId): bool

{

    $stmt = $pdo->prepare('SELECT id FROM categories WHERE id = :id AND user_id = :uid');

    $stmt->execute(['id' => $categoryId, 'uid' => $userId]);

    return (bool) $stmt->fetch();

}



function transactionBelongsToUser(PDO $pdo, string $txId, string $userId): bool

{

    $stmt = $pdo->prepare(

        'SELECT t.id FROM transactions t

         INNER JOIN budget_months m ON m.id = t.month_id

         WHERE t.id = :id AND m.user_id = :uid',

    );

    $stmt->execute(['id' => $txId, 'uid' => $userId]);

    return (bool) $stmt->fetch();

}


