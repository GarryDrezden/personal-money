CREATE TABLE IF NOT EXISTS budget_months (
  id TEXT PRIMARY KEY,
  year_month TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL,
  opening_balance REAL,
  imported_balance REAL,
  collapsed INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'debit',
  color TEXT,
  icon TEXT,
  initial_balance REAL NOT NULL DEFAULT 0,
  credit_limit REAL,
  status TEXT NOT NULL DEFAULT 'active',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  monthly_limit REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  month_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  tx_date TEXT,
  expense_name TEXT,
  expense_amount REAL,
  income_source TEXT,
  income_amount REAL,
  category TEXT,
  account_id TEXT,
  target_account_id TEXT,
  category_id TEXT,
  operation_kind TEXT NOT NULL DEFAULT 'regular',
  payment_status TEXT NOT NULL DEFAULT 'done',
  note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (month_id) REFERENCES budget_months(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_month ON transactions(month_id, sort_order);

CREATE TABLE IF NOT EXISTS month_category_totals (
  month_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (month_id, category),
  FOREIGN KEY (month_id) REFERENCES budget_months(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  currency TEXT NOT NULL DEFAULT 'RUB',
  import_completed_at TEXT,
  initial_opening_balance REAL NOT NULL DEFAULT 2007,
  theme_id TEXT NOT NULL DEFAULT 'cozy'
);

INSERT OR IGNORE INTO app_settings (id) VALUES (1);
