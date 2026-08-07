# Личный бюджет — карта для агента

Короткий always-on индекс. Полные тексты — в `docs/`; для ежедневной работы читай **один** релевантный файл, не весь каталог.

## Стек

| Слой | Технология |
|------|------------|
| Frontend | React 19 + TypeScript + Vite 6 + Tailwind 4 + Zustand → `dist/` |
| Backend | PHP 8 REST + сессии в `api/` |
| DB | MySQL 8 (прод); локально SQLite или MySQL через `api/config.php` |
| Прод | http://where-is-the-money.ru/ |
| Deploy | GitHub Actions → FTP |

Валюта UI: RUB (₽). Язык UI: русский.

## Ключевые пути

| Зона | Путь |
|------|------|
| SPA | `src/` (`pages/`, `components/`, `store/`) |
| API | `api/` (`index.php`, `auth.php`, `Database.php`, `import/`) |
| Схема | `api/schema-mysql.sql` |
| Автокатегоризация | `api/rules/categorize.json` |
| Docs | `docs/01`…`11` |

## Читать по задаче

- Архитектура / структура → `docs/02-tech-architecture.md`
- API / схема → `docs/03-data-model-and-api.md`
- Frontend → `docs/04-frontend-structure.md`
- Расчёты / бизнес-правила → `docs/05-business-rules.md` (+ skill `budget-calc-change`)
- UX / темы → `docs/07-design-ux-theming.md`
- Deploy → `docs/08-deployment-operations.md`
- Тесты расчётов → `docs/11-testing-plan.md`

Индекс: `docs/README.md`. Полный дамп `docs/` — только для разового аудита, не для обычных правок.

## После крупной задачи

Обнови релевантные docs (часто `05`, `06`, при API — `03`). Shared hosting: skill `shared-hosting-php-react`.
