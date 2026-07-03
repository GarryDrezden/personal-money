# 08. Деплой и эксплуатация

## Production

| Параметр | Значение |
|----------|----------|
| URL | http://where-is-the-money.ru/ |
| Хостинг | Shared hosting (FTP) |
| БД | MySQL, utf8mb4_unicode_ci |
| SSL | Планируется (APP_HTTPS=false пока) |
| Config | `api/config.php` — **только на сервере, вручную** |

### Checklist после деплоя

1. https://where-is-the-money.ru/api/health → `configExists: true`, `pdoMysql: true`
2. Login works
3. Dashboard loads data
4. Create transaction persists after refresh

---

## CI/CD

File: `.github/workflows/deploy.yml`

**Trigger:** push to `main`

**Steps:**
1. checkout
2. setup-node 20, npm ci
3. npm run build
4. Prepare bundle:
   - `dist/*` → root
   - `api/` → api/
   - `.htaccess`
   - `data/.htaccess`
   - **Remove** `api/config.php`
5. FTP-Deploy-Action → secrets: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, FTP_SERVER_DIR

**Не деплоится:**
- node_modules, server/, *.sqlite, config.php
- scripts/ (кроме если вручную)

---

## GitHub Secrets required

```
FTP_SERVER
FTP_USERNAME
FTP_PASSWORD
FTP_SERVER_DIR   # e.g. /public_html/
```

---

## Server config (manual)

### api/config.php

См. `api/config.example.php` и `DEPLOY.md`.

### .htaccess

- SPA fallback: все non-file routes → index.html
- /api → api/index.php

### data/

- `.htaccess` deny web access
- Used for SQLite (local) and temporary migration files

---

## Локальная разработка

### Prerequisites

```powershell
npm install
# Python 3 + openpyxl for import
pip install openpyxl
```

### Dev commands

```powershell
npm run dev      # Vite :5173 with proxy
npm run build    # Production build
npm run preview  # Preview dist
```

### PHP (not in PATH on Windows)

```powershell
# From project root:
E:\...\personal-budget\server\runtime\php\php.exe -S 127.0.0.1:8081 router-dev.php
```

Or: `scripts/dev-server.ps1`, `PersonalBudget.bat`

### Ports (local full stack)

| Port | Service |
|------|---------|
| 8081 | nginx/site |
| 9001 | php-cgi |
| 5173 | Vite dev |

Не конфликтует с personal-rpg (:8080/:9000).

---

## Import on production

**Проблема:** `POST /import/xlsx` вызывает `exec('python ...')`.

На shared-хостинге Python может быть **недоступен** → import fail 500.

**Workarounds:**
1. Импорт локально → migrate-hosting.php
2. Включить Python в панели хостинга (если есть)
3. Будущее: PHP-only importer (SimpleXlsxReader уже есть в api/import/)

---

## Backup strategy

| Environment | Method |
|-------------|--------|
| Local SQLite | Settings → Download / copy `data/personal-budget.sqlite` |
| Production MySQL | phpMyAdmin export (manual) |
| API /backup | 400 on MySQL |

**Gap:** нет автоматического MySQL backup в приложении.

---

## Monitoring

- `/api/health` — manual check
- No Sentry, no logs aggregation
- PHP errors → 500 JSON to client

---

## Security notes

| Topic | Status |
|-------|--------|
| Password hashing | ✅ password_hash PHP |
| SQL injection | ✅ PDO prepared statements |
| CSRF | ⚠️ SameSite=Lax only |
| Rate limiting | ❌ |
| migrate-hosting.php | ⚠️ Must delete after use |
| config.php in git | ❌ gitignored on deploy |
| HTTPS | ⚠️ Not yet |

---

## Rollback

1. Revert commit on main → auto redeploy previous build
2. Or manual FTP upload of previous dist/
3. DB migrations are forward-only (no migration versioning)

---

## Environment matrix

| | Local dev | Production |
|---|-----------|------------|
| DB | SQLite default | MySQL |
| Auth | Same | Same |
| Import Python | ✅ Usually | ⚠️ Maybe |
| FTP deploy | Manual optional | GitHub Actions |
| Hello Kitty bg | ✅ | ✅ |
