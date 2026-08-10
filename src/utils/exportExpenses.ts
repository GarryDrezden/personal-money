import type { Account, BudgetMonth, Category, Transaction } from '../types';
import {
  accountName,
  categoryName,
  compareTransactionsNewestFirst,
  isCountedAsExpense,
  transactionYearMonth,
} from './budget';

export function yearExpenseDateRange(
  year: string,
  today = new Date(),
): { from: string; to: string } {
  const from = `${year}-01-01`;
  const currentYear = String(today.getFullYear());
  if (year === currentYear) {
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return { from, to: `${currentYear}-${m}-${d}` };
  }
  return { from, to: `${year}-12-31` };
}

function txDateKey(tx: Transaction, months: BudgetMonth[]): string | null {
  if (tx.txDate && tx.txDate.length >= 10) return tx.txDate.slice(0, 10);
  const ym = transactionYearMonth(tx, months);
  return ym ? `${ym}-01` : null;
}

export function collectYearExpenses(
  transactions: Transaction[],
  months: BudgetMonth[],
  year: string,
  options?: {
    accountId?: string;
    categoryId?: string;
    today?: Date;
  },
): Transaction[] {
  const { from, to } = yearExpenseDateRange(year, options?.today);
  const monthById = new Map(months.map((m) => [m.id, m]));

  return transactions
    .filter((tx) => {
      if (!isCountedAsExpense(tx)) return false;
      if (options?.accountId && tx.accountId !== options.accountId) return false;
      if (options?.categoryId && tx.categoryId !== options.categoryId) return false;

      const date = txDateKey(tx, months);
      if (!date) {
        const month = monthById.get(tx.monthId);
        return Boolean(month?.yearMonth.startsWith(year));
      }
      return date >= from && date <= to;
    })
    .sort((a, b) => {
      const da = txDateKey(a, months) ?? '';
      const db = txDateKey(b, months) ?? '';
      if (da !== db) return da.localeCompare(db);
      return compareTransactionsNewestFirst(b, a);
    });
}

function csvEscape(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function expensesToCsv(
  transactions: Transaction[],
  months: BudgetMonth[],
  accounts: Account[],
  categories: Category[],
): string {
  const header = ['Дата', 'Название', 'Сумма', 'Категория', 'Счёт', 'Заметка'];
  const rows = transactions.map((tx) => {
    const date = txDateKey(tx, months) ?? '';
    const name = tx.expenseName ?? '';
    const amount = String(tx.expenseAmount ?? 0).replace('.', ',');
    const cat = categoryName(categories, tx.categoryId) || tx.category || '';
    const acc = accountName(accounts, tx.accountId);
    const note = tx.note ?? '';
    return [date, name, amount, cat, acc, note].map((v) => csvEscape(String(v))).join(';');
  });
  return `\uFEFF${[header.join(';'), ...rows].join('\r\n')}`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadYearExpensesCsv(params: {
  year: string;
  transactions: Transaction[];
  months: BudgetMonth[];
  accounts: Account[];
  categories: Category[];
  accountId?: string;
  categoryId?: string;
}): { count: number; from: string; to: string } {
  const { from, to } = yearExpenseDateRange(params.year);
  const expenses = collectYearExpenses(params.transactions, params.months, params.year, {
    accountId: params.accountId || undefined,
    categoryId: params.categoryId || undefined,
  });
  const csv = expensesToCsv(expenses, params.months, params.accounts, params.categories);
  downloadTextFile(`traty-${params.year}-${from}_${to}.csv`, csv);
  return { count: expenses.length, from, to };
}
