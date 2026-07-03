# 09. История разработки

Хронология основных этапов. Репозиторий: https://github.com/GarryDrezden/personal-money

---

## Фаза 0: Основа (до спринтов)

| Commit | Описание |
|--------|----------|
| — | Форк паттерна personal-rpg: React + PHP + SQLite |
| 0f9af96 | Account/category management, settings UX, FAQ, branding |
| 60deb08 | Settings modal portal fix |
| 124f7bf | Wallet logo, favicon, Russian branding |
| 909aae1 | Hello Kitty background (cozy theme) |
| a6f152e | Surface panels for headers (readability fix) |

**MySQL migration phase:**
- fa764f1 — Escape MySQL reserved columns
- ce0ea9a — Fix remaining backticks
- c0c1c1d — SQLite migration import fix
- e1db28f — Empty SQLite warning

---

## Sprint 1: Dashboard foundation

**Commit:** `bf231c5` — Sprint 1: financial pulse and dashboard layout

- `FinancialPulse` — 3-column summary widget
- Dashboard reorder: pulse, accounts, categories
- `YearOverview` accordion
- Month summaries integration

---

## Sprint 2: Quick entry UX

**Commits:** `b4b6f68`, `d37db40`, `16f1f45`

- Simplified quick entry with live category hints
- Transfer added to primary tabs
- Primary button contrast fix (dark text on amber)

---

## Sprint 3: Accounts & limits

**Commit:** `00c5689`

- Account icons (AccountIcon, IconPicker)
- Category remaining budget display
- Dynamic credit accounts (CreditCardCard)
- Credit reconcile modal improvements

---

## UX polish (inter-sprint)

| Commit | Change |
|--------|--------|
| d77f761 | Redesign ledger quick entry + collapsible filters |
| c9c42ed | Ledger 50/50 layout, search icon overlap fix |
| fd75ce5 | Filters open by default on ledger |
| 052e3b0 | Dashboard: header + attention 50/50 |
| 6fee54f | Dashboard: quick entry + categories 50/50 |

---

## Sprint 4: Onboarding

**Commit:** `0e47814`

- `OnboardingWizard` — 6 steps
- accounts → credit → categories → first transaction
- localStorage completion flag per userId
- Skip if import completed or has transactions

---

## Sprint 5: Analytics insights

**Commit:** `e425289`

- `AnalyticsInsightsPanel`
- MoM / YoY comparisons
- Month expense forecast
- Anomaly detection
- Category limit insights

---

## Sprint 6: Mobile & actions

**Commit:** `c20c131`

- FAB «+» (QuickAddFab)
- Undo delete via toast
- Mobile journal cards (TransactionCards)
- FAQ added to bottom nav

---

## Sprint 7: Visual polish

**Commit:** `8ebbc2d`

- Brand pack consolidation
- Manrope font
- Dark theme background (stars gradient)
- EmptyState component
- AuthLayout redesign
- Chart color tokens

---

## Post-sprint fixes

| Commit | Change |
|--------|--------|
| 2b1ded1 | Ledger summary bar centered + rounded (.ledger-table-summary) |
| 3038e55 | Remove «Карты и счета» heading (contrast on Hello Kitty bg) |

---

## Архитектурные решения по ходу проекта

1. **SQLite → MySQL** — для prod на shared hosting; multi-user via user_id
2. **Client-side calculations** — не переносились на сервер при росте функций
3. **Excel import via Python** — legacy от локальной разработки
4. **Stable string IDs** — seed accounts/categories (`main_card`, `food`) для импорта
5. **Zustand over Redux** — минимальный boilerplate
6. **No SSR** — pure SPA, SEO не приоритет

---

## Текущее состояние (v1.0)

Приложение **feature-complete** для личного использования:
- 5 основных экранов + auth + onboarding + FAQ
- 7 спринтов + UX polish
- Prod на where-is-the-money.ru
- CI/CD настроен

---

## Планировавшиеся, но не реализованные идеи

(Из обсуждений, не в коде)

- AttentionBlock: category limit breaches
- Dashboard: один insight с аналитики
- Скрыть пустой green AttentionBlock
- Month picker на главной
- Planned/recurring payments UI
- MySQL JSON export backup
- Service worker / offline
