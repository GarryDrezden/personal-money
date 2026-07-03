<?php

require_once __DIR__ . '/bootstrap.php';

$db = new Database();
$pdo = $db->getPdo();

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = preg_replace('#^/api#', '', $uri);
$uri = rtrim($uri, '/') ?: '/';

// --- Auth routes (public) ---
if ($uri === '/auth/register' && $method === 'POST') {
    $body = getJsonBody();
    $user = createUser($pdo, $db, (string) ($body['username'] ?? ''), (string) ($body['password'] ?? ''));
    loginUser($pdo, (string) ($body['username'] ?? ''), (string) ($body['password'] ?? ''));
    jsonResponse($user, 201);
}

if ($uri === '/auth/login' && $method === 'POST') {
    $body = getJsonBody();
    jsonResponse(loginUser($pdo, (string) ($body['username'] ?? ''), (string) ($body['password'] ?? '')));
}

if ($uri === '/auth/logout' && $method === 'POST') {
    requireAuth();
    logoutUser();
    jsonResponse(['ok' => true]);
}

if ($uri === '/auth/me' && $method === 'GET') {
    $userId = currentUserId();
    if (!$userId) {
        jsonError('Unauthorized', 401);
    }
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE id = :id');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();
    if (!$user) {
        jsonError('Unauthorized', 401);
    }
    jsonResponse(['id' => $user['id'], 'username' => $user['username']]);
}

if (authRequiresLogin($uri, $method)) {
    $userId = requireAuth();
} else {
    $userId = currentUserId() ?? '';
}

// GET / — all data
if ($uri === '/' && $method === 'GET') {
    jsonResponse(loadAllPayload($pdo, $userId));
}

// GET /accounts
if ($uri === '/accounts' && $method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM accounts WHERE user_id = :uid ORDER BY sort_order, name');
    $stmt->execute(['uid' => $userId]);
    jsonResponse(array_map('rowToAccount', $stmt->fetchAll()));
}

// POST /accounts
if ($uri === '/accounts' && $method === 'POST') {
    $body = getJsonBody();
    $a = normalizeAccountInput($body);
    if ($a['name'] === '') {
        jsonError('name required');
    }
    $id = $body['id'] ?? $db->uuid();
    $pdo->prepare(
        'INSERT INTO accounts (id, user_id, name, type, color, icon, initial_balance, credit_limit, status, is_active, sort_order)
         VALUES (:id, :uid, :name, :type, :color, :icon, :ib, :cl, :st, :ia, :so)',
    )->execute([
        'id' => $id,
        'uid' => $userId,
        'name' => $a['name'],
        'type' => $a['type'],
        'color' => $a['color'],
        'icon' => $a['icon'],
        'ib' => $a['initial_balance'],
        'cl' => $a['credit_limit'],
        'st' => $a['status'],
        'ia' => $a['is_active'],
        'so' => $a['sort_order'],
    ]);
    $stmt = $pdo->prepare('SELECT * FROM accounts WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $id, 'uid' => $userId]);
    jsonResponse(rowToAccount($stmt->fetch()), 201);
}

// PUT /accounts/{id}
if (preg_match('#^/accounts/([^/]+)$#', $uri, $m) && $method === 'PUT') {
    if (!accountBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Account not found', 404);
    }
    $a = normalizeAccountInput(getJsonBody());
    $pdo->prepare(
        'UPDATE accounts SET name=:name, type=:type, color=:color, icon=:icon,
         initial_balance=:ib, credit_limit=:cl, status=:st, is_active=:ia, sort_order=:so,
         updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:uid',
    )->execute([
        'id' => $m[1],
        'uid' => $userId,
        'name' => $a['name'],
        'type' => $a['type'],
        'color' => $a['color'],
        'icon' => $a['icon'],
        'ib' => $a['initial_balance'],
        'cl' => $a['credit_limit'],
        'st' => $a['status'],
        'ia' => $a['is_active'],
        'so' => $a['sort_order'],
    ]);
    $stmt = $pdo->prepare('SELECT * FROM accounts WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $m[1], 'uid' => $userId]);
    jsonResponse(rowToAccount($stmt->fetch()));
}

// DELETE /accounts/{id}
if (preg_match('#^/accounts/([^/]+)$#', $uri, $m) && $method === 'DELETE') {
    if (!accountBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Account not found', 404);
    }
    $pdo->prepare(
        'UPDATE accounts SET status = \'closed\', is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id = :uid',
    )->execute(['id' => $m[1], 'uid' => $userId]);
    jsonResponse(['ok' => true]);
}

// GET /categories
if ($uri === '/categories' && $method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE user_id = :uid ORDER BY sort_order, name');
    $stmt->execute(['uid' => $userId]);
    jsonResponse(array_map('rowToCategory', $stmt->fetchAll()));
}

// POST /categories
if ($uri === '/categories' && $method === 'POST') {
    $body = getJsonBody();
    $c = normalizeCategoryInput($body);
    if ($c['name'] === '') {
        jsonError('name required');
    }
    $id = $body['id'] ?? $db->uuid();
    $pdo->prepare(
        'INSERT INTO categories (id, user_id, name, type, color, icon, monthly_limit, is_active, sort_order)
         VALUES (:id, :uid, :name, :type, :color, :icon, :ml, :ia, :so)',
    )->execute([
        'id' => $id,
        'uid' => $userId,
        'name' => $c['name'],
        'type' => $c['type'],
        'color' => $c['color'],
        'icon' => $c['icon'],
        'ml' => $c['monthly_limit'],
        'ia' => $c['is_active'],
        'so' => $c['sort_order'],
    ]);
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $id, 'uid' => $userId]);
    jsonResponse(rowToCategory($stmt->fetch()), 201);
}

