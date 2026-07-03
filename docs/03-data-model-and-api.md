# 03. Модель данных и API

## База данных (MySQL)

Схема: `api/schema-mysql.sql`. Кодировка: **utf8mb4_unicode_ci**.

### Таблицы

#### `users`

| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | UUID |
| username | VARCHAR(64) UNIQUE | Логин |
| password_hash | VARCHAR(255) | `password_hash()` PHP |
| created_at | DATETIME | |

#### `budget_months`

| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | UUID месяца |
| user_id | FK → users | |
| year_month | CHAR(7) | `YYYY-MM`, UNIQUE per user |
| sort_order | INT | Порядок в журнале |
| opening_balance | DECIMAL(14,2) NULL | Входящий баланс накоплений |
| imported_balance | DECIMAL(14,2) NULL | «Официальный» баланс из Excel/ручной |
| collapsed | TINYINT(1) | Состояние аккордеона (legacy DB field; UI uses localStorage) |

#### `accounts`

| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | Стабильный ID (seed: `main_card`, `credit_card`) |
| user_id | FK | |
| name | VARCHAR(255) | «Основная карта» |
| type | VARCHAR(16) | `debit` \| `credit` |
| color, icon | VARCHAR | Визуал |
| initial_balance | DECIMAL(14,2) | На старт учёта |
| credit_limit | DECIMAL NULL | Только для credit |
| status | VARCHAR(16) | `active` \| `closed` \| `hidden` |
| is_active | TINYINT(1) | Soft visibility |
| sort_order | INT | |

**Seed-счета** (`api/seed-accounts.json`):
- `main_card` — Основная карта (debit)
- `credit_payments_card` — На кредиты (debit)
- `shared_card` — Общая карта (debit)
- `credit_card` — Кредитка (credit, limit 380000)

#### `categories`

| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | Стабильный ID (`food`, `salary`, …) |
| user_id | FK | |
| name | VARCHAR(255) | |
| type | VARCHAR(16) | `expense` \| `income` \| `system` |
| color, icon | VARCHAR | |
| monthly_limit | DECIMAL NULL | Лимит расходов в месяц |
| is_active | TINYINT(1) | |
| sort_order | INT | |

**System-категории:** `transfer`, `correction`, `credit_card_payment` — не показываются в обычных списках.

#### `transactions`

| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | |
| month_id | FK → budget_months | Привязка к месяцу |
| sort_order | INT | Порядок внутри месяца |
| tx_date | DATE NULL | Дата операции |
| expense_name | VARCHAR(512) NULL | Название расхода |
| expense_amount | DECIMAL NULL | Сумма расхода |
| income_source | VARCHAR(512) NULL | Источник дохода |
| income_amount | DECIMAL NULL | Сумма дохода |
| category | VARCHAR(255) NULL | Legacy текстовая категория (из Excel) |
| account_id | CHAR(36) NULL | Счёт списания/зачисления |
| target_account_id | CHAR(36) NULL | Для переводов |
| category_id | CHAR(36) NULL | FK на categories |
| operation_kind | VARCHAR(32) | См. ниже |
| payment_status | VARCHAR(16) | `done` \| `planned` \| `ignored` |
| note | TEXT | Комментарий |

**operation_kind:**
- `regular` — обычный расход/доход
- `transfer` — перевод между счетами
- `debt_payment` — платёж по кредиту (не кредитка)
- `credit_card_payment` — пополнение кредитки
- `correction` — ручная сверка баланса

#### `month_category_totals`

Legacy из Excel: агрегаты по текстовым категориям за месяц. Используется для сверки с импортом.

#### `app_settings`

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | PK FK | |
| currency | VARCHAR(8) | `RUB` |
| import_completed_at | DATETIME NULL | Флаг завершённого импорта |
| initial_opening_balance | DECIMAL | База для расчёта накоплений (default 2007) |
| theme_id | VARCHAR(32) | `cozy` \| `darkFantasy` |

---

## REST API

Base URL: `/api`. Формат: JSON. Auth: session cookie (`credentials: 'include'`).

### Публичные endpoints

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | Диагностика PHP/PDO/config |
| POST | `/auth/register` | `{ username, password }` → user + auto-login |
| POST | `/auth/login` | `{ username, password }` |
| GET | `/auth/me` | Текущий пользователь или 401 |

### Защищённые endpoints

| Method | Path | Описание |
|--------|------|----------|
| POST | `/auth/logout` | Завершить сессию |
| GET | `/` | **Полный payload** всех данных пользователя |
| GET/POST | `/accounts` | Список / создание |
| PUT/DELETE | `/accounts/{id}` | Обновление / soft-close |
| GET/POST | `/categories` | Список / создание |
| PUT/DELETE | `/categories/{id}` | Обновление / deactivate |
| GET/POST | `/months` | Список / ensure month `{ yearMonth }` |
| PUT | `/months/{id}/categories` | `{ totals: [{ category, amount }] }` |
| PUT | `/months/{id}/balance` | `{ importedBalance }` |
| POST | `/months/{id}/recalculate` | Stub (возвращает month) |
| POST | `/transactions` | Создание |
| PUT | `/transactions/{id}` | Обновление |
| DELETE | `/transactions/{id}` | Удаление |
| POST | `/transactions/bulk-update` | `{ ids, patch }` |
| POST | `/transactions/suggest-category` | `{ title }` → `{ categoryId }` |
| GET/PUT | `/settings` | Настройки приложения |
| POST | `/import/xlsx` | Upload Excel (multipart или path) |
| POST | `/import/reset` | Wipe all budget data for user |
| GET | `/backup` | SQLite file download (**только SQLite driver**) |

### Ответ `GET /api/`

```typescript
interface BudgetData {
  months: BudgetMonth[];
  transactions: Transaction[];
  categoryTotals: MonthCategoryTotal[];
  accounts: Account[];
  categories: Category[];
  settings: AppSettings;
}
```

### Ошибки

```json
{ "error": "Human-readable message" }
```

HTTP коды: 400 (validation), 401 (auth), 404, 409 (import already done), 500.

---

## Регистрация пользователя

При `POST /auth/register`:
1. Создаётся user + password hash
2. `seedUserDefaults()` — вставка accounts и categories из JSON
3. Создаётся запись `app_settings`
4. Автоматический login

---

## Импорт Excel

1. `POST /api/import/xlsx` с файлом
2. PHP вызывает `python scripts/import-budget.py <path> [--force]`
3. Скрипт пишет напрямую в БД (SQLite или через API — зависит от окружения)
4. Устанавливает `import_completed_at`
5. Повторный импорт: `force=1` или reset + import

---

## Миграция SQLite → MySQL

Одноразовый инструмент: `api/migrate-hosting.php?key=MIGRATE_SECRET`

- Читает локальный `data/personal-budget.sqlite`
- Переносит все строки в MySQL для указанного пользователя
- **Удалить** после миграции

---

## Конфигурация сервера

`api/config.php` (не в git на проде):

```php
return [
  'DB_DRIVER' => 'mysql',
  'DB_HOST' => 'localhost',
  'DB_NAME' => '...',
  'DB_USER' => '...',
  'DB_PASSWORD' => '...',
  'DB_CHARSET' => 'utf8mb4',
  'APP_URL' => 'http://where-is-the-money.ru',
  'APP_HTTPS' => false,
  'MIGRATE_SECRET' => '...',
];
```

Локально без config.php — fallback на SQLite в `data/personal-budget.sqlite`.
