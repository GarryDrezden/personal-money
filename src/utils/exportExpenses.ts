import type { Account, BudgetMonth, Category, Transaction } from '../types';
import {
  accountName,
  categoryName,
  compareTransactionsNewestFirst,
  isCountedAsExpense,
  transactionYearMonth,
} from './budget';
import { formatReceiptAmount, parseReceiptText } from './receiptParse';

function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${yearMonth}-${String(last).padStart(2, '0')}`;
}

function currentYearMonth(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/** Диапазон дат для CSV: весь год или один месяц. Текущий период обрезается сегодняшним днём. */
export function expenseDateRange(
  year: string,
  options?: { today?: Date; yearMonth?: string },
): { from: string; to: string } {
  const today = options?.today ?? new Date();
  const todayKey = isoDate(today);
  const ym = options?.yearMonth;
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    const from = `${ym}-01`;
    const toFull = lastDayOfMonth(ym);
    if (ym === currentYearMonth(today) && todayKey < toFull) {
      return { from, to: todayKey };
    }
    return { from, to: toFull };
  }
  const from = `${year}-01-01`;
  if (year === String(today.getFullYear())) {
    return { from, to: todayKey };
  }
  return { from, to: `${year}-12-31` };
}

export function yearExpenseDateRange(
  year: string,
  today = new Date(),
): { from: string; to: string } {
  return expenseDateRange(year, { today });
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
    yearMonth?: string;
  },
): Transaction[] {
  const { from, to } = expenseDateRange(year, {
    today: options?.today,
    yearMonth: options?.yearMonth,
  });
  const monthById = new Map(months.map((m) => [m.id, m]));

  return transactions
    .filter((tx) => {
      if (!isCountedAsExpense(tx)) return false;
      if (options?.accountId && tx.accountId !== options.accountId) return false;
      if (options?.categoryId && tx.categoryId !== options.categoryId) return false;

      const date = txDateKey(tx, months);
      if (!date) {
        const month = monthById.get(tx.monthId);
        if (!month) return false;
        if (options?.yearMonth) return month.yearMonth === options.yearMonth;
        return month.yearMonth.startsWith(year);
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

function receiptCsvFields(tx: Transaction): {
  store: string;
  items: string;
  total: string;
  text: string;
} {
  const text = tx.receiptText?.trim() ?? '';
  if (!text) {
    return { store: '', items: '', total: '', text: '' };
  }
  const parsed = parseReceiptText(text);
  const items = parsed.items
    .map((item) => {
      const name = item.count > 1 ? `${item.name} ×${item.count}` : item.name;
      return `${name} — ${formatReceiptAmount(item.amount)}`;
    })
    .join(' | ');
  return {
    store: parsed.store ?? '',
    items,
    total: parsed.total != null ? formatReceiptAmount(parsed.total) : '',
    text,
  };
}

export function expensesToCsv(
  transactions: Transaction[],
  months: BudgetMonth[],
  accounts: Account[],
  categories: Category[],
): string {
  const header = [
    'Дата',
    'Название',
    'Сумма',
    'Категория',
    'Счёт',
    'Заметка',
    'Магазин',
    'Позиции чека',
    'Итого чека',
    'Текст чека',
  ];
  const rows = transactions.map((tx) => {
    const date = txDateKey(tx, months) ?? '';
    const name = tx.expenseName ?? '';
    const amount = String(tx.expenseAmount ?? 0).replace('.', ',');
    const cat = categoryName(categories, tx.categoryId) || tx.category || '';
    const acc = accountName(accounts, tx.accountId);
    const note = tx.note ?? '';
    const receipt = receiptCsvFields(tx);
    return [
      date,
      name,
      amount,
      cat,
      acc,
      note,
      receipt.store,
      receipt.items,
      receipt.total,
      receipt.text,
    ]
      .map((v) => csvEscape(String(v)))
      .join(';');
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
  yearMonth?: string;
}): { count: number; from: string; to: string } {
  const { from, to } = expenseDateRange(params.year, { yearMonth: params.yearMonth });
  const expenses = collectYearExpenses(params.transactions, params.months, params.year, {
    accountId: params.accountId || undefined,
    categoryId: params.categoryId || undefined,
    yearMonth: params.yearMonth,
  });
  const csv = expensesToCsv(expenses, params.months, params.accounts, params.categories);
  const stamp = params.yearMonth ?? params.year;
  downloadTextFile(`traty-${stamp}-${from}_${to}.csv`, csv);
  return { count: expenses.length, from, to };
}
