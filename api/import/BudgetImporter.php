<?php

require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/SimpleXlsxReader.php';

class BudgetImporter
{
    public const CATEGORIES = [
        'Основная карта',
        'На кредиты',
        'Общая карта',
        'Еда',
        'Ежемесячные',
        'Стануша',
        'Кредиты',
        'Остальное',
        'Кредитка',
        'Алкоголь',
    ];

    private Database $db;
    private PDO $pdo;
    private SimpleXlsxReader $reader;

    public function __construct(Database $db)
    {
        $this->db = $db;
        $this->pdo = $db->getPdo();
        $this->reader = new SimpleXlsxReader();
    }

    public function import(string $filePath, bool $force = false): array
    {
        if (!is_readable($filePath)) {
            throw new InvalidArgumentException('Файл не найден или недоступен: ' . $filePath);
        }

        $settings = $this->db->getSettings();
        if ($settings['importCompletedAt'] && !$force) {
            throw new RuntimeException(
                'Импорт уже выполнен. Используйте force=true для повторного импорта.',
                409,
            );
        }

        $rows = $this->reader->readSheet($filePath);
        $monthBlocks = $this->findMonthBlocks($rows);

        $this->pdo->beginTransaction();
        try {
            $this->db->wipeBudgetData();

            $sortOrder = 0;
            $transactionCount = 0;
            $initialOpening = (float) $settings['initialOpeningBalance'];

            foreach ($monthBlocks as $block) {
                $sortOrder++;
                $monthId = $this->db->uuid();
                $openingBalance = $sortOrder === 1 ? $initialOpening : null;

                $this->pdo->prepare(
                    'INSERT INTO budget_months (id, year_month, sort_order, opening_balance, imported_balance, collapsed)
                     VALUES (:id, :ym, :so, :ob, :ib, 1)',
                )->execute([
                    'id' => $monthId,
                    'ym' => $block['yearMonth'],
                    'so' => $sortOrder,
                    'ob' => $openingBalance,
                    'ib' => $block['importedBalance'],
                ]);

                foreach ($block['categories'] as $cat => $amount) {
                    if ($amount === null || abs($amount) < 0.001) {
                        continue;
                    }
                    $this->pdo->prepare(
                        'INSERT INTO month_category_totals (month_id, category, amount) VALUES (:mid, :cat, :amt)',
                    )->execute([
                        'mid' => $monthId,
                        'cat' => $cat,
                        'amt' => $amount,
                    ]);
                }

                $txOrder = 0;
                foreach ($block['rows'] as $row) {
                    if (!$this->rowHasData($row)) {
                        continue;
                    }
                    $txOrder++;
                    $this->pdo->prepare(
                        'INSERT INTO transactions
                         (id, month_id, sort_order, expense_name, expense_amount, income_source, income_amount, category, note)
                         VALUES (:id, :mid, :so, :en, :ea, :is, :ia, NULL, :note)',
                    )->execute([
                        'id' => $this->db->uuid(),
                        'mid' => $monthId,
                        'so' => $txOrder,
                        'en' => $row['expenseName'],
                        'ea' => $row['expenseAmount'],
                        'is' => $row['incomeSource'],
                        'ia' => $row['incomeAmount'],
                        'note' => '',
                    ]);
                    $transactionCount++;
                }
            }

            $this->db->markImportComplete($transactionCount);
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return [
            'months' => count($monthBlocks),
            'transactions' => $transactionCount,
        ];
    }

    /** @param list<list<mixed>> $rows */
    private function findMonthBlocks(array $rows): array
    {
        $blocks = [];
        $current = null;
        $maxRow = empty($rows) ? 0 : max(array_keys($rows));

        for ($r = 4; $r <= $maxRow; $r++) {
            $a = $this->reader->getCell($rows, $r, 1);

            if ($this->isDateCell($a)) {
                if ($current !== null) {
                    $blocks[] = $current;
                }
                $current = [
                    'yearMonth' => $this->formatYearMonth($a),
                    'importedBalance' => null,
                    'categories' => array_fill_keys(self::CATEGORIES, null),
                    'rows' => [],
                ];
                continue;
            }

            if ($current === null) {
                continue;
            }

            if (is_string($a) && str_starts_with($a, 'Итого')) {
                $current['importedBalance'] = $this->parseMoney($this->reader->getCell($rows, $r, 9));
                foreach (self::CATEGORIES as $i => $cat) {
                    $col = 10 + $i;
                    $current['categories'][$cat] = $this->parseMoney($this->reader->getCell($rows, $r, $col));
                }
                continue;
            }

            $current['rows'][] = [
                'expenseName' => $this->cellString($this->reader->getCell($rows, $r, 2)),
                'expenseAmount' => $this->parseMoney($this->reader->getCell($rows, $r, 3)),
                'incomeSource' => $this->cellString($this->reader->getCell($rows, $r, 7)),
                'incomeAmount' => $this->parseMoney($this->reader->getCell($rows, $r, 8)),
            ];
        }

        if ($current !== null) {
            $blocks[] = $current;
        }

        return $blocks;
    }

    private function isDateCell(mixed $value): bool
    {
        if ($value instanceof DateTimeInterface) {
            return true;
        }
        if (is_numeric($value)) {
            return true;
        }
        return false;
    }

    private function formatYearMonth(mixed $value): string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m');
        }
        if (is_numeric($value)) {
            $unix = ((float) $value - 25569) * 86400;
            return gmdate('Y-m', (int) $unix);
        }
        return (string) $value;
    }

    private function rowHasData(array $row): bool
    {
        return ($row['expenseAmount'] !== null && $row['expenseAmount'] != 0)
            || ($row['incomeAmount'] !== null && $row['incomeAmount'] != 0)
            || ($row['expenseName'] !== null && $row['expenseName'] !== '')
            || ($row['incomeSource'] !== null && $row['incomeSource'] !== '');
    }

    private function cellString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        return trim((string) $value);
    }

    private function parseMoney(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        $s = (string) $value;
        $s = str_replace(["\xc2\xa0", ' ', '₽', ','], ['', '', '', '.'], $s);
        if ($s === '' || !is_numeric($s)) {
            return null;
        }
        return (float) $s;
    }
}
