import { describe, expect, it } from 'vitest';
import { collectYearExpenses, expensesToCsv, yearExpenseDateRange } from './exportExpenses';
import { MAIN_ACCOUNT, month, tx } from '../test/fixtures';
import type { Category } from '../types';

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

  it('adds empty receipt columns when there is no receipt', () => {
    const csv = expensesToCsv(
      [
        tx({
          id: '1',
          monthId: 'm1',
          txDate: '2026-01-15',
          expenseName: 'Кофе',
          expenseAmount: 150,
          categoryId: 'food',
        }),
      ],
      [month({ id: 'm1', yearMonth: '2026-01' })],
      [MAIN_ACCOUNT],
      [FOOD],
    );
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines[0]).toBe(
      'Дата;Название;Сумма;Категория;Счёт;Заметка;Магазин;Позиции чека;Итого чека;Текст чека',
    );
    expect(lines[1]).toBe('2026-01-15;Кофе;150;Еда;Основная карта;;;;;');
  });

  it('exports parsed receipt store, items, total and raw text', () => {
    const receipt = [
      'Глобус',
      'Молоко — 100,00 ₽',
      'Молоко — 50,00 ₽',
      'Хлеб — 80,00 руб.',
      'Итого 230,00',
    ].join('\n');
    const csv = expensesToCsv(
      [
        tx({
          id: '1',
          monthId: 'm1',
          txDate: '2026-10-04',
          expenseName: 'Глобус',
          expenseAmount: 230,
          categoryId: 'food',
          receiptText: receipt,
        }),
      ],
      [month({ id: 'm1', yearMonth: '2026-10' })],
      [MAIN_ACCOUNT],
      [FOOD],
    );
    const row = csv.replace(/^\uFEFF/, '').split('\r\n')[1];
    expect(row).toContain('Глобус');
    expect(row).toContain('Молоко ×2 — 150,00');
    expect(row).toContain('Хлеб — 80,00');
    expect(row).toContain('230,00');
    expect(row).toContain('Итого 230,00');
  });
});
