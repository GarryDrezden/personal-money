# 02. Техническая архитектура

## Стек технологий

### Frontend

| Технология | Версия | Роль |
|------------|--------|------|
| React | 19.x | UI-компоненты, SPA |
| TypeScript | 5.8 | Типизация |
| Vite | 6.x | Сборка, dev-server |
| React Router | 7.x | Маршрутизация |
| Zustand | 5.x | Глобальный state (бюджет + auth) |
| Tailwind CSS | 4.x | Стили (через `@tailwindcss/vite`) |
| Recharts | 2.x | Графики на странице аналитики |
| Lucide React | 0.511 | Иконки |
| date-fns | 4.x | Работа с датами (точечно) |

### Backend

| Технология | Роль |
|------------|------|
| PHP 8+ | REST API, сессии, импорт |
| PDO | SQLite (локально) / MySQL (прод) |
| Python 3 + openpyxl | Парсинг Excel при импорте |

### Инфраструктура

| Компонент | Описание |
|-----------|----------|
| GitHub Actions | `npm ci` → `npm run build` → FTP deploy |
| Shared hosting | nginx/Apache + PHP + MySQL |
| `.htaccess` | SPA fallback + маршрутизация `/api` |

## Структура репозитория

```
personal-budget/
├── .github/workflows/deploy.yml   # CI/CD
├── api/                           # PHP REST API
│   ├── index.php                  # Роутер всех endpoints
│   ├── auth.php                   # Сессии, регистрация, seed
│   ├── bootstrap.php              # JSON helpers, CORS
│   ├── Database.php               # PDO, CRUD helpers
│   ├── config.php                 # Секреты (НЕ в git на проде)
│   ├── config.example.php
│   ├── schema-mysql.sql           # DDL MySQL
│   ├── schema.sql                 # DDL SQLite (legacy)
│   ├── seed-accounts.json         # Дефолтные счета
│   ├── seed-categories.json       # Дефолтные категории
│   ├── rules/categorize.json      # Правила автокатегоризации
│   └── import/                    # BudgetImporter, XlsxReader
├── dist/                          # Сборка Vite (деploy)
├── docs/                          # Эта вики
├── public/                        # Статика: logo, bg, manifest
├── scripts/                       # import-budget.py, migrate, start
├── src/                           # React SPA
│   ├── App.tsx                    # Роутинг, auth gate, onboarding
│   ├── main.tsx
│   ├── index.css                  # Темы, layout, компонентные стили
│   ├── pages/                     # Страницы-маршруты
│   ├── components/                # UI по доменам
│   ├── store/                     # Zustand stores
│   ├── utils/                     # Бизнес-логика на клиенте
│   ├── constants/
│   └── types/
├── DEPLOY.md
├── package.json
├── vite.config.ts
└── router-dev.php                 # Dev PHP router
```

## Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (PWA-capable)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ React SPA   │  │ Zustand      │  │ localStorage        │ │
│  │ pages/      │◄─┤ budgetStore  │  │ theme, collapsed,   │ │
│  │ components/ │  │ authStore    │  │ quickForm, onboard  │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────────┘ │
│         │                │                                   │
│         │         apiRepository.ts (fetch + credentials)     │
└─────────┼────────────────┼───────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    /api/*  (PHP index.php)                   │
│  auth.php (sessions) │ Database.php │ BudgetImporter         │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
        MySQL (prod)                   SQLite (local dev)
```

## Поток данных

### Загрузка приложения

1. `App.tsx` → `authStore.checkSession()` → `GET /api/auth/me`
2. Если авторизован → `budgetStore.init()` → `GET /api/` (полный payload)
3. Payload: `{ months, transactions, categoryTotals, accounts, categories, settings }`
4. Клиент строит производные данные: `buildMonthSummaries`, `indexTransactionsByMonth`
5. При необходимости создаётся текущий месяц: `POST /api/months`

### Мутации

- Все изменения идут через `apiRepository` → REST → обновление Zustand state
- Optimistic UI **не используется** — ждём ответ API
- После bulk-операций иногда вызывается полный `init()` для консистентности

### Где считается логика

| Логика | Где |
|--------|-----|
| CRUD, персистентность | PHP API + MySQL |
| Сводки месяцев, балансы счетов, категории | **Клиент** (`src/utils/budget.ts`) |
| Инсайты аналитики | **Клиент** (`src/utils/analyticsInsights.ts`) |
| Правила операций (расход/перевод/кредит) | **Клиент** (`src/utils/transactionRules.ts`) |
| Автокатегоризация | **Клиент** + JSON rules; API endpoint suggest |

> **Архитектурное решение:** тяжёлые расчёты на клиенте — осознанный выбор для простоты PHP-бэкенда и быстрой итерации UI. При росте данных (>10k транзакций) может потребоваться серверная агрегация.

## Аутентификация

- PHP-сессии (`$_SESSION['user_id']`)
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` при `APP_HTTPS=true`
- Все API routes (кроме login/register) требуют сессию
- Multi-tenancy: все таблицы имеют `user_id`, данные изолированы

## Сборка и деплой

```bash
npm run build   # tsc --noEmit && vite build → dist/
```

GitHub Actions:
1. Checkout, `npm ci`, `npm run build`
2. Bundle: `dist/*` + `api/` + `.htaccess` + `data/.htaccess`
3. **Удаляет** `api/config.php` из bundle (секреты только на сервере)
4. FTP upload

## Локальная разработка

**Вариант A** — один PHP dev-server:
```powershell
php router-dev.php   # или scripts/dev-server.ps1
npm run dev          # Vite proxy на API
```

**Вариант B** — nginx + php-cgi (как personal-rpg):
- Порт 8081 — сайт
- Порт 9001 — php-cgi

## Зависимости между проектами

- Изначально форк/клон паттерна **personal-rpg** (локальный runtime nginx+php)
- Excel-модель импорта заточена под конкретный файл владельца `Бюджет.xlsx`

## Ключевые файлы для понимания кодовой базы

| Файл | Зачем читать |
|------|--------------|
| `src/types/index.ts` | Все доменные типы |
| `src/store/budgetStore.ts` | Центр состояния и actions |
| `src/utils/budget.ts` | ~700 строк расчётов |
| `src/utils/transactionRules.ts` | Классификация операций |
| `api/index.php` | Все REST endpoints |
| `api/Database.php` | Подключение БД, loadAllPayload |
