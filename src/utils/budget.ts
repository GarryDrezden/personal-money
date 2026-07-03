import type {
  Account,
  AccountMonthSummary,
  BudgetMonth,
  Category,
  CategoryMonthSummary,
  MonthCategoryTotal,
  MonthRpgStatus,
  MonthSummary,
  NamedTotal,
  PeriodTotals,
  Transaction,
} from '../types';
import {
  isCountedAsExpense,
  isCountedAsIncome,
  isCreditCardDebtReduction,
  isCreditCardPayment,
  isCreditCardSpending,
  isIgnored,
  isInternalTransfer,
  txAmount,
} from './transactionRules';

export {
  isCountedAsExpense,
  isCountedAsIncome,
  isCreditCardDebtReduction,
  isCreditCardPayment,
  isCreditCardSpending,
  isIgnored,
  isInternalTransfer,
  txAmount,
};

function toAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function sumExpenses(transactions: Transaction[]): number {
  return transactions.filter(isCountedAsExpense).reduce((sum, tx) => sum + toAmount(tx.expenseAmount), 0);
}

export function sumIncome(transactions: Transaction[]): number {
  return transactions.filter(isCountedAsIncome).reduce((sum, tx) => sum + toAmount(tx.incomeAmount), 0);
}

export function compareTransactionsNewestFirst(a: Transaction, b: Transaction): number {
  const da = a.txDate ?? '';
  const db = b.txDate ?? '';
  if (da !== db) return db.localeCompare(da);
  return b.sortOrder - a.sortOrder;
}

/** YYYY-MM из даты операции или из привязанного месяца. */
export function transactionYearMonth(
  tx: Transaction,
  months?: BudgetMonth[],
): string | null {
  if (tx.txDate && tx.txDate.length >= 7) return tx.txDate.slice(0, 7);
  const month = months?.find((m) => m.id === tx.monthId);
  return month?.yearMonth ?? null;
}

export function belongsToMonth(tx: Transaction, month: BudgetMonth): boolean {
  const ym = transactionYearMonth(tx, [month]);
  if (ym) return ym === month.yearMonth;
  return tx.monthId === month.id;
}

export function findMonthByYearMonth(months: BudgetMonth[], yearMonth: string): BudgetMonth | undefined {
  return months.find((m) => m.yearMonth === yearMonth);
}

export function yearMonthFromDate(txDate: string | null | undefined): string | null {
  if (!txDate || txDate.length < 7) return null;
  return txDate.slice(0, 7);
}

export function indexTransactionsByMonth(
  transactions: Transaction[],
  months: BudgetMonth[] = [],
): Record<string, Transaction[]> {
  const map: Record<string, Transaction[]> = {};
  for (const month of months) {
    map[month.id] = [];
  }
  for (const tx of transactions) {
    const month = months.find((m) => belongsToMonth(tx, m));
    const key = month?.id ?? tx.monthId;
    if (!map[key]) map[key] = [];
    map[key].push(tx);
  }
  for (const monthId of Object.keys(map)) {
    map[monthId].sort(compareTransactionsNewestFirst);
  }
  return map;
}

export function monthDelta(transactions: Transaction[]): number {
  return sumIncome(transactions) - sumExpenses(transactions);
}

export function getMonthTransactions(
  transactions: Transaction[],
  monthId: string,
  months?: BudgetMonth[],
): Transaction[] {
  const month = months?.find((m) => m.id === monthId);
  return transactions
    .filter((tx) => {
      if (month) return belongsToMonth(tx, month);
      return tx.monthId === monthId;
    })
    .sort(compareTransactionsNewestFirst);
}

export function getMonthRpgStatus(delta: number): MonthRpgStatus {
  if (delta > 1000) return 'victory';
  if (delta < -1000) return 'danger';
  return 'neutral';
}

