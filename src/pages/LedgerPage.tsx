import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { LedgerFilters as LedgerFiltersState } from '../types';
import { DEFAULT_LEDGER_FILTERS } from '../types';
import { useSummaries, useBudgetStore } from '../store/budgetStore';
import { MonthAccordion } from '../components/ledger/MonthAccordion';
import { QuickTransactionForm } from '../components/ledger/QuickTransactionForm';
import { LedgerFilters } from '../components/ledger/LedgerFilters';
import { LedgerFilterChips } from '../components/ledger/LedgerFilterChips';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

export function LedgerPage() {
  const months = useBudgetStore((s) => s.months);
  const expandedMonthId = useBudgetStore((s) => s.expandedMonthId);
  const setLedgerFilters = useBudgetStore((s) => s.setLedgerFilters);
  const setCollapsed = useBudgetStore((s) => s.setCollapsed);
  const summaries = useSummaries();
  const [searchParams, setSearchParams] = useSearchParams();

  const reversedSummaries = useMemo(() => [...summaries].reverse(), [summaries]);
  const activeMonthId = expandedMonthId ?? reversedSummaries[0]?.monthId;

  useEffect(() => {
    if (!months.length) return;

    const hasParams =
      searchParams.has('noCategory') ||
      searchParams.has('noAccount') ||
      searchParams.has('month') ||
      searchParams.has('accountId') ||
      searchParams.has('categoryId') ||
      searchParams.has('incomeCategoryId') ||
      searchParams.has('incomeOnly') ||
      searchParams.has('search');

    if (!hasParams) return;

    const patch: Partial<LedgerFiltersState> = { ...DEFAULT_LEDGER_FILTERS };

    if (searchParams.get('noCategory') === '1') patch.noCategory = true;
    if (searchParams.get('noAccount') === '1') patch.noAccount = true;
    if (searchParams.get('incomeOnly') === '1') {
      patch.incomeOnly = true;
      patch.operationType = 'income';
    }
    if (searchParams.get('accountId')) patch.accountId = searchParams.get('accountId')!;
    if (searchParams.get('categoryId')) patch.categoryId = searchParams.get('categoryId')!;
    if (searchParams.get('incomeCategoryId')) {
      patch.incomeCategoryId = searchParams.get('incomeCategoryId')!;
      patch.incomeOnly = true;
      patch.operationType = 'income';
    }
    if (searchParams.get('search')) patch.search = searchParams.get('search')!;

    setLedgerFilters(patch);

    const monthId = searchParams.get('month');
    if (monthId && months.some((m) => m.id === monthId)) {
      setCollapsed(monthId, false);
    } else if (!monthId && (patch.noCategory || patch.noAccount)) {
      const ym = new Date();
      const currentYm = `${ym.getFullYear()}-${String(ym.getMonth() + 1).padStart(2, '0')}`;
      const current = months.find((m) => m.yearMonth === currentYm);
      if (current) setCollapsed(current.id, false);
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, months, setLedgerFilters, setCollapsed, setSearchParams]);

  if (!months.length) {
    return (
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-4">
        <h1 className="text-2xl font-bold">Журнал</h1>
        <p className="mt-2 text-[var(--app-text-muted)]">
          Нет данных.{' '}
          <Link to="/settings" className="text-[var(--app-primary)] underline">
            Импортируйте бюджет
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary title="Ошибка в журнале">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Журнал</h1>
          <p className="text-sm text-[var(--app-text-muted)]">
            {months.length} месяцев · быстрый ввод и фильтры
          </p>
        </div>

        {activeMonthId && <QuickTransactionForm monthId={activeMonthId} />}
        <LedgerFilters />
        <LedgerFilterChips />

        <div className="space-y-2">
          {reversedSummaries.map((summary) => (
            <MonthAccordion key={summary.monthId} monthId={summary.monthId} summary={summary} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
