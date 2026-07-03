<?php

$config = (function () {
    $path = __DIR__ . '/config.php';
    if (is_readable($path)) {
        return require $path;
    }
    return ['APP_URL' => 'http://127.0.0.1:8081', 'APP_HTTPS' => false];
})();

$appOrigin = rtrim($config['APP_URL'] ?? 'http://127.0.0.1:8081', '/');
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowOrigin = $requestOrigin === $appOrigin ? $requestOrigin : $appOrigin;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . $allowOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/auth.php';

initSession();

function jsonResponse(mixed $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $code = 400): void
{
    jsonResponse(['error' => $message], $code);
}

function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function normalizeTransactionInput(array $body): array
{
    $kind = $body['operationKind'] ?? 'regular';
    if (!in_array($kind, ['regular', 'transfer', 'debt_payment', 'credit_card_payment', 'correction'], true)) {
        $kind = 'regular';
    }
    $status = $body['paymentStatus'] ?? 'done';
    if (!in_array($status, ['done', 'planned', 'ignored'], true)) {
        $status = 'done';
    }

    return [
        'tx_date' => isset($body['txDate']) && $body['txDate'] !== '' ? (string) $body['txDate'] : null,
        'expense_name' => isset($body['expenseName']) && $body['expenseName'] !== ''
            ? (string) $body['expenseName']
            : null,
        'expense_amount' => isset($body['expenseAmount']) && $body['expenseAmount'] !== '' && $body['expenseAmount'] !== null
            ? (float) $body['expenseAmount']
            : null,
        'income_source' => isset($body['incomeSource']) && $body['incomeSource'] !== ''
            ? (string) $body['incomeSource']
            : null,
        'income_amount' => isset($body['incomeAmount']) && $body['incomeAmount'] !== '' && $body['incomeAmount'] !== null
            ? (float) $body['incomeAmount']
            : null,
        'category' => isset($body['category']) && $body['category'] !== ''
            ? (string) $body['category']
            : null,
        'account_id' => isset($body['accountId']) && $body['accountId'] !== ''
            ? (string) $body['accountId']
            : null,
        'target_account_id' => isset($body['targetAccountId']) && $body['targetAccountId'] !== ''
            ? (string) $body['targetAccountId']
            : null,
        'category_id' => isset($body['categoryId']) && $body['categoryId'] !== ''
            ? (string) $body['categoryId']
            : null,
        'operation_kind' => $kind,
        'payment_status' => $status,
        'note' => (string) ($body['note'] ?? ''),
    ];
}

function transactionHasData(array $tx): bool
{
    return ($tx['expense_amount'] !== null && $tx['expense_amount'] != 0)
        || ($tx['income_amount'] !== null && $tx['income_amount'] != 0)
        || ($tx['expense_name'] !== null && $tx['expense_name'] !== '')
        || ($tx['income_source'] !== null && $tx['income_source'] !== '');
}

function insertTransactionFields(): string
{
    return 'id, month_id, sort_order, tx_date, expense_name, expense_amount, income_source, income_amount,
            category, account_id, target_account_id, category_id, operation_kind, payment_status, note';
}

function insertTransactionPlaceholders(): string
{
    return ':id, :mid, :so, :td, :en, :ea, :is, :ia, :cat, :aid, :taid, :cid, :ok, :ps, :note';
}

function bindTransactionParams(array $tx, array $extra): array
{
    return array_merge([
        'td' => $tx['tx_date'],
        'en' => $tx['expense_name'],
        'ea' => $tx['expense_amount'],
        'is' => $tx['income_source'],
        'ia' => $tx['income_amount'],
        'cat' => $tx['category'],
        'aid' => $tx['account_id'],
        'taid' => $tx['target_account_id'],
        'cid' => $tx['category_id'],
        'ok' => $tx['operation_kind'],
        'ps' => $tx['payment_status'],
        'note' => $tx['note'],
    ], $extra);
}

function updateTransactionSet(): string
{
    return 'month_id = :mid, tx_date = :td, expense_name = :en, expense_amount = :ea,
            income_source = :is, income_amount = :ia, category = :cat,
            account_id = :aid, target_account_id = :taid, category_id = :cid,
            operation_kind = :ok, payment_status = :ps, note = :note';
}

