export type ThemeId = 'cozy' | 'darkFantasy';

export type AccountType = 'debit' | 'credit';
export type CategoryType = 'expense' | 'income' | 'system';
export type OperationKind =
  | 'regular'
  | 'transfer'
  | 'debt_payment'
  | 'credit_card_payment'
  | 'correction';
export type PaymentStatus = 'done' | 'planned' | 'ignored';
export type MonthRpgStatus = 'victory' | 'neutral' | 'danger';

export type AccountStatus = 'active' | 'closed' | 'hidden';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string | null;
  icon: string | null;
  initialBalance: number;
  creditLimit: number | null;
  status: AccountStatus;
  isActive: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  monthlyLimit: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface BudgetMonth {
  id: string;
  yearMonth: string;
  sortOrder: number;
  openingBalance: number | null;
  importedBalance: number | null;
  collapsed: boolean;
}

export interface Transaction {
  id: string;
  monthId: string;
  sortOrder: number;
  txDate: string | null;
  expenseName: string | null;
  expenseAmount: number | null;
  incomeSource: string | null;
  incomeAmount: number | null;
  category: string | null;
  accountId: string | null;
  targetAccountId: string | null;
  categoryId: string | null;
  operationKind: OperationKind;
  paymentStatus: PaymentStatus;
  note: string;
}

export interface MonthCategoryTotal {
  monthId: string;
  category: string;
  amount: number;
}

export interface AppSettings {
  currency: string;
  importCompletedAt: string | null;
  initialOpeningBalance: number;
  themeId: ThemeId;
}

export interface BudgetData {
  months: BudgetMonth[];
  transactions: Transaction[];
  categoryTotals: MonthCategoryTotal[];
  accounts: Account[];
  categories: Category[];
  settings: AppSettings;
}

export interface MonthSummary {
  monthId: string;
  yearMonth: string;
  expenses: number;
  income: number;
  delta: number;
  importedBalance: number | null;
  computedBalance: number;
  balanceMismatch: boolean;
  rpgStatus: MonthRpgStatus;
  transactionCount: number;
}

export interface AccountMonthSummary {
  accountId: string;
  openingBalance: number;
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
  corrections: number;
  closingBalance: number;
  /** Для кредитки: доступный остаток до вычета лимита */
  closingAvailable?: number;
  creditLimit?: number | null;
  transactionCount: number;
  debtChange?: number;
  payments?: number;
}

export interface CategoryMonthSummary {
  categoryId: string;
  name: string;
  icon: string | null;
  amount: number;
  percentOfExpenses: number;
  monthlyLimit: number | null;
  limitStatus: 'ok' | 'warning' | 'danger';
  excelAmount: number | null;
}

export interface PeriodTotals {
  income: number;
  expenses: number;
  delta: number;
}

export interface NamedTotal {
  name: string;
  total: number;
  count: number;
}

export interface QuickFormPrefs {
  operationType: 'expense' | 'income' | 'transfer' | 'debt_payment' | 'credit_card_payment' | 'correction';
  accountId: string;
  targetAccountId: string;
  categoryId: string;
  txDate: string;
}

export interface LedgerFilters {
  accountId: string;
  categoryId: string;
  incomeCategoryId: string;
  operationType: string;
  search: string;
  largeOnly: boolean;
  noCategory: boolean;
  noAccount: boolean;
  incomeOnly: boolean;
}

export const DEFAULT_LEDGER_FILTERS: LedgerFilters = {
  accountId: '',
  categoryId: '',
  incomeCategoryId: '',
  operationType: '',
  search: '',
  largeOnly: false,
  noCategory: false,
  noAccount: false,
  incomeOnly: false,
};

export const DEFAULT_QUICK_FORM: QuickFormPrefs = {
  operationType: 'expense',
  accountId: 'main_card',
  targetAccountId: 'credit_payments_card',
  categoryId: 'food',
  txDate: new Date().toISOString().slice(0, 10),
};
