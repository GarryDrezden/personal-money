# 04. Структура frontend

## Точка входа

```
main.tsx → App.tsx → BrowserRouter
```

### App.tsx — маршрутизация и guards

| Маршрут | Компонент | Доступ |
|---------|-----------|--------|
| `/login` | LoginPage | Только гость |
| `/register` | RegisterPage | Только гость |
| `/*` | ProtectedApp | Требует auth |

**ProtectedApp:**
1. `budgetStore.init()` при наличии user
2. Loading / Error screens
3. `OnboardingWizard` overlay если `shouldShowOnboarding()`
4. Nested routes внутри `AppShell`

---

## Layout

### AppShell (`components/layout/AppShell.tsx`)

- **Desktop:** sidebar слева (логотип, nav, logout)
- **Mobile:** `BottomNav` fixed bottom + `QuickAddFab` fixed bottom-right
- `ToastHost` — глобальные уведомления
- `<Outlet />` для страниц

**Nav links:** Главная, Журнал, Аналитика, Настройки, FAQ

### AuthLayout (`components/layout/AuthLayout.tsx`)

- Центрированная форма login/register
- Брендинг, логотип

---

## Страницы

### DashboardPage (`/`)

```
┌─────────────────────────────────────────┐
│ PageHeader «Главная» │ AttentionBlock   │  ← ledger-top-grid 50/50
├─────────────────────────────────────────┤
│ FinancialPulse (3 колонки)              │
├─────────────────────────────────────────┤
│ AccountCards (grid 2-4 cols)            │
├─────────────────────────────────────────┤
│ QuickEntryWidget │ MonthCategoriesWidget│  ← 50/50
├─────────────────────────────────────────┤
│ RecentTransactions                      │
├─────────────────────────────────────────┤
│ YearOverview (accordion)                │
└─────────────────────────────────────────┘
```

Empty state если нет summaries → «Бюджет ещё не настроен»

### LedgerPage (`/ledger`)

- `QuickTransactionForm` + `LedgerFilters` — 50/50 grid
- `LedgerFilterChips` — активные фильтры
- `MonthAccordion[]` — месяцы в обратном порядке
- URL params → фильтры (из AttentionBlock links)

### AnalyticsPage (`/analytics`)

- Фильтры: год, счёт, категория
- `AnalyticsInsightsPanel` — MoM/YoY, прогноз, аномалии
- Recharts: line (доходы/расходы), bar (категории), pie
- Статистика: средний расход, самый дорогой месяц, топы

### SettingsPage (`/settings`)

Tabs: **Бюджет** | **Данные** | **Вид**

- AccountsEditor, CategoriesEditor
- Import Excel, opening balance, backup link
- Theme picker (cozy / darkFantasy)

### FaqPage (`/faq`)

- Статическая справка по разделам (дублирует часть этой вики для пользователя)

---

## Ключевые компоненты

### Dashboard

| Комponent | Файл | Назначение |
|-----------|------|------------|
| FinancialPulse | `FinancialPulse.tsx` | Баланс на счетах, расходы/доходы месяца, кредитка |
| AttentionBlock | `DashboardWidgets.tsx` | Алерты или «Всё в порядке» |
| AccountCards | `DashboardWidgets.tsx` | Карточки счетов + CreditCardCard |
| QuickEntryWidget | `DashboardWidgets.tsx` | Compact QuickTransactionForm |
| MonthCategoriesWidget | `DashboardWidgets.tsx` | CategorySummary |
| RecentTransactions | `DashboardWidgets.tsx` | 10 последних операций |
| YearOverview | `YearOverview.tsx` | Годовая сводка (accordion) |

### Ledger

| Component | Назначение |
|-----------|------------|
| QuickTransactionForm | Быстрый ввод: tabs Расход/Доход/Перевод/Ещё |
| LedgerFilters | Поиск, счёт, категория, чекбоксы |
| MonthAccordion | Сворачиваемый месяц |
| LedgerMonthPanel | Таблица + карточки (mobile) |
| TransactionTable | Inline edit desktop |
| TransactionCards | Mobile card layout |
| CategorySummary | Прогресс-бары лимитов |
| AccountSummary | Балансы счетов за месяц |
| CreditReconcileModal | Сверка кредитки |
| BulkAssignModal | Массовое назначение |

### Shared UI

| Component | Назначение |
|-----------|------------|
| Card | variant: default/success/danger/neutral |
| EmptyState | Пустые списки |
| PageHeader | title + subtitle + actions |
| Modal | Portal-based dialogs |
| MoneyInput | Форматирование сумм |
| ProgressBar | Лимиты категорий |
| AccountIcon / CategoryIcon | Lucide icons by id |
| TransactionAmount | Цветная сумма +/- |

### Onboarding

`OnboardingWizard.tsx` — 6 шагов:
1. Welcome
2. Accounts (debit cards, balances)
3. Credit (limit, available)
4. Categories (enable + limits)
5. First transaction
6. Done

Состояние завершения: `localStorage` key `personal-budget-onboarding-{userId}`

---

## State management

### authStore (`store/authStore.ts`)

```typescript
{ user, checking, error, checkSession, login, register, logout }
```

### budgetStore (`store/budgetStore.ts`)

**Data:** months, transactions, accounts, categories, categoryTotals, settings

**UI state:**
- `collapsed` — какой месяц развёрнут (localStorage)
- `expandedMonthId`
- `quickForm` — последние значения формы (localStorage)
- `ledgerFilters`
- `toasts[]`

**Key actions:**
- CRUD transactions (+ undo delete via toast)
- bulkUpdateTransactions
- reconcileCreditCard
- alignMonthBalance
- importFile
- saveAccount / saveCategory

### Selectors (`store/selectors.ts`)

- `useSummaries()` — memoized month summaries
- `useMonthCategorySummaries(monthId)`
- `useCurrentMonthSummary()` — календарный месяц или последний

---

## Utils (бизнес-логика на клиенте)

| Файл | ~строк | Содержание |
|------|--------|------------|
| `budget.ts` | 688 | Сводки, балансы, фильтры, форматирование |
| `transactionRules.ts` | 135 | Классификация операций |
| `analyticsInsights.ts` | 350 | Инсайты, прогноз, сравнения |
| `accounts.ts` | ~80 | Credit account helpers |
| `categorize.ts` | ~100 | suggestCategory по title |
| `onboarding.ts` | 37 | Флаги онбординга |
| `categoryIcons.ts` | mapping id → icon |

---

## Роутинг с query params (Ledger)

AttentionBlock генерирует ссылки:

```
/ledger?noCategory=1&month={monthId}
/ledger?noAccount=1&month={monthId}
/ledger?accountId={id}&month={monthId}
```

LedgerPage парсит params → `setLedgerFilters` → `setSearchParams({}, replace)`

---

## Адаптивность

| Breakpoint | Поведение |
|------------|-----------|
| `< md` | BottomNav, TransactionCards, FAB |
| `≥ md` | Sidebar, TransactionTable |
| `ledger-top-grid` | 1 col mobile → 2 col desktop |
| AccountCards | 1→2→4 columns |

---

## PWA

`public/manifest.webmanifest`:
- name: «Личный бюджет»
- display: standalone
- icon: logo-icon.png

**Service Worker отсутствует** — офлайн не поддерживается.

---

## Error handling

- `ErrorBoundary` на LedgerPage
- API errors → toast или error screen
- `budgetStore.error` блокирует всё приложение при init fail
