import { describe, expect, it } from 'vitest';
import { buildMonthSummaries, getMonthTransactions } from './budget';
import { MAIN_ACCOUNT, month, tx } from '../test/fixtures';

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
