# 06. Полный инвентарь функций

Чеклист реализованного функционала по экранам. Статус на момент последнего спринта (commit ~3038e55).

---

## Авторизация

| Функция | Статус | Детали |
|---------|--------|--------|
| Регистрация | ✅ | username + password, seed data |
| Вход | ✅ | PHP session |
| Выход | ✅ | redirect /login |
| Session persistence | ✅ | cookie HttpOnly |
| Защита routes | ✅ | ProtectedApp redirect |
| Password reset | ❌ | Нет |
| Email verification | ❌ | Нет |

---

## Главная (Dashboard)

| Функция | Статус | Компонент |
|---------|--------|-----------|
| Заголовок с текущим месяцем | ✅ | PageHeader |
| Блок «Требует внимания» | ✅ | AttentionBlock |
| — операции без категории | ✅ | link → ledger |
| — операции без счёта | ✅ | link → ledger |
| — большой долг по кредитке | ✅ | threshold logic |
| — превышение лимита категории | ❌ | только в Analytics |
| Пустой ok-state «Всё в порядке» | ✅ | green card |
| Financial Pulse — баланс на счетах | ✅ | FinancialPulse |
| Financial Pulse — расходы/доходы | ✅ | + MoM % |
| Financial Pulse — кредитка | ✅ | debt, available, progress |
| Карточки счетов | ✅ | AccountCards |
| — debit: balance + expenses | ✅ | link → ledger |
| — credit: CreditCardCard | ✅ | reconcile button |
| Быстрый ввод (compact) | ✅ | QuickEntryWidget |
| Категории за месяц + лимиты | ✅ | MonthCategoriesWidget |
| Последние 10 операций | ✅ | RecentTransactions |
| Обзор года (accordion) | ✅ | YearOverview |
| Переключение месяца на главной | ❌ | только calendar month |
| Empty state (нет данных) | ✅ | → settings |

---

## Журнал (Ledger)

| Функция | Статус | Детали |
|---------|--------|--------|
| Аккордеон по месяцам | ✅ | newest first |
| Inline edit (desktop table) | ✅ | TransactionTable |
| Card view (mobile) | ✅ | TransactionCards |
| Summary bar (итого) | ✅ | centered, rounded |
| Быстрый ввод — расход | ✅ | primary tab |
| Быстрый ввод — доход | ✅ | primary tab |
| Быстрый ввод — перевод | ✅ | primary tab |
| Быстрый ввод — ещё типы | ✅ | debt, credit payment, correction |
| Live category hint | ✅ | suggestCategory |
| Фильтры — поиск | ✅ | open by default |
| Фильтры — счёт/категория | ✅ | |
| Фильтры — без категории/счёта | ✅ | |
| Фильтры — крупные суммы | ✅ | |
| Filter chips | ✅ | LedgerFilterChips |
| URL deep links | ✅ | from AttentionBlock |
| Добавить строку | ✅ | expense/income/both |
| Дублировать операцию | ✅ | |
| Удалить + undo | ✅ | toast 8s |
| Bulk assign category/account | ✅ | BulkAssignModal |
| Category summary per month | ✅ | progress bars |
| Account summary per month | ✅ | |
| Credit reconcile modal | ✅ | correction tx |
| Align month balance | ✅ | settings/maintenance |
| Payment status UI | ⚠️ | тип есть, UI скрыт/минимален |
| Planned transactions | ⚠️ | статус в модели, нет отдельного UX |

---

## Аналитика

| Функция | Статус | Детали |
|---------|--------|--------|
| Выбор года | ✅ | |
| Фильтр по счёту | ✅ | |
| Фильтр по категории | ✅ | |
| Line chart доходы/расходы | ✅ | Recharts |
| Bar chart по категориям | ✅ | |
| Pie chart структура | ✅ | |
| Insights panel | ✅ | AnalyticsInsightsPanel |
| — MoM comparison | ✅ | |
| — YoY comparison | ✅ | |
| — Month forecast | ✅ | |
| — Limit warnings | ✅ | |
| — Anomaly detection | ✅ | |
| — Negative delta | ✅ | |
| Top expense names | ✅ | |
| Top income sources | ✅ | |
| Credit card stats | ✅ | |
| Export reports | ❌ | |

---

## Настройки

| Функция | Статус | Tab |
|---------|--------|-----|
| CRUD счетов | ✅ | Бюджет |
| — иконка, цвет | ✅ | IconPicker |
| — credit limit | ✅ | |
| — close account | ✅ | soft delete |
| CRUD категорий | ✅ | Бюджет |
| — monthly limit | ✅ | |
| — expense/income types | ✅ | |
| Import Excel | ✅ | Данные |
| Re-import (force) | ✅ | reset + import |
| Initial opening balance | ✅ | Данные |
| Data stats | ✅ | months, tx count |
| SQLite backup download | ⚠️ | только local SQLite |
| Theme: cozy | ✅ | Вид |
| Theme: darkFantasy | ✅ | Вид |
| Maintenance tools | ✅ | recalculate, etc. |

---

## Глобальный UX

| Функция | Статус | Детали |
|---------|--------|--------|
| FAB «+» quick add | ✅ | QuickAddFab |
| Bottom nav (mobile) | ✅ | 5 items |
| Sidebar (desktop) | ✅ | |
| Toast notifications | ✅ | ToastHost |
| Onboarding wizard | ✅ | 6 steps, first-time |
| FAQ page | ✅ | in-app help |
| Error boundary | ✅ | ledger |
| PWA manifest | ✅ | no SW |
| Keyboard shortcuts | ❌ | |
| i18n | ❌ | Russian only |

---

## Backend / Admin

| Функция | Статус |
|---------|--------|
| Multi-user isolation | ✅ |
| Health check | ✅ |
| SQLite → MySQL migration tool | ✅ (one-time) |
| FTP auto deploy | ✅ |
| API rate limiting | ❌ |
| Audit log | ❌ |

---

## Легенда

- ✅ — реализовано и используется
- ⚠️ — частично / legacy / ограничено окружением
- ❌ — не реализовано
