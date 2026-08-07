import { describe, expect, it } from 'vitest';
import { suggestCategory, suggestCategoryFromHistory } from './categorize';
import { tx } from '../test/fixtures';

describe('suggestCategory', () => {
  it('prefers history over keyword rules', () => {
    const history = [
      tx({
        id: '1',
        monthId: 'm1',
        expenseName: 'Пятёрочка',
        expenseAmount: 500,
        categoryId: 'entertainment',
      }),
      tx({
        id: '2',
        monthId: 'm1',
        expenseName: 'Пятерочка',
        expenseAmount: 800,
        categoryId: 'entertainment',
      }),
    ];
    // Keyword rules map пятёрочка → food, but history says entertainment
    expect(suggestCategory('Пятерочка', history)).toBe('entertainment');
  });

  it('falls back to keyword rules when no history', () => {
    expect(suggestCategory('Пятерочка', [])).toBe('food');
  });

  it('matches history ignoring ё/е and punctuation', () => {
    const history = [
      tx({
        id: '1',
        monthId: 'm1',
        expenseName: 'Пятёрочка!',
        expenseAmount: 100,
        categoryId: 'food',
      }),
    ];
    expect(suggestCategoryFromHistory('пятерочка', history)).toBe('food');
  });

  it('picks most frequent category for the same title', () => {
    const history = [
      tx({ id: '1', monthId: 'm1', expenseName: 'Ozon', expenseAmount: 1, categoryId: 'marketplace' }),
      tx({ id: '2', monthId: 'm1', expenseName: 'Ozon', expenseAmount: 1, categoryId: 'marketplace' }),
      tx({ id: '3', monthId: 'm1', expenseName: 'Ozon', expenseAmount: 1, categoryId: 'other' }),
    ];
    expect(suggestCategoryFromHistory('ozon', history)).toBe('marketplace');
  });
});
