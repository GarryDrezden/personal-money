# 11. План тестирования расчётов

Цель: зафиксировать **бизнес-логику денег** в автотестах. UI и API — позже.

Инструмент: **Vitest** (быстрый, native ESM, совместим с Vite).

```bash
npm run test        # watch
npm run test:run    # CI one-shot
```

Файлы:
- `src/utils/transactionRules.test.ts`
- `src/utils/budget.test.ts`
- `src/test/fixtures.ts` — фабрики tx/month/account

---

## Почему именно эти два модуля

| Модуль | Риск при поломке |
|--------|------------------|
| `transactionRules.ts` | Неверные расходы/доходы в аналитике, двойной учёт переводов |
| `buildMonthSummaries()` | Неверная дельта месяца, накопления, mismatch |

Один баг здесь = «цифры не сходятся» — хуже всего для finance app.

---

## transactionRules — 10 кейсов

### 1. `isIgnored`
- **Given:** tx с `paymentStatus: 'ignored'`, expense 1000
- **Expect:** `isCountedAsExpense` = false, `accountDelta` = 0

### 2. `isInternalTransfer` — kind transfer
- **Given:** `operationKind: 'transfer'`, expense 5000, targetAccountId set
- **Expect:** не расход, не доход

### 3. `isInternalTransfer` — target + expense без kind
- **Given:** regular + targetAccountId + expenseAmount
- **Expect:** internal transfer (legacy Excel-паттерн)

### 4. `isCountedAsExpense` — обычный расход
- **Given:** regular, expense 500, done
- **Expect:** true

### 5. `isCountedAsExpense` — correction
- **Given:** correction + expense
- **Expect:** false (не попадает в категории расходов)

### 6. `isCountedAsIncome` — перевод
- **Given:** transfer с income на target
- **Expect:** false для income analytics

### 7. `isCreditCardPayment`
- **Given:** transfer на credit account, amount 10000
- **Expect:** true; не counted as expense

### 8. `isCreditCardSpending`
- **Given:** regular expense на credit account
- **Expect:** true; counted as expense globally, но account logic отдельно

### 9. `accountDelta` — расход с дебета
- **Given:** account_id=main, expense 1000
- **Expect:** delta = -1000 для main

### 10. `accountDelta` — перевод
- **Given:** transfer main → shared, 5000
- **Expect:** main -5000, shared +5000

---

## buildMonthSummaries — 8 кейсов

### 11. Один месяц — базовая арифметика
- **Given:** 1 month, income 100k, expense 60k, initialOpeningBalance 0
- **Expect:** delta=+40k, expenses=60k, income=100k

### 12. Два месяца — running balance
- **Given:** month1 delta +10k, month2 delta -3k, initial 2007
- **Expect:** month1 computedBalance=12007, month2=9007 (без accounts)

### 13. `openingBalance` на месяце
- **Given:** month.openingBalance = 50000, delta +5000
- **Expect:** computedBalance = 55000 (override running)

### 14. `importedBalance` переносит running
- **Given:** month1 importedBalance=100000 после delta
- **Expect:** month2 стартует от 100000 + delta2

### 15. Ignored не в расходах
- **Given:** expense 5000 ignored + expense 1000 done
- **Expect:** expenses = 1000

### 16. Transfer не в расходах месяца
- **Given:** transfer 20000 + expense 5000
- **Expect:** expenses = 5000 only

### 17. `belongsToMonth` по tx_date
- **Given:** month_id=jan, tx_date=2025-02-15
- **Expect:** tx попадает в february summary, не january

### 18. `balanceMismatch`
- **Given:** importedBalance=100000, computed from accounts differs >1
- **Expect:** balanceMismatch=true

---

## Что тестировать потом (v2)

| Приоритет | Модуль | Кейсы |
|-----------|--------|-------|
| P1 | `getAllAccountsSummary` | credit debt, transfers, corrections |
| P1 | `getCategoryMonthSummary` | limits, limitStatus |
| P2 | `creditDebtAmount` / reconcile | available vs debt |
| P2 | `analyticsInsights.ts` | MoM %, forecast |
| P3 | `categorize.ts` | keyword → categoryId |
| P3 | API integration | auth + CRUD smoke |

---

## CI (будущее)

Добавить в `.github/workflows/deploy.yml` перед build:

```yaml
- run: npm run test:run
```

---

## Как читать падение теста

1. Имя теста = бизнес-правило
2. Fixture в `src/test/fixtures.ts` — минимальные tx без UI
3. При рефакторинге `budget.ts` — **сначала тесты**, потом код

Если тест мешает «улучшению» — скорее всего улучшение ломает деньги пользователя.