// PUT /categories/{id}
if (preg_match('#^/categories/([^/]+)$#', $uri, $m) && $method === 'PUT') {
    if (!categoryBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Category not found', 404);
    }
    $c = normalizeCategoryInput(getJsonBody());
    $pdo->prepare(
        'UPDATE categories SET name=:name, type=:type, color=:color, icon=:icon,
         monthly_limit=:ml, is_active=:ia, sort_order=:so, updated_at=CURRENT_TIMESTAMP
         WHERE id=:id AND user_id=:uid',
    )->execute([
        'id' => $m[1],
        'uid' => $userId,
        'name' => $c['name'],
        'type' => $c['type'],
        'color' => $c['color'],
        'icon' => $c['icon'],
        'ml' => $c['monthly_limit'],
        'ia' => $c['is_active'],
        'so' => $c['sort_order'],
    ]);
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $m[1], 'uid' => $userId]);
    jsonResponse(rowToCategory($stmt->fetch()));
}

// DELETE /categories/{id}
if (preg_match('#^/categories/([^/]+)$#', $uri, $m) && $method === 'DELETE') {
    if (!categoryBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Category not found', 404);
    }
    $pdo->prepare('UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id = :uid')
        ->execute(['id' => $m[1], 'uid' => $userId]);
    jsonResponse(['ok' => true]);
}

// GET /months
if ($uri === '/months' && $method === 'GET') {
    $year = $_GET['year'] ?? null;
    if ($year) {
        $stmt = $pdo->prepare(
            'SELECT * FROM budget_months WHERE user_id = :uid AND year_month LIKE :y ORDER BY sort_order',
        );
        $stmt->execute(['uid' => $userId, 'y' => $year . '-%']);
        jsonResponse(array_map('rowToMonth', $stmt->fetchAll()));
    }
    $stmt = $pdo->prepare('SELECT * FROM budget_months WHERE user_id = :uid ORDER BY sort_order');
    $stmt->execute(['uid' => $userId]);
    jsonResponse(array_map('rowToMonth', $stmt->fetchAll()));
}

// POST /months
if ($uri === '/months' && $method === 'POST') {
    $body = getJsonBody();
    $yearMonth = (string) ($body['yearMonth'] ?? '');
    jsonResponse(ensureBudgetMonth($pdo, $db, $userId, $yearMonth), 201);
}

// PUT /months/{id}/categories
if (preg_match('#^/months/([^/]+)/categories$#', $uri, $m) && $method === 'PUT') {
    if (!monthBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Month not found', 404);
    }
    $monthId = $m[1];
    $body = getJsonBody();
    $totals = $body['totals'] ?? [];
    $pdo->prepare('DELETE FROM month_category_totals WHERE month_id = :id')->execute(['id' => $monthId]);
    $insert = $pdo->prepare(
        'INSERT INTO month_category_totals (month_id, category, amount) VALUES (:mid, :cat, :amt)',
    );
    foreach ($totals as $item) {
        if (!isset($item['category'])) {
            continue;
        }
        $amount = isset($item['amount']) ? (float) $item['amount'] : 0;
        if (abs($amount) < 0.001) {
            continue;
        }
        $insert->execute(['mid' => $monthId, 'cat' => (string) $item['category'], 'amt' => $amount]);
    }
    $stmt = $pdo->prepare('SELECT * FROM month_category_totals WHERE month_id = :id ORDER BY category');
    $stmt->execute(['id' => $monthId]);
    jsonResponse(array_map('rowToCategoryTotal', $stmt->fetchAll()));
}

