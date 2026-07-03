# Вики проекта «Личный бюджет»

Полная документация для разработчиков и **внешнего аудита** (ревью GPT, code review, UX-аудит).

| Документ | Содержание |
|----------|------------|
| [01-product-overview.md](./01-product-overview.md) | Продукт, аудитория, цели, сценарии |
| [02-tech-architecture.md](./02-tech-architecture.md) | Стек, структура репозитория, потоки данных |
| [03-data-model-and-api.md](./03-data-model-and-api.md) | MySQL-схема, REST API, авторизация |
| [04-frontend-structure.md](./04-frontend-structure.md) | React SPA: страницы, компоненты, state |
| [05-business-rules.md](./05-business-rules.md) | Операции, счета, кредитки, категории, расчёты |
| [06-features-inventory.md](./06-features-inventory.md) | Полный перечень функций по экранам |
| [07-design-ux-theming.md](./07-design-ux-theming.md) | Темы, визуал, мобильная вёрстка, UX-решения |
| [08-deployment-operations.md](./08-deployment-operations.md) | Прод, CI/CD, локальная разработка |
| [09-development-history.md](./09-development-history.md) | История спринтов и коммитов |
| [10-review-checklist.md](./10-review-checklist.md) | Известные пробелы + промпт для AI-ревьюера |
| [11-testing-plan.md](./11-testing-plan.md) | План автотестов расчётов (Vitest) |

---

## Быстрые факты

| Параметр | Значение |
|----------|----------|
| Название | **Личный бюджет** (Personal Budget) |
| Репозиторий | https://github.com/GarryDrezden/personal-money |
| Прод | http://where-is-the-money.ru/ |
| Локальный путь | `E:\Работа\OSPanel\domains\personal-budget` |
| Фронт | React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Zustand |
| Бэкенд | PHP 8 (REST, сессии) |
| БД (прод) | MySQL 8, utf8mb4 |
| БД (локально) | SQLite или MySQL (через `api/config.php`) |
| Язык UI | Русский |
| Валюта | RUB (₽) |
| Деплой | GitHub Actions → FTP на shared-хостинг |

---

## Как использовать для анализа GPT

Скопируйте в чат **весь каталог `docs/`** (или приложите репозиторий) и используйте промпт из [10-review-checklist.md](./10-review-checklist.md).

Рекомендуемый порядок чтения для ревьюера:

1. Обзор продукта → архитектура → модель данных  
2. Бизнес-правила → инвентарь функций  
3. UX/дизайн → деплой → история  
4. Чеклист + открытые вопросы

---

## Связанные файлы вне `docs/`

| Файл | Назначение |
|------|------------|
| `README.md` | Краткий старт для разработчика (частично устарел — см. `08-deployment-operations.md`) |
| `DEPLOY.md` | Инструкция деплоя на хостинг |
| `api/schema-mysql.sql` | DDL для MySQL |
| `api/config.example.php` | Шаблон конфигурации сервера |
