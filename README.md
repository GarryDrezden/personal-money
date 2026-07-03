# Личный бюджет (Personal Budget)

Веб-приложение для учёта расходов, счетов и категорий. **Prod:** http://where-is-the-money.ru/

## Документация

**Полная вики проекта:** [`docs/README.md`](./docs/README.md) — для разработки и внешнего аудита (GPT review).

| Раздел | Файл |
|--------|------|
| Обзор продукта | [docs/01-product-overview.md](./docs/01-product-overview.md) |
| Архитектура | [docs/02-tech-architecture.md](./docs/02-tech-architecture.md) |
| БД и API | [docs/03-data-model-and-api.md](./docs/03-data-model-and-api.md) |
| Frontend | [docs/04-frontend-structure.md](./docs/04-frontend-structure.md) |
| Бизнес-правила | [docs/05-business-rules.md](./docs/05-business-rules.md) |
| Инвентарь функций | [docs/06-features-inventory.md](./docs/06-features-inventory.md) |
| Дизайн и UX | [docs/07-design-ux-theming.md](./docs/07-design-ux-theming.md) |
| Деплой | [docs/08-deployment-operations.md](./docs/08-deployment-operations.md) |
| История | [docs/09-development-history.md](./docs/09-development-history.md) |
| Чеклист для ревью | [docs/10-review-checklist.md](./docs/10-review-checklist.md) |

## Быстрый старт (локально)

## Быстрый старт

1. **Зависимости фронта:** `npm install`
2. **Импорт:** Python 3 + openpyxl (`pip install openpyxl`)
3. **Сборка:** `npm run build`
4. **Runtime:** скопируйте `server/runtime` из `personal-rpg` (nginx + php portable)
5. **Импорт Excel:**
   ```powershell
   python scripts/import-budget.py "C:\Users\Вячеслав\Desktop\Бюджет.xlsx"
   ```
6. **Запуск:** двойной клик `PersonalBudget.bat` или `scripts/start-all.ps1`

## Разработка

**PHP не в PATH** — используйте bundled PHP из `server/runtime/php/` или из personal-rpg.

```powershell
# Вариант A — один сервер (проще для отладки)
powershell -File scripts/dev-server.ps1

# Вариант B — Vite + nginx (как в проде)
scripts/start-all.ps1
npm run dev
```

Полный путь к PHP (если нужно вручную):
```powershell
E:\Работа\OSPanel\domains\personal-budget\server\runtime\php\php.exe -S 127.0.0.1:8081 router-dev.php
```
Запускать из корня `personal-budget`, **не** из `C:\Windows\System32`.

## Разделы

| URL | Описание |
|-----|----------|
| `/` | Dashboard — сводки по годам, график |
| `/ledger` | Журнал — сворачиваемые месяцы, операции, категории |
| `/analytics` | Аналитика — категории, топы |
| `/settings` | Импорт, бэкап, начальный баланс |

## Порты

- **8081** — nginx (сайт)
- **9001** — php-cgi (API)

Не конфликтует с Personal RPG (:8080 / :9000).

## Деплой на прод

См. [DEPLOY.md](./DEPLOY.md) и [docs/08-deployment-operations.md](./docs/08-deployment-operations.md).

Push в `main` → GitHub Actions → FTP на хостинг.

## Бэкап

- **Локально (SQLite):** Настройки → «Скачать бэкап» или `data/personal-budget.sqlite`
- **Прод (MySQL):** phpMyAdmin export вручную

## Структура

```
personal-budget/
├── api/           PHP REST + import
├── data/          SQLite (в .gitignore)
├── dist/          сборка фронта
├── scripts/       start, import, build
└── src/           React SPA
```
