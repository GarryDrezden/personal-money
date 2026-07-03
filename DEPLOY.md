# Деплой на shared-хостинг (только сервер)

Прод: **http://where-is-the-money.ru/**

Локальный проект нужен **только для git push**. Сайт и БД живут на хостинге.

---

## 1. MySQL в панели хостинга

1. Создайте базу **utf8mb4_unicode_ci**.
2. Импортируйте **`api/schema-mysql.sql`** в phpMyAdmin (все 7 таблиц).

---

## 2. `api/config.php` на сервере

Создайте вручную (FTP / файловый менеджер), CI его **не заливает**:

```php
<?php
return [
  'DB_DRIVER' => 'mysql',
  'DB_HOST' => 'localhost',              // хост из панели
  'DB_NAME' => 'имя_базы',
  'DB_USER' => 'пользователь',
  'DB_PASSWORD' => 'пароль',
  'DB_CHARSET' => 'utf8mb4',
  'APP_URL' => 'http://where-is-the-money.ru',
  'APP_HTTPS' => false,
  'MIGRATE_SECRET' => 'придумайте-длинный-секрет-123',
];
```

Проверка: **http://where-is-the-money.ru/api/health**

---

## 3. Код сайта

Push в `main` → GitHub Actions заливает файлы по FTP.

Или вручную: `npm run build` → залить `dist/*`, `api/`, `.htaccess`.

---

## 4. Миграция данных (на хостинге, через браузер)

Нужен файл **`personal-budget.sqlite`** (ваша старая база с компьютера).

### Шаг A — загрузить SQLite на сервер

Через **FTP** или файловый менеджер:

```
public_html/
  data/
    personal-budget.sqlite    ← сюда
```

Папку `data/` создайте, если её нет.

**Или** загрузите файл формой на странице миграции (шаг B).

### Шаг B — открыть страницу миграции

В браузере:

```
http://where-is-the-money.ru/api/migrate-hosting.php?key=ваш-MIGRATE_SECRET
```

1. **Проверка (dry-run)** — только счётчики строк, без записи.
2. **Мигрировать в MySQL** — перенос всех данных → пользователь **GarryDrezden**.
3. В логе должно быть: `Row count verification OK.`

Логин после миграции: **GarryDrezden** / **123456** — сразу смените пароль.

### Шаг C — убрать следы миграции

Удалите с сервера:

- `api/migrate-hosting.php`
- `data/personal-budget.sqlite`

---

## 5. Проверка

- [ ] http://where-is-the-money.ru/ → вход
- [ ] Месяцы, транзакции, кредитка на месте
- [ ] `/api/health` → `configExists: true`, `pdoMysql: true`

---

## SSL (позже)

1. Сертификат в панели.
2. `APP_HTTPS=true` в config.php.
3. Раскомментировать редирект в `.htaccess`.

---

## Частые ошибки

| Проблема | Решение |
|----------|---------|
| 500 на login | Нет `config.php` или неверный `DB_HOST` |
| Forbidden на migrate | Неверный `?key=` или нет `MIGRATE_SECRET` в config |
| PDO SQLite | Включить расширение sqlite в панели (только на время миграции) |
| Пользователь уже есть | Кнопка «Мигрировать с force» |
