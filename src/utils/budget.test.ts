import { describe, expect, it } from 'vitest';
import type { Category } from '../types';
import {
  buildMonthSummaries,
  getMonthTransactions,
  groupExpensesByName,
  monthlyExpenseByCategory,
  UNNAMED_EXPENSE,
} from './budget';
import { MAIN_ACCOUNT, month, tx } from '../test/fixtures';

const FOOD: Category = {
  id: 'food',
  name: 'Еда',
  type: 'expense',
  color: null,
  icon: null,
  monthlyLimit: null,
  isActive: true,
  sortOrder: 1,
};

const HOME: Category = {
  id: 'home',
  name: 'Дом',
  type: 'expense',
  color: null,
  icon: null,
  monthlyLimit: null,
  isActive: true,
  sortOrder: 2,
};

describe('buildMonthSummaries', () => {
  it('computes income, expenses and delta for a single month', () => {
    const m = month({ id: 'm1', yearMonth: '2025-06' });
    const transactions = [
      tx({ id: '1', monthId: 'm1', incomeAmount: 100_000, incomeSource: 'Зарплата' }),
      tx({ id: '2', monthId: 'm1', expenseAmount: 60_000, expenseName: 'Еда', categoryId: 'food' }),
    ];
    const [summary] = buildMonthSummaries([m], transactions, 0, []);
    expect(summary.income).toBe(100_000);
    expect(summary.expenses).toBe(60_000);
    expect(summary.delta).toBe(40_000);
  });

  it('accumulates running balance across months', () => {
    const months = [
      month({ id: 'm1', yearMonth: '2025-05', sortOrder: 1 }),
      month({ id: 'm2', yearMonth: '2025-06', sortOrder: 2 }),
    ];
    const transactions = [
      tx({ id: '1', monthId: 'm1', txDate: '2025-05-10', incomeAmount: 10_000, incomeSource: 'A' }),
      tx({ id: '2', monthId: 'm2', txDate: '2025-06-10', expenseAmount: 3_000, expenseName: 'B' }),
    ];
    const summaries = buildMonthSummaries(months, transactions, 2007, []);
    expect(summaries[0].computedBalance).toBe(12_007);
    expect(summaries[1].computedBalance).toBe(9_007);
  });

  it('uses openingBalance override when set on month', () => {
    const m = month({ id: 'm1', yearMonth: '2025-06', openingBalance: 50_000 });
    const transactions = [tx({ id: '1', monthId: 'm1', incomeAmount: 5_000, incomeSource: 'X' })];
    const [summary] = buildMonthSummaries([m], transactions, 0, []);
    expect(summary.computedBalance).toBe(55_000);
  });

  it('continues from importedBalance for next month', () => {
    const months = [
      month({ id: 'm1', yearMonth: '2025-05', importedBalance: 100_000, sortOrder: 1 }),
      month({ id: 'm2', yearMonth: '2025-06', sortOrder: 2 }),
    ];
    const transactions = [tx({ id: '1', monthId: 'm2', expenseAmount: 4_000, expenseName: 'Y' })];
    const summaries = buildMonthSummaries(months, transactions, 2007, []);
    expect(summaries[1].computedBalance).toBe(96_000);
  });

  it('excludes ignored transactions from expenses', () => {
    const m = month({ id: 'm1', yearMonth: '2025-06' });
    const transactions = [
      tx({ id: '1', monthId: 'm1', expenseAmount: 5000, paymentStatus: 'ignored' }),
      tx({ id: '2', monthId: 'm1', expenseAmount: 1000 }),
    ];
    const [summary] = buildMonthSummaries([m], transactions, 0, []);
    expect(summary.expenses).toBe(1000);
  });

  it('excludes transfers from monthly expenses', () => {
    const m = month({ id: 'm1', yearMonth: '2025-06' });
    const transactions = [
      tx({
        id: '1',
        monthId: 'm1',
        operationKind: 'transfer',
        expenseAmount: 20_000,
        targetAccountId: 'shared_card',
      }),
      tx({ id: '2', monthId: 'm1', expenseAmount: 5000 }),
    ];
    const [summary] = buildMonthSummaries([m], transactions, 0, []);
    expect(summary.expenses).toBe(5000);
  });

  it('assigns transaction to month by tx_date when it differs from monthId', () => {
    const months = [
      month({ id: 'm1', yearMonth: '2025-01', sortOrder: 1 }),
      month({ id: 'm2', yearMonth: '2025-02', sortOrder: 2 }),
    ];
    const transactions = [
      tx({
        id: '1',
        monthId: 'm1',
        txDate: '2025-02-10',
        expenseAmount: 900,
      }),
    ];
    const febTx = getMonthTransactions(transactions, 'm2', months);
    expect(febTx).toHaveLength(1);
    const summaries = buildMonthSummaries(months, transactions, 0, []);
    expect(summaries[0].expenses).toBe(0);
    expect(summaries[1].expenses).toBe(900);
  });

  it('flags balanceMismatch when imported differs from computed', () => {
    const m = month({ id: 'm1', yearMonth: '2025-06', importedBalance: 100_000 });
    const transactions = [
      tx({ id: '1', monthId: 'm1', incomeAmount: 50_000, accountId: MAIN_ACCOUNT.id }),
    ];
    const [summary] = buildMonthSummaries([m], transactions, 0, [MAIN_ACCOUNT]);
    expect(summary.balanceMismatch).toBe(true);
  });
});

