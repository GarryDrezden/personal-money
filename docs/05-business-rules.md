# 05. Бизнес-правила и расчёты

## Классификация операций

Источник: `src/utils/transactionRules.ts`

### payment_status

| Значение | Эффект |
|----------|--------|
| `done` | Учитывается везде |
| `planned` | Учитывается (UI для planned минимален) |
| `ignored` | **Исключается** из всех расчётов |

### operation_kind

| kind | Расход в аналитике | Доход в аналитике | Влияние на счёт |
|------|-------------------|-------------------|-----------------|
| `regular` | expense_amount | income_amount | +/- по account_id |
| `transfer` | нет | нет | - с source, + на target |
| `credit_card_payment` | нет | нет | - с debit, + на credit |
| `debt_payment` | expense_amount | нет | - с account |
| `correction` | нет | нет | ручная дельта на account |

### isInternalTransfer

Перевод **не считается** расходом/доходом в аналитике и категориях:
- `operationKind` = transfer | credit_card_payment
- или `categoryId` = transfer | credit_card_payment
- или есть `targetAccountId` + expense_amount

---

## Кредитная карта

### Модель

- Счёт `type: credit` с `credit_limit`
- `initial_balance` для credit = лимит (available at start)
- **Долг** = limit - available (closingAvailable)

### Типы операций на кредитке

| Тип | Функция | Эффект на долг |
|-----|---------|----------------|
| Покупка (regular expense) | `isCreditCardSpending` | ↑ долг |
| Пополнение (transfer/payment на credit) | `isCreditCardPayment` | ↓ долг |
| Возврат (regular income) | `isCreditCardDebtReduction` | ↓ долг |

### Сверка (CreditReconcileModal)

Пользователь вводит «доступно по банку» → создаётся `correction` на разницу.

---

## Сводка месяца (MonthSummary)

`buildMonthSummaries()` в `budget.ts`:

```
expenses = sum(expense_amount) where isCountedAsExpense
income   = sum(income_amount) where isCountedAsIncome
delta    = income - expenses
computedBalance = rolling from initialOpeningBalance + cumulative deltas
balanceMismatch = |importedBalance - computedBalance| > threshold
rpgStatus = victory (delta≥0) | danger (delta<0) | neutral
```

**current month:** `useCurrentMonthSummary()` берёт `YYYY-MM` календаря или последний месяц в данных.

---

## Баланс счетов (AccountMonthSummary)

Для каждого account за monthId:

```
openingBalance = initial_balance + sum(deltas prior months)
closingBalance = opening + income - expenses + transfersIn - transfersOut + corrections
```

Для credit дополнительно:
```
closingAvailable = credit_limit - debt
debt = f(transactions on credit account)
```

`getTotalAccountsBalance()` — сумма closingBalance **только debit** счетов.

---

## Категории и лимиты

### CategoryMonthSummary

```
amount = sum expenses in category for month
percentOfExpenses = amount / totalExpenses * 100
limitStatus:
  - danger: amount > monthlyLimit
  - warning: amount > 80% of limit (mid-month heuristic)
  - ok: otherwise
remaining = monthlyLimit - amount
```

### Автокатегоризация

`categorize.ts` + `api/rules/categorize.json`:
- Keyword matching по `expense_name` / `income_source`
- API: `POST /transactions/suggest-category`
- QuickTransactionForm показывает подсказку live

---

## AttentionBlock — правила алертов

| Условие | Сообщение |
|---------|-----------|
| `getUncategorizedTransactions().length > 0` | «N без категории → разобрать» |
| `getTransactionsWithoutAccount().length > 0` | «N без счёта → назначить» |
| credit debt > max(50000, 30% limit) | «{name}: долг X ₽» |

**Не проверяется (gap):** превышение monthly_limit категорий — только в AnalyticsInsights.

---

## Analytics Insights

`buildAnalyticsInsights()` генерирует:

1. **Period comparisons** — MoM и YoY для расходов/доходов/дельты
2. **Month forecast** — projected expenses = dailyAverage × daysInMonth
3. **Category limit breaches** — превышение и «опережение темпа»
4. **Anomalies** — резкий скачок расходов vs среднее
5. **Negative delta warning** — расходы > доходов
6. **Success** — если всё спокойно

Severity: info | warning | danger | success

---

## Фильтрация журнала

`filterTransactions()` поддерживает:
- accountId, categoryId, incomeCategoryId
- operationType, search (substring)
- largeOnly (>|threshold|)
- noCategory, noAccount, incomeOnly

---

## Undo delete

`removeTransaction`:
1. DELETE API
2. Toast «Операция удалена» + action «Отменить» (8 sec)
3. onAction → POST recreate with same payload (new id)

---

## Month accordion behavior

- Только **один** месяц развёрнут одновременно
- Состояние в localStorage `personal-budget-collapsed`
- Guard: если >1 expanded в storage → reset

---

## Excel import semantics

- Сохраняет текстовое поле `category` + `category_id` где возможно
- `month_category_totals` — legacy сверка с Excel
- `imported_balance` — баланс накоплений из файла
- `importCompletedAt` блокирует онбординг

---

## Форматирование денег

```typescript
formatMoney(n) → "54 598 ₽"  // ru-RU, 0 decimals
formatDelta(n) → "+1 234 ₽" / "−567 ₽"
parseMoneyInput(s) → number // handles comma/dot
```

---

## Edge cases

| Ситуация | Поведение |
|----------|-----------|
| tx_date в другом месяце чем month_id | `belongsToMonth` использует tx_date |
| Операция без суммы | API reject на create/update |
| Закрытый счёт | is_active=0, операции сохраняются |
| Нет текущего месяца в DB | auto POST /months при init |
| Import на prod без Python | exec() fail → 500 |