export function getPreviousMonthSummary(
  summaries: MonthSummary[],
  currentMonthId: string,
): MonthSummary | undefined {
  const sorted = [...summaries].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const idx = sorted.findIndex((s) => s.monthId === currentMonthId);
  return idx > 0 ? sorted[idx - 1] : undefined;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function buildMonthSummaries(
  months: BudgetMonth[],
  transactions: Transaction[],
  initialOpeningBalance: number,
  accounts: Account[] = [],
): MonthSummary[] {
  let runningComputed = initialOpeningBalance;

  return months.map((month) => {
    const monthTx = getMonthTransactions(transactions, month.id, months);
    const expenses = sumExpenses(monthTx);
    const income = sumIncome(monthTx);
    const delta = income - expenses;

    if (month.openingBalance !== null) {
      runningComputed = month.openingBalance + delta;
    } else {
      runningComputed += delta;
    }

    const importedBalance = month.importedBalance;
    const actualBalance = accounts.length
      ? getTotalAccountsBalance(transactions, months, month.id, accounts)
      : runningComputed;
    const balanceMismatch =
      importedBalance !== null && Math.abs(importedBalance - actualBalance) > 1;

    const summary: MonthSummary = {
      monthId: month.id,
      yearMonth: month.yearMonth,
      expenses,
      income,
      delta,
      importedBalance,
      computedBalance: actualBalance,
      balanceMismatch,
      rpgStatus: getMonthRpgStatus(delta),
      transactionCount: monthTx.length,
    };

    if (importedBalance !== null) {
      runningComputed = importedBalance;
    }

    return summary;
  });
}

export function getMonthSummary(
  months: BudgetMonth[],
  transactions: Transaction[],
  monthId: string,
  initialOpeningBalance: number,
  accounts: Account[] = [],
): MonthSummary | undefined {
  return buildMonthSummaries(months, transactions, initialOpeningBalance, accounts).find(
    (s) => s.monthId === monthId,
  );
}

export function periodTotals(
  summaries: MonthSummary[],
  fromYearMonth: string,
  toYearMonth: string,
): PeriodTotals {
  const filtered = summaries.filter(
    (s) => s.yearMonth >= fromYearMonth && s.yearMonth <= toYearMonth,
  );
  return {
    income: filtered.reduce((sum, s) => sum + s.income, 0),
    expenses: filtered.reduce((sum, s) => sum + s.expenses, 0),
    delta: filtered.reduce((sum, s) => sum + s.delta, 0),
  };
}

export function yearTotals(summaries: MonthSummary[], year: number): PeriodTotals {
  return periodTotals(summaries, `${year}-01`, `${year}-12`);
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

export function formatDelta(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatMoney(value)}`;
}

export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

const EXCEL_CAT_MAP: Record<string, string> = {
  'Еда': 'food',
  'Ежемесячные': 'monthly',
  'Кредиты': 'credits',
  'Алкоголь': 'alcohol',
  'Остальное': 'other',
  'Стануша': 'stanusha',
};

export function getAccountMonthSummary(
  transactions: Transaction[],
  monthId: string,
  account: Account,
  priorClosingBalance: number,
  months?: BudgetMonth[],
): AccountMonthSummary {
  const monthTx = getMonthTransactions(transactions, monthId, months).filter((tx) => !isIgnored(tx));
  let income = 0;
  let expenses = 0;
  let transfersIn = 0;
  let transfersOut = 0;
  let corrections = 0;
  let debtChange = 0;
  let payments = 0;
  let count = 0;

  for (const tx of monthTx) {
    const affects =
      tx.accountId === account.id || tx.targetAccountId === account.id;
    if (!affects) continue;
    count++;
    const amount = txAmount(tx);
    const kind = tx.operationKind;

    if (account.type === 'credit') {
      if (isCreditCardPayment(tx, account.id)) {
        payments += amount;
        debtChange -= amount;
      } else if (tx.accountId === account.id && kind === 'correction') {
        if ((tx.incomeAmount ?? 0) > 0) {
          debtChange -= tx.incomeAmount ?? 0;
        } else if ((tx.expenseAmount ?? 0) > 0) {
          debtChange += tx.expenseAmount ?? 0;
        }
      } else if (isCreditCardDebtReduction(tx, account.id)) {
        debtChange -= tx.incomeAmount ?? 0;
      } else if (isCreditCardSpending(tx, account.id)) {
        debtChange += tx.expenseAmount ?? 0;
      }
      continue;
    }

    if (kind === 'correction' && tx.accountId === account.id) {
      corrections += tx.incomeAmount ?? -(tx.expenseAmount ?? 0);
    } else if (kind === 'transfer' || kind === 'credit_card_payment') {
      if (tx.accountId === account.id) transfersOut += amount;
      if (tx.targetAccountId === account.id) transfersIn += amount;
    } else if (tx.accountId === account.id) {
      if ((tx.incomeAmount ?? 0) > 0) income += tx.incomeAmount ?? 0;
      if ((tx.expenseAmount ?? 0) > 0) expenses += tx.expenseAmount ?? 0;
    }
  }

  let closingAvailable =
    priorClosingBalance + income - expenses + transfersIn - transfersOut + corrections;

  if (account.type === 'credit') {
    closingAvailable = priorClosingBalance - debtChange;
    const limit = account.creditLimit ?? 0;
    return {
      accountId: account.id,
      openingBalance: priorClosingBalance - limit,
      income: payments,
      expenses: debtChange > 0 ? debtChange : 0,
      transfersIn: 0,
      transfersOut: 0,
      corrections: 0,
      closingAvailable,
      closingBalance: closingAvailable - limit,
      creditLimit: account.creditLimit,
      transactionCount: count,
      debtChange,
      payments,
    };
  }

  return {
    accountId: account.id,
    openingBalance: priorClosingBalance,
    income,
    expenses,
    transfersIn,
    transfersOut,
    corrections,
    closingBalance: closingAvailable,
    transactionCount: count,
  };
}

export function getAllAccountsSummary(
  transactions: Transaction[],
  months: BudgetMonth[],
  monthId: string,
  accounts: Account[],
): AccountMonthSummary[] {
  const monthIdx = months.findIndex((m) => m.id === monthId);
  const sortedAccounts = [...accounts]
    .filter((a) => a.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const running: Record<string, number> = {};
  for (const acc of sortedAccounts) {
    running[acc.id] = acc.initialBalance;
  }

  for (let i = 0; i < monthIdx; i++) {
    const mid = months[i].id;
    for (const acc of sortedAccounts) {
      const s = getAccountMonthSummary(transactions, mid, acc, running[acc.id], months);
      running[acc.id] =
        acc.type === 'credit'
          ? (s.closingAvailable ?? s.closingBalance + (acc.creditLimit ?? 0))
          : s.closingBalance;
    }
  }

  return sortedAccounts.map((acc) =>
    getAccountMonthSummary(
      transactions,
      monthId,
      acc,
      running[acc.id] ?? acc.initialBalance,
      months,
    ),
  );
}

export function getCategoryMonthSummary(
  transactions: Transaction[],
  monthId: string,
  categories: Category[],
  categoryTotals: MonthCategoryTotal[],
  totalExpenses: number,
  months?: BudgetMonth[],
): CategoryMonthSummary[] {
  const monthTx = getMonthTransactions(transactions, monthId, months).filter(isCountedAsExpense);
  const map = new Map<string, number>();

  for (const tx of monthTx) {
    const catId = tx.categoryId ?? (tx.category ? EXCEL_CAT_MAP[tx.category] : null);
    if (!catId) continue;
    map.set(catId, (map.get(catId) ?? 0) + toAmount(tx.expenseAmount));
  }

  const expenseCats = categories.filter((c) => c.type === 'expense' && c.isActive);
  const excelForMonth = categoryTotals.filter((c) => c.monthId === monthId);

  return expenseCats
    .map((cat) => {
      const amount = map.get(cat.id) ?? 0;
      const excelRow = excelForMonth.find((e) => EXCEL_CAT_MAP[e.category] === cat.id || e.category === cat.name);
      const excelAmount = excelRow?.amount ?? null;
      const limit = cat.monthlyLimit;
      let limitStatus: 'ok' | 'warning' | 'danger' = 'ok';
      if (limit != null && limit > 0) {
        const pct = amount / limit;
        if (pct > 1) limitStatus = 'danger';
        else if (pct >= 0.8) limitStatus = 'warning';
      }
      return {
        categoryId: cat.id,
        name: cat.name,
        icon: cat.icon,
        amount,
        percentOfExpenses: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        monthlyLimit: limit,
        limitStatus,
        excelAmount,
      };
    })
    .filter((c) => c.amount > 0 || c.excelAmount)
    .sort((a, b) => b.amount - a.amount);
}

export function getCreditCardSummary(
  transactions: Transaction[],
  monthId: string,
  accountId: string,
  months?: BudgetMonth[],
): { spending: number; payments: number; refunds: number; debtChange: number } {
  const monthTx = getMonthTransactions(transactions, monthId, months).filter((tx) => !isIgnored(tx));
  let spending = 0;
  let payments = 0;
  let refunds = 0;
  for (const tx of monthTx) {
    if (isCreditCardSpending(tx, accountId)) {
      spending += tx.expenseAmount ?? 0;
    }
    if (isCreditCardPayment(tx, accountId)) {
      payments += txAmount(tx);
    }
    if (isCreditCardDebtReduction(tx, accountId)) {
      refunds += tx.incomeAmount ?? 0;
    }
  }
  return { spending, payments, refunds, debtChange: spending - payments - refunds };
}

export type TxDisplayKind = 'expense' | 'income' | 'transfer' | 'correction' | 'neutral';

export function getTransactionDisplay(tx: Transaction): {
  kind: TxDisplayKind;
  amount: number;
  signedText: string;
} {
  const amount = txAmount(tx);
  const kind = tx.operationKind;

  if (kind === 'transfer' || kind === 'credit_card_payment') {
    return { kind: 'transfer', amount, signedText: formatMoney(amount) };
  }
  if (kind === 'correction') {
    const signed = (tx.incomeAmount ?? 0) - (tx.expenseAmount ?? 0);
    return {
      kind: 'correction',
      amount: Math.abs(signed),
      signedText: formatDelta(signed),
    };
  }
  if ((tx.incomeAmount ?? 0) > 0 && !(tx.expenseAmount ?? 0)) {
    const inc = tx.incomeAmount ?? 0;
    return { kind: 'income', amount: inc, signedText: formatDelta(inc) };
  }
  if ((tx.expenseAmount ?? 0) > 0) {
    const exp = tx.expenseAmount ?? 0;
    return { kind: 'expense', amount: exp, signedText: formatDelta(-exp) };
  }
  return { kind: 'neutral', amount, signedText: formatMoney(amount) };
}

export function getUncategorizedTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (tx) => !isIgnored(tx) && !tx.categoryId && ((tx.expenseAmount ?? 0) > 0 || (tx.incomeAmount ?? 0) > 0),
  );
}

export function getTransactionsWithoutAccount(transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (tx) => !isIgnored(tx) && !tx.accountId && tx.operationKind !== 'transfer',
  );
}

export function filterTransactions(
  transactions: Transaction[],
  filters: {
    accountId?: string;
    categoryId?: string;
    incomeCategoryId?: string;
    operationType?: string;
    search?: string;
    largeOnly?: boolean;
    noCategory?: boolean;
    noAccount?: boolean;
    incomeOnly?: boolean;
    categoryNames?: Map<string, string>;
  },
): Transaction[] {
  return transactions.filter((tx) => {
    if (filters.accountId && tx.accountId !== filters.accountId && tx.targetAccountId !== filters.accountId) {
      return false;
    }
    if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
    if (filters.incomeCategoryId) {
      if (tx.categoryId !== filters.incomeCategoryId) return false;
      if (!isCountedAsIncome(tx)) return false;
    }
    if (filters.incomeOnly && !isCountedAsIncome(tx)) return false;
    if (filters.operationType) {
      if (filters.operationType === 'expense' && !isCountedAsExpense(tx)) return false;
      if (filters.operationType === 'income' && !isCountedAsIncome(tx)) return false;
      if (filters.operationType === 'transfer' && tx.operationKind !== 'transfer') return false;
      if (filters.operationType === 'credit_card_payment' && tx.operationKind !== 'credit_card_payment') {
        return false;
      }
      if (filters.operationType === 'correction' && tx.operationKind !== 'correction') return false;
      if (filters.operationType === 'debt_payment' && tx.operationKind !== 'debt_payment') return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const catLabel = tx.categoryId ? (filters.categoryNames?.get(tx.categoryId) ?? tx.categoryId) : '';
      const hay = `${tx.expenseName ?? ''} ${tx.incomeSource ?? ''} ${tx.note ?? ''} ${catLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.largeOnly && txAmount(tx) < 5000) return false;
    if (filters.noCategory && tx.categoryId) return false;
    if (filters.noAccount && tx.accountId) return false;
    return true;
  });
}