describe('groupExpensesByName', () => {
  it('merges identical names and sorts by amount descending', () => {
    const transactions = [
      tx({ id: '1', monthId: 'm1', expenseName: 'Пятёрочка', expenseAmount: 800, categoryId: 'food' }),
      tx({ id: '2', monthId: 'm1', expenseName: 'Перекрёсток', expenseAmount: 2500, categoryId: 'food' }),
      tx({ id: '3', monthId: 'm1', expenseName: 'пятёрочка', expenseAmount: 400, categoryId: 'food' }),
    ];
    expect(groupExpensesByName(transactions)).toEqual([
      { name: 'Перекрёсток', amount: 2500, count: 1 },
      { name: 'Пятёрочка', amount: 1200, count: 2 },
    ]);
  });

  it('groups blank names as unnamed', () => {
    const transactions = [
      tx({ id: '1', monthId: 'm1', expenseName: '  ', expenseAmount: 100, categoryId: 'food' }),
      tx({ id: '2', monthId: 'm1', expenseName: null, expenseAmount: 50, categoryId: 'food' }),
    ];
    expect(groupExpensesByName(transactions)).toEqual([
      { name: UNNAMED_EXPENSE, amount: 150, count: 2 },
    ]);
  });
});

describe('monthlyExpenseByCategory', () => {
  it('nests grouped expenses under each category, largest first', () => {
    const months = [month({ id: 'm1', yearMonth: '2026-09', sortOrder: 9 })];
    const transactions = [
      tx({ id: '1', monthId: 'm1', txDate: '2026-09-02', expenseName: 'Икеа', expenseAmount: 9000, categoryId: 'home' }),
      tx({ id: '2', monthId: 'm1', txDate: '2026-09-03', expenseName: 'Пятёрочка', expenseAmount: 700, categoryId: 'food' }),
      tx({ id: '3', monthId: 'm1', txDate: '2026-09-04', expenseName: 'Пятёрочка', expenseAmount: 300, categoryId: 'food' }),
      tx({
        id: '4',
        monthId: 'm1',
        txDate: '2026-09-05',
        expenseName: 'Перевод',
        expenseAmount: 50_000,
        categoryId: 'food',
        operationKind: 'transfer',
        targetAccountId: 'shared_card',
      }),
    ];
    const [row] = monthlyExpenseByCategory(transactions, months, [FOOD, HOME], '2026');
    expect(row.total).toBe(10_000);
    expect(row.items.map((item) => item.categoryId)).toEqual(['home', 'food']);
    expect(row.items[0].entries).toEqual([{ name: 'Икеа', amount: 9000, count: 1 }]);
    expect(row.items[1].amount).toBe(1000);
    expect(row.items[1].entries).toEqual([{ name: 'Пятёрочка', amount: 1000, count: 2 }]);
  });
});
