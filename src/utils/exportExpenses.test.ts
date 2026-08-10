import { describe, expect, it } from 'vitest';
import { collectYearExpenses, yearExpenseDateRange } from './exportExpenses';
import { month, tx } from '../test/fixtures';

describe('exportExpenses', () => {
  it('limits current year to today', () => {
    const range = yearExpenseDateRange('2026', new Date('2026-08-10'));
    expect(range).toEqual({ from: '2026-01-01', to: '2026-08-10' });
  });

  it('exports full past year', () => {
    const range = yearExpenseDateRange('2025', new Date('2026-08-10'));
    expect(range).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });

  it('collects expenses within date range only', () => {
    const months = [
      month({ id: 'm1', yearMonth: '2026-01', sortOrder: 1 }),
      month({ id: 'm2', yearMonth: '2026-08', sortOrder: 2 }),
      month({ id: 'm3', yearMonth: '2026-12', sortOrder: 3 }),
    ];
    const transactions = [
      tx({ id: '1', monthId: 'm1', txDate: '2026-01-15', expenseName: 'A', expenseAmount: 100 }),
      tx({ id: '2', monthId: 'm2', txDate: '2026-08-05', expenseName: 'B', expenseAmount: 200 }),
      tx({ id: '3', monthId: 'm3', txDate: '2026-12-01', expenseName: 'C', expenseAmount: 300 }),
      tx({
        id: '4',
        monthId: 'm2',
        txDate: '2026-08-05',
        operationKind: 'transfer',
        expenseName: 'Перевод',
        expenseAmount: 50,
        targetAccountId: 'shared_card',
      }),
    ];
    const result = collectYearExpenses(transactions, months, '2026', {
      today: new Date('2026-08-10'),
    });
    expect(result.map((t) => t.id)).toEqual(['1', '2']);
  });
});