// PUT /months/{id}/balance
if (preg_match('#^/months/([^/]+)/balance$#', $uri, $m) && $method === 'PUT') {
    if (!monthBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Month not found', 404);
    }
    $body = getJsonBody();
    if (!isset($body['importedBalance'])) {
        jsonError('importedBalance required');
    }
    $pdo->prepare('UPDATE budget_months SET imported_balance = :b WHERE id = :id AND user_id = :uid')->execute([
        'b' => (float) $body['importedBalance'],
        'id' => $m[1],
        'uid' => $userId,
    ]);
    $stmt = $pdo->prepare('SELECT * FROM budget_months WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $m[1], 'uid' => $userId]);
    jsonResponse(rowToMonth($stmt->fetch()));
}

// POST /months/{id}/recalculate
if (preg_match('#^/months/([^/]+)/recalculate$#', $uri, $m) && $method === 'POST') {
    if (!monthBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Month not found', 404);
    }
    $stmt = $pdo->prepare('SELECT * FROM budget_months WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $m[1], 'uid' => $userId]);
    jsonResponse(['ok' => true, 'month' => rowToMonth($stmt->fetch())]);
}

// POST /transactions
if ($uri === '/transactions' && $method === 'POST') {
    $body = getJsonBody();
    $tx = normalizeTransactionInput($body);
    if (!transactionHasData($tx)) {
        jsonError('Transaction must have expense or income data');
    }
    $monthId = resolveTransactionMonthId($pdo, $db, $userId, (string) ($body['monthId'] ?? ''), $tx['tx_date']);
    $stmtMax = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM transactions WHERE month_id = :id');
    $stmtMax->execute(['id' => $monthId]);
    $maxSort = (int) $stmtMax->fetchColumn();
    $id = $db->uuid();
    $sql = 'INSERT INTO transactions (' . insertTransactionFields() . ') VALUES (' . insertTransactionPlaceholders() . ')';
    $pdo->prepare($sql)->execute(bindTransactionParams($tx, [
        'id' => $id,
        'mid' => $monthId,
        'so' => $maxSort + 1,
    ]));
    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = :id');
    $stmt->execute(['id' => $id]);
    jsonResponse(rowToTransaction($stmt->fetch()), 201);
}

// PUT /transactions/{id}
if (preg_match('#^/transactions/([^/]+)$#', $uri, $m) && $method === 'PUT') {
    if (!transactionBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Transaction not found', 404);
    }
    $body = getJsonBody();
    $stmtExisting = $pdo->prepare('SELECT * FROM transactions WHERE id = :id');
    $stmtExisting->execute(['id' => $m[1]]);
    $existing = $stmtExisting->fetch();
    $tx = normalizeTransactionInput($body);
    if (!transactionHasData($tx)) {
        jsonError('Transaction must have expense or income data');
    }
    $fallbackMonthId = (string) ($body['monthId'] ?? $existing['month_id']);
    $monthId = resolveTransactionMonthId($pdo, $db, $userId, $fallbackMonthId, $tx['tx_date']);
    $pdo->prepare('UPDATE transactions SET ' . updateTransactionSet() . ' WHERE id = :id')->execute(
        bindTransactionParams($tx, ['id' => $m[1], 'mid' => $monthId]),
    );
    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = :id');
    $stmt->execute(['id' => $m[1]]);
    jsonResponse(rowToTransaction($stmt->fetch()));
}

// DELETE /transactions/{id}
if (preg_match('#^/transactions/([^/]+)$#', $uri, $m) && $method === 'DELETE') {
    if (!transactionBelongsToUser($pdo, $m[1], $userId)) {
        jsonError('Transaction not found', 404);
    }
    $pdo->prepare('DELETE FROM transactions WHERE id = :id')->execute(['id' => $m[1]]);
    jsonResponse(['ok' => true]);
}

// POST /transactions/bulk-update
if ($uri === '/transactions/bulk-update' && $method === 'POST') {
    $body = getJsonBody();
    $ids = $body['ids'] ?? [];
    $patch = $body['patch'] ?? [];
    if (!is_array($ids) || count($ids) === 0) {
        jsonError('ids required');
    }
    foreach ($ids as $tid) {
        if (!transactionBelongsToUser($pdo, (string) $tid, $userId)) {
            jsonError('Transaction not found', 404);
        }
    }
    $map = [
        'accountId' => 'account_id',
        'targetAccountId' => 'target_account_id',
        'categoryId' => 'category_id',
        'operationKind' => 'operation_kind',
        'paymentStatus' => 'payment_status',
        'txDate' => 'tx_date',
        'expenseName' => 'expense_name',
        'expenseAmount' => 'expense_amount',
        'incomeSource' => 'income_source',
        'incomeAmount' => 'income_amount',
        'note' => 'note',
    ];
    $sets = [];
    $params = [];
    foreach ($map as $jsKey => $dbCol) {
        if (array_key_exists($jsKey, $patch)) {
            $sets[] = "{$dbCol} = :{$dbCol}";
            $params[$dbCol] = $patch[$jsKey];
        }
    }
    if (count($sets) === 0) {
        jsonError('patch required');
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $sql = 'UPDATE transactions SET ' . implode(', ', $sets) . " WHERE id IN ({$placeholders})";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge(array_values($params), $ids));
    jsonResponse(['ok' => true, 'updated' => $stmt->rowCount()]);
}

// POST /transactions/suggest-category
if ($uri === '/transactions/suggest-category' && $method === 'POST') {
    $body = getJsonBody();
    $title = (string) ($body['title'] ?? '');
    if ($title === '') {
        jsonError('title required');
    }
    jsonResponse(['categoryId' => suggestCategoryFromTitle($title)]);
}

// PUT /settings
if ($uri === '/settings' && $method === 'PUT') {
    jsonResponse($db->updateSettings($userId, getJsonBody()));
}

// GET /settings
if ($uri === '/settings' && $method === 'GET') {
    jsonResponse($db->getSettings($userId));
}

// POST /import/xlsx
if ($uri === '/import/xlsx' && $method === 'POST') {
    $force = !empty($_GET['force']) || !empty(getJsonBody()['force']);
    if (!empty($_FILES['file']['tmp_name'])) {
        $path = $_FILES['file']['tmp_name'];
    } else {
        $body = getJsonBody();
        $path = $body['path'] ?? '';
        if (!$path || !is_readable($path)) {
            jsonError('Upload file or provide readable path in JSON body');
        }
    }
    $savedTemp = null;
    if (!empty($_FILES['file']['tmp_name'])) {
        $savedTemp = sys_get_temp_dir() . '/budget-import-' . uniqid('', true) . '.xlsx';
        if (!move_uploaded_file($_FILES['file']['tmp_name'], $savedTemp)) {
            jsonError('Failed to save upload', 500);
        }
        $path = $savedTemp;
    }
    $settings = $db->getSettings($userId);
    if ($settings['importCompletedAt'] && !$force) {
        jsonError('Import already completed. Use ?force=1 to re-import.', 409);
    }
    $pythonScript = dirname(__DIR__) . '/scripts/import-budget.py';
    $cmd = 'python ' . escapeshellarg($pythonScript) . ' ' . escapeshellarg($path);
    if ($force || $settings['importCompletedAt']) {
        $cmd .= ' --force';
    }
    $output = [];
    $code = 0;
    exec($cmd, $output, $code);
    if ($savedTemp && is_file($savedTemp)) {
        unlink($savedTemp);
    }
    if ($code !== 0) {
        jsonError(implode("\n", $output) ?: 'Import failed', 500);
    }
    $result = json_decode(implode("\n", $output), true);
    jsonResponse(['ok' => true, ...(is_array($result) ? $result : [])]);
}

// POST /import/reset
if ($uri === '/import/reset' && $method === 'POST') {
    $db->wipeBudgetData($userId);
    jsonResponse(['ok' => true]);
}

// GET /backup (SQLite only)
if ($uri === '/backup' && $method === 'GET') {
    if ($db->isMysql()) {
        jsonError('Backup available only for SQLite', 400);
    }
    $path = $db->getDbPath();
    if (!is_readable($path)) {
        jsonError('Database not found', 404);
    }
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="personal-budget-' . date('Y-m-d') . '.sqlite"');
    readfile($path);
    exit;
}

jsonError('Not found', 404);