export function topExpenseNames(transactions: Transaction[], limit = 15): NamedTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const tx of transactions) {
    if (!tx.expenseName || !isCountedAsExpense(tx)) continue;
    const key = tx.expenseName;
    const prev = map.get(key) ?? { total: 0, count: 0 };
    map.set(key, { total: prev.total + toAmount(tx.expenseAmount), count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function topIncomeSources(transactions: Transaction[], limit = 15): NamedTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const tx of transactions) {
    if (!tx.incomeSource || !isCountedAsIncome(tx)) continue;
    const key = tx.incomeSource;
    const prev = map.get(key) ?? { total: 0, count: 0 };
    map.set(key, { total: prev.total + toAmount(tx.incomeAmount), count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function categoryTotalsForMonth(
  categoryTotals: MonthCategoryTotal[],
  monthId: string,
): MonthCategoryTotal[] {
  return categoryTotals.filter((c) => c.monthId === monthId);
}

export function aggregateCategoryTotals(
  categoryTotals: MonthCategoryTotal[],
  monthIds: Set<string>,
): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const row of categoryTotals) {
    if (!monthIds.has(row.monthId)) continue;
    map.set(row.category, (map.get(row.category) ?? 0) + row.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthCategoryExpenseRow {
  monthId: string;
  yearMonth: string;
  total: number;
  items: { categoryId: string; name: string; amount: number }[];
}

/** Траты по категориям для каждого месяца года (по дате операции). */
export function monthlyExpenseByCategory(
  transactions: Transaction[],
  months: BudgetMonth[],
  categories: Category[],
  year: string,
): MonthCategoryExpenseRow[] {
  const catNames = new Map(categories.map((c) => [c.id, c.name]));
  const yearMonths = months
    .filter((m) => m.yearMonth.startsWith(year))
    .sort((a, b) => b.sortOrder - a.sortOrder);

  return yearMonths.map((month) => {
    const monthTx = getMonthTransactions(transactions, month.id, months).filter(isCountedAsExpense);
    const amounts = new Map<string, number>();
    for (const tx of monthTx) {
      const catId = tx.categoryId ?? (tx.category ? EXCEL_CAT_MAP[tx.category] : null);
      if (!catId) continue;
      amounts.set(catId, (amounts.get(catId) ?? 0) + toAmount(tx.expenseAmount));
    }
    const items = [...amounts.entries()]
      .map(([categoryId, amount]) => ({
        categoryId,
        name: catNames.get(categoryId) ?? categoryId,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
    return {
      monthId: month.id,
      yearMonth: month.yearMonth,
      total: items.reduce((sum, i) => sum + i.amount, 0),
      items,
    };
  });
}

export function averageMonthlyExpenses(summaries: MonthSummary[]): number {
  if (summaries.length === 0) return 0;
  return summaries.reduce((sum, s) => sum + s.expenses, 0) / summaries.length;
}

export function mostExpensiveMonth(summaries: MonthSummary[]): MonthSummary | null {
  if (summaries.length === 0) return null;
  return summaries.reduce((max, s) => (s.expenses > max.expenses ? s : max));
}

export function getRecentTransactions(transactions: Transaction[], limit = 10): Transaction[] {
  return [...transactions].sort(compareTransactionsNewestFirst).slice(0, limit);
}

export function accountName(accounts: Account[], id: string | null): string {
  if (!id) return '—';
  return accounts.find((a) => a.id === id)?.name ?? id;
}

export function categoryName(categories: Category[], id: string | null): string {
  if (!id) return '—';
  return categories.find((c) => c.id === id)?.name ?? id;
}

/** Разница между фактическим «доступно» и расчётом (положительная — нужна коррекция-доход). */
export function creditAvailableDelta(
  summary: AccountMonthSummary,
  targetAvailable: number,
): number {
  const limit = summary.creditLimit ?? 0;
  const current =
    summary.closingAvailable ?? summary.closingBalance + limit;
  return targetAvailable - current;
}

export function creditDebtAmount(summary: AccountMonthSummary): number {
  const limit = summary.creditLimit ?? 0;
  const available =
    summary.closingAvailable ?? summary.closingBalance + limit;
  return Math.max(0, limit - available);
}

export function getTotalAccountsBalance(
  transactions: Transaction[],
  months: BudgetMonth[],
  monthId: string,
  accounts: Account[],
): number {
  const debitIds = new Set(
    accounts.filter((a) => a.type !== 'credit' && a.status === 'active').map((a) => a.id),
  );
  return getAllAccountsSummary(transactions, months, monthId, accounts)
    .filter((s) => debitIds.has(s.accountId))
    .reduce((sum, s) => sum + s.closingBalance, 0);
}
