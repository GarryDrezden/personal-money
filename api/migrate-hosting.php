<?php

/**
 * Миграция SQLite → MySQL на хостинге (через браузер).
 *
 * 1. В api/config.php: DB_DRIVER=mysql + MIGRATE_SECRET=ваш-секрет
 * 2. Загрузите personal-budget.sqlite в data/ через FTP ИЛИ формой ниже
 * 3. Откройте: /api/migrate-hosting.php?key=ваш-секрет
 * 4. После успеха удалите этот файл и data/*.sqlite
 */

declare(strict_types=1);

ob_start();

$configPath = __DIR__ . '/config.php';
if (!is_readable($configPath)) {
    ob_end_clean();
    http_response_code(500);
    exit('Create api/config.php first (see config.example.php)');
}

$config = require $configPath;
ob_end_clean();

if (!is_array($config)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    exit(
        "config.php must RETURN an array, not print it.\n\n"
        . "Correct format:\n"
        . "<?php\n"
        . "return [\n"
        . "  'DB_DRIVER' => 'mysql',\n"
        . "  ...\n"
        . "  'MIGRATE_SECRET' => 'MySecret2026',\n"
        . "];\n"
    );
}

$secret = (string) ($config['MIGRATE_SECRET'] ?? '');
$key = (string) ($_GET['key'] ?? $_POST['key'] ?? '');

if ($secret === '') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Add MIGRATE_SECRET to api/config.php (same value as ?key= in URL).');
}

if (!hash_equals($secret, $key)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Wrong key. URL must be: migrate-hosting.php?key=YOUR_MIGRATE_SECRET');
}

if (($config['DB_DRIVER'] ?? '') !== 'mysql') {
    http_response_code(500);
    exit('config.php must have DB_DRIVER=mysql');
}

if (!extension_loaded('pdo_sqlite')) {
    http_response_code(500);
    exit('PDO SQLite extension is required on hosting for one-time migration.');
}

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/MigrateFromSqlite.php';

$dataDir = dirname(__DIR__) . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}
$sqlitePath = $dataDir . '/personal-budget.sqlite';

$log = [];
$dryRun = isset($_GET['dry']) || isset($_POST['dry']);
$force = isset($_GET['force']) || isset($_POST['force']);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_FILES['sqlite']['tmp_name'])) {
    if (!is_uploaded_file($_FILES['sqlite']['tmp_name'])) {
        $log[] = 'Upload failed.';
    } elseif (!move_uploaded_file($_FILES['sqlite']['tmp_name'], $sqlitePath)) {
        $log[] = 'Could not save uploaded file to data/personal-budget.sqlite';
    } else {
        $log[] = 'File uploaded: data/personal-budget.sqlite (' . filesize($sqlitePath) . ' bytes)';
    }
}

$ran = isset($_GET['run']) || isset($_POST['run']);

if ($ran && is_readable($sqlitePath)) {
    try {
        $sqlite = new PDO('sqlite:' . $sqlitePath);
        $sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $sqlite->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $db = new Database();
        $mysql = $db->getPdo();

        $result = MigrateFromSqlite::run($sqlite, $mysql, $db, $dryRun, $force);
        $log = array_merge($log, $result['lines']);
        if (!$result['ok']) {
            $log[] = 'ERROR: ' . ($result['error'] ?? 'unknown');
        } elseif (!$dryRun && ($result['ok'] ?? false)) {
            $log[] = '';
            $log[] = 'IMPORTANT: Delete api/migrate-hosting.php and data/personal-budget.sqlite from server.';
        }
    } catch (Throwable $e) {
        $log[] = 'ERROR: ' . $e->getMessage();
    }
} elseif ($ran) {
    $log[] = 'SQLite file not found. Upload via form or FTP to data/personal-budget.sqlite';
}

$hasFile = is_readable($sqlitePath);
$fileSize = $hasFile ? filesize($sqlitePath) : 0;

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Миграция на хостинге</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    pre { background: #f1f5f9; padding: 1rem; overflow: auto; border-radius: 8px; font-size: 13px; }
    .btn { display: inline-block; margin: 0.25rem 0.25rem 0.25rem 0; padding: 0.5rem 1rem; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; }
    .btn.secondary { background: #64748b; }
    .warn { background: #fff7ed; border: 1px solid #fdba74; padding: 0.75rem; border-radius: 8px; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>Миграция SQLite → MySQL</h1>
  <p>На хостинге. Локальный проект не нужен.</p>

  <div class="warn">
    После успешной миграции <strong>удалите</strong> <code>api/migrate-hosting.php</code> и <code>data/personal-budget.sqlite</code>.
  </div>

  <h2>1. Файл базы</h2>
  <?php if ($hasFile): ?>
    <p>Найден: <code>data/personal-budget.sqlite</code> (<?= number_format($fileSize) ?> байт)</p>
  <?php else: ?>
    <p>Файл не найден. Загрузите через FTP в <code>data/personal-budget.sqlite</code> или формой:</p>
    <form method="post" enctype="multipart/form-data">
      <input type="hidden" name="key" value="<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>">
      <input type="file" name="sqlite" accept=".sqlite,.db" required>
      <button class="btn secondary" type="submit">Загрузить</button>
    </form>
  <?php endif; ?>

  <h2>2. Запуск</h2>
  <form method="post" style="margin-bottom:1rem">
    <input type="hidden" name="key" value="<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>">
    <input type="hidden" name="run" value="1">
    <button class="btn secondary" type="submit" name="dry" value="1">Проверка (dry-run)</button>
    <button class="btn" type="submit">Мигрировать в MySQL</button>
    <button class="btn secondary" type="submit" name="force" value="1" onclick="return confirm('Перезаписать данные GarryDrezden?')">Мигрировать с force</button>
  </form>

  <?php if ($log): ?>
    <h2>Лог</h2>
    <pre><?= htmlspecialchars(implode("\n", $log), ENT_QUOTES, 'UTF-8') ?></pre>
  <?php endif; ?>
</body>
</html>
