# 10. Чеклист для внешнего ревью + промпт для GPT

Этот документ — для передачи стороннему AI или человеку-ревьюеру.

---

## Промпт для GPT (скопировать целиком)

```
Ты — senior product engineer и UX-аудitor. Перед тобой полная вики open-source проекта «Личный бюджет» — personal finance SPA для одного пользователя/семьи.

Контекст:
- React 19 + PHP REST + MySQL (prod) / SQLite (local)
- Prod: http://where-is-the-money.ru/
- Русский UI, валюта RUB
- Замена Excel-таблицы бюджета
- Разработчик считает v1 завершённым

Прочитай все файлы в docs/ (01–10) и дай структурированный аудит:

## 1. Product & UX (оценка 1–10 + обоснование)
- Соответствует ли продукт задаче «ежедневный учёт за 10 секунд»?
- Логична ли структура главной страницы?
- Mobile UX: scroll depth, FAB, bottom nav
- Onboarding vs import path
- Что раздражает или redundant?

## 2. Architecture (оценка 1–10)
- Client-side calculations vs server — риски?
- Zustand state design
- PHP monolith API — масштабируемость
- Multi-tenancy correctness
- Single points of failure

## 3. Code quality (оценка 1–10)
- TypeScript coverage
- Separation of concerns (budget.ts size)
- Test coverage (сейчас 0%) — что тестировать первым?
- Error handling patterns

## 4. Security (оценка 1–10)
- Session auth adequacy for personal app
- CSRF, XSS, SQL injection surface
- migrate-hosting.php risk
- Production hardening gaps

## 5. Design & accessibility
- cozy theme contrast on Hello Kitty background
- darkFantasy theme
- a11y gaps

## 6. Missing features (prioritized)
- Must have before «production ready»
- Nice to have
- Explicitly out of scope

## 7. Top 5 quick wins
Конкретные изменения с max impact / min effort

## 8. Top 5 strategic improvements
Если проект жить 2+ года

## 9. Verdict
Одним абзацем: «готово к личному использованию» / «нужна доработка X» / «over-engineered» / «under-engineered»

Будь честным и конкретным. Ссылайся на документы вики и номера функций из 06-features-inventory.md.
```

---

## Известные пробелы (self-assessment)

Авторы проекта уже знают об этих gap'ах — ревьюер может проверить актуальность.

### UX

| # | Проблема | Severity |
|---|----------|----------|
| 1 | AttentionBlock «Всё в порядке» занимает место без пользы | Medium |
| 2 | Превышение лимитов категорий не в AttentionBlock | Medium |
| 3 | FinancialPulse дублирует AccountCards | Low |
| 4 | Нет переключателя месяца на главной | Medium |
| 5 | Серый текст на Hello Kitty фоне между карточками | Medium |
| 6 | Длинный scroll на mobile dashboard | Low |

### Функциональность

| # | Gap | Severity |
|---|-----|----------|
| 7 | Нет recurring/planned payments UI | Medium |
| 8 | Нет MySQL backup export | Medium |
| 9 | Import зависит от Python на сервере | High (prod) |
| 10 | payment_status `planned`/`ignored` — слабый UI | Low |
| 11 | Password reset отсутствует | Low (personal) |

### Техническое

| # | Gap | Severity |
|---|-----|----------|
| 12 | Zero automated tests | High |
| 13 | Все расчёты на клиенте — perf при >5k tx | Medium |
| 14 | Нет API versioning | Low |
| 15 | README.md устарел (SQLite-centric) | Low |
| 16 | No service worker / offline | Low |
| 17 | CSRF tokens отсутствуют | Medium |
| 18 | exec() для import — security/compat | Medium |

---

## Сильные стороны (для баланса ревью)

Ревьюеру стоит проверить, согласен ли он:

1. **Полнота для v1** — dashboard, ledger, analytics, settings, onboarding, FAQ
2. **Credit card model** — debt, available, reconcile, payments — non-trivial и реализовано
3. **Transaction rules** — transfer/income/expense classification корректно отделена
4. **Insights engine** — MoM/YoY/forecast без внешних сервисов
5. **Undo delete** — продуманный UX паттерн
6. **Deep links** — AttentionBlock → ledger filters
7. **Visual identity** — узнаваемый, не generic «admin template»
8. **Deploy pipeline** — простой и рабочий для solo dev
9. **Multi-user ready** — schema с user_id, хотя используется solo
10. **TypeScript types** — хорошая доменная модель в types/index.ts

---

## Вопросы для ревьюера

1. Стоит ли переносить `buildMonthSummaries` на сервер?
2. Нужен ли React Query поверх Zustand для cache/sync?
3. Dashboard: 6 блоков — too many или ok?
4. Hello Kitty theme — delight или anti-pattern для finance app?
5. PHP monolith vs Node/Bun API — имеет смысл миграция?
6. Какой минимальный test suite даст max confidence?
7. PWA offline — нужен ли для этого use case?
8. Category limits: warning at 80% — правильный порог?

---

## Файлы для углублённого code review

Если ревьюер имеет доступ к репозиторию:

```
src/utils/budget.ts              # Core calculations
src/utils/transactionRules.ts    # Classification
src/store/budgetStore.ts         # State + side effects
src/components/dashboard/        # Dashboard UX
src/components/ledger/           # Main daily workflow
api/index.php                    # All endpoints
api/Database.php                 # Data layer
src/index.css                    # Theming
```

---

## Критерии «готово / не готово»

### Готово для личного prod (author opinion)

- [x] Daily transaction entry works on mobile
- [x] Balances match after reconcile
- [x] Import from Excel works (locally)
- [x] Auth + data isolation
- [x] Auto deploy

### Не готово для public SaaS

- [ ] Tests
- [ ] Password recovery
- [ ] HTTPS enforced
- [ ] Rate limiting
- [ ] MySQL backup
- [ ] Legal/privacy pages
- [ ] On-call monitoring

---

## Changelog wiki

| Дата | Изменение |
|------|-----------|
| 2026-06-10 | Initial wiki created for external audit |
