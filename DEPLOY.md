# Деплой Personal Budget на shared-хостинг

Прод: **http://where-is-the-money.ru/** (корень домена, пока без HTTPS).

## 1. Подготовка MySQL в панели хостинга

1. Создайте базу MySQL, charset **utf8mb4**.
2. Запомните: host, database, user, password.

## 2. Первый деплой файлов

### Вариант A — GitHub Actions (после push в `main`)

Workflow собирает фронт и заливает по FTP. Секреты уже в репозитории:
`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`.

### Вариант B — вручную

```bash
npm ci
npm run build
```

Залить в document root (`public_html/` или путь из `FTP_SERVER_DIR`):

- `dist/index.html` → `index.html`
- `dist/assets/` → `assets/`
- `api/` (кроме локального `config.php` на вашей машине)
- `.htaccess`

## 3. config.php на сервере

Скопируйте `api/config.example.php` → `api/config.php` на сервере:

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
];
```

**Не заливайте** `config.php` из git — CI его исключает.

## 4. Схема БД

В phpMyAdmin импортируйте `api/schema-mysql.sql` **или** откройте сайт — `Database.php` создаст таблицы при первом запросе.

## 5. Миграция данных из SQLite

На локальной машине (где есть `data/personal-budget.sqlite`):

1. Бэкап уже в `data/backups/`.
2. В `api/config.php` временно укажите **прод** MySQL (`DB_DRIVER=mysql`).
3. Dry-run:

```bash
php scripts/migrate-sqlite-to-mysql.php --dry-run
```

4. Миграция:

```bash
php scripts/migrate-sqlite-to-mysql.php
```

5. Сверка row counts должна завершиться **OK**.

Логин: `GarryDrezden` / `123456` — **смените пароль** сразу после входа.

## 6. Проверка (smoke test)

- [ ] http://where-is-the-money.ru/ → логин
- [ ] Месяцы, включая июль 2026
- [ ] Кредитка ~24 132 ₽
- [ ] Новый пользователь (регистрация) → пустой бюджет
- [ ] SQLite-архив локально **не удалён**

## 7. SSL (позже)

1. Сертификат в панели хостинга.
2. В `config.php`: `APP_HTTPS=true`.
3. Раскомментировать редирект в `.htaccess`.

## Локальная разработка

`api/config.php` с `DB_DRIVER=sqlite` — логин `GarryDrezden` / `123456` после авто-миграции существующих данных.

```bash
npm run dev
```