function ensureBudgetMonth(PDO $pdo, Database $db, string $userId, string $yearMonth): array
{
    if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
        jsonError('Invalid yearMonth');
    }
    $stmt = $pdo->prepare('SELECT * FROM budget_months WHERE user_id = :uid AND year_month = :ym');
    $stmt->execute(['uid' => $userId, 'ym' => $yearMonth]);
    $row = $stmt->fetch();
    if ($row) {
        return rowToMonth($row);
    }
    $maxStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM budget_months WHERE user_id = :uid');
    $maxStmt->execute(['uid' => $userId]);
    $maxSort = (int) $maxStmt->fetchColumn();
    $id = $db->uuid();
    $pdo->prepare(
        'INSERT INTO budget_months (id, user_id, year_month, sort_order, opening_balance, imported_balance, collapsed)
         VALUES (:id, :uid, :ym, :so, NULL, NULL, 1)',
    )->execute([
        'id' => $id,
        'uid' => $userId,
        'ym' => $yearMonth,
        'so' => $maxSort + 1,
    ]);
    $stmt->execute(['uid' => $userId, 'ym' => $yearMonth]);
    return rowToMonth($stmt->fetch());
}

function resolveTransactionMonthId(PDO $pdo, Database $db, string $userId, string $fallbackMonthId, ?string $txDate): string
{
    if ($txDate && preg_match('/^(\d{4}-\d{2})/', $txDate, $m)) {
        return ensureBudgetMonth($pdo, $db, $userId, $m[1])['id'];
    }
    if (!$fallbackMonthId) {
        jsonError('monthId required');
    }
    if (!monthBelongsToUser($pdo, $fallbackMonthId, $userId)) {
        jsonError('Month not found', 404);
    }
    return $fallbackMonthId;
}

function normalizeAccountInput(array $body): array
{
    $status = $body['status'] ?? 'active';
    if (!in_array($status, ['active', 'closed', 'hidden'], true)) {
        $status = !empty($body['isActive']) ? 'active' : 'hidden';
    }
    return [
        'name' => (string) ($body['name'] ?? ''),
        'type' => in_array($body['type'] ?? 'debit', ['debit', 'credit'], true) ? $body['type'] : 'debit',
        'color' => $body['color'] ?? null,
        'icon' => $body['icon'] ?? null,
        'initial_balance' => (float) ($body['initialBalance'] ?? 0),
        'credit_limit' => isset($body['creditLimit']) && $body['creditLimit'] !== ''
            ? (float) $body['creditLimit']
            : null,
        'status' => $status,
        'is_active' => $status === 'active' ? 1 : 0,
        'sort_order' => (int) ($body['sortOrder'] ?? 0),
    ];
}

function normalizeCategoryInput(array $body): array
{
    return [
        'name' => (string) ($body['name'] ?? ''),
        'type' => in_array($body['type'] ?? 'expense', ['expense', 'income', 'system'], true)
            ? $body['type']
            : 'expense',
        'color' => $body['color'] ?? null,
        'icon' => $body['icon'] ?? null,
        'monthly_limit' => isset($body['monthlyLimit']) && $body['monthlyLimit'] !== ''
            ? (float) $body['monthlyLimit']
            : null,
        'is_active' => array_key_exists('isActive', $body) ? ($body['isActive'] ? 1 : 0) : 1,
        'sort_order' => (int) ($body['sortOrder'] ?? 0),
    ];
}

function loadAllPayload(PDO $pdo, string $userId): array
{
    $settingsStmt = $pdo->prepare('SELECT * FROM app_settings WHERE user_id = :uid');
    $settingsStmt->execute(['uid' => $userId]);
    $settingsRow = $settingsStmt->fetch();

    $monthsStmt = $pdo->prepare('SELECT * FROM budget_months WHERE user_id = :uid ORDER BY sort_order');
    $monthsStmt->execute(['uid' => $userId]);
    $months = $monthsStmt->fetchAll();

    $txStmt = $pdo->prepare(
        'SELECT t.* FROM transactions t
         INNER JOIN budget_months m ON m.id = t.month_id
         WHERE m.user_id = :uid ORDER BY t.month_id, t.sort_order',
    );
    $txStmt->execute(['uid' => $userId]);

    $catTotalsStmt = $pdo->prepare(
        'SELECT mct.* FROM month_category_totals mct
         INNER JOIN budget_months m ON m.id = mct.month_id
         WHERE m.user_id = :uid ORDER BY mct.month_id, mct.category',
    );
    $catTotalsStmt->execute(['uid' => $userId]);

    $accStmt = $pdo->prepare('SELECT * FROM accounts WHERE user_id = :uid ORDER BY sort_order, name');
    $accStmt->execute(['uid' => $userId]);

    $categoriesStmt = $pdo->prepare('SELECT * FROM categories WHERE user_id = :uid ORDER BY sort_order, name');
    $categoriesStmt->execute(['uid' => $userId]);

    return [
        'months' => array_map('rowToMonth', $months),
        'transactions' => array_map('rowToTransaction', $txStmt->fetchAll()),
        'categoryTotals' => array_map('rowToCategoryTotal', $catTotalsStmt->fetchAll()),
        'accounts' => array_map('rowToAccount', $accStmt->fetchAll()),
        'categories' => array_map('rowToCategory', $categoriesStmt->fetchAll()),
        'settings' => rowToSettings($settingsRow ?: []),
    ];
}
