import { useMemo } from 'react';
import { useBudgetStore } from './budgetStore';
import {
  getAllAccountsSummary,
  getCategoryMonthSummary,
  getCreditCardSummary,
  getMonthSummary,
} from '../utils/budget';

export function useMonthAccountSummaries(monthId: string) {
  const transactions = useBudgetStore((s) => s.transactions);
  const months = useBudgetStore((s) => s.months);
  const accounts = useBudgetStore((s) => s.accounts);
  return useMemo(
    () => getAllAccountsSummary(transactions, months, monthId, accounts),
    [transactions, months, monthId, accounts],
  );
}

export function useMonthCategorySummaries(monthId: string) {
  const transactions = useBudgetStore((s) => s.transactions);
  const categories = useBudgetStore((s) => s.categories);
  const categoryTotals = useBudgetStore((s) => s.categoryTotals);
  const months = useBudgetStore((s) => s.months);
  const accounts = useBudgetStore((s) => s.accounts);
  const initialOpeningBalance = useBudgetStore((s) => s.settings.initialOpeningBalance);

  return useMemo(() => {
    if (!monthId) return [];
    const summary = getMonthSummary(
      months,
      transactions,
      monthId,
      initialOpeningBalance,
      accounts,
    );
    return getCategoryMonthSummary(
      transactions,
      monthId,
      categories,
      categoryTotals,
      summary?.expenses ?? 0,
      months,
    );
  }, [transactions, months, monthId, categories, categoryTotals, initialOpeningBalance, accounts]);
}

export function useMonthCreditCardSummary(monthId: string) {
  const transactions = useBudgetStore((s) => s.transactions);
  return useMemo(() => getCreditCardSummary(transactions, monthId), [transactions, monthId]);
}
