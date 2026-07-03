CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budget_months (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  year_month CHAR(7) NOT NULL,
  sort_order INT NOT NULL,
  opening_balance DECIMAL(14,2) NULL,
  imported_balance DECIMAL(14,2) NULL,
  collapsed TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_months_user_ym (user_id, year_month),
  KEY idx_months_user_sort (user_id, sort_order),
  CONSTRAINT fk_months_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(16) NOT NULL DEFAULT 'debit',
  color VARCHAR(32) NULL,
  icon VARCHAR(64) NULL,
  initial_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(14,2) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_accounts_user (user_id),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(16) NOT NULL,
  color VARCHAR(32) NULL,
  icon VARCHAR(64) NULL,
  monthly_limit DECIMAL(14,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_categories_user (user_id),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  month_id CHAR(36) NOT NULL,
  sort_order INT NOT NULL,
  tx_date DATE NULL,
  expense_name VARCHAR(512) NULL,
  expense_amount DECIMAL(14,2) NULL,
  income_source VARCHAR(512) NULL,
  income_amount DECIMAL(14,2) NULL,
  category VARCHAR(255) NULL,
  account_id CHAR(36) NULL,
  target_account_id CHAR(36) NULL,
  category_id CHAR(36) NULL,
  operation_kind VARCHAR(32) NOT NULL DEFAULT 'regular',
  payment_status VARCHAR(16) NOT NULL DEFAULT 'done',
  note TEXT NOT NULL,
  KEY idx_transactions_month (month_id, sort_order),
  KEY idx_transactions_account (account_id),
  KEY idx_transactions_category (category_id),
  CONSTRAINT fk_transactions_month FOREIGN KEY (month_id) REFERENCES budget_months(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS month_category_totals (
  month_id CHAR(36) NOT NULL,
  category VARCHAR(255) NOT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (month_id, category),
  CONSTRAINT fk_mct_month FOREIGN KEY (month_id) REFERENCES budget_months(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  currency VARCHAR(8) NOT NULL DEFAULT 'RUB',
  import_completed_at DATETIME NULL,
  initial_opening_balance DECIMAL(14,2) NOT NULL DEFAULT 2007,
  theme_id VARCHAR(32) NOT NULL DEFAULT 'cozy',
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
