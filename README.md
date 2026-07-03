# Personal Budget — локальный учёт расходов

Локальный сайт на **http://127.0.0.1:8081** — React + PHP + SQLite, по образцу [personal-rpg](../personal-rpg).

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

## Бэкап

Настройки → «Скачать personal-budget.sqlite» или копия файла `data/personal-budget.sqlite`.

## Структура

```
personal-budget/
├── api/           PHP REST + import
├── data/          SQLite (в .gitignore)
├── dist/          сборка фронта
├── scripts/       start, import, build
└── src/           React SPA
```
