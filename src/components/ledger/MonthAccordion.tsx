import { memo, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MonthSummary } from '../../types';
import {
  categoryTotalsForMonth,
  filterTransactions,
  formatDelta,
  formatMoney,
  getAllAccountsSummary,
  parseMoneyInput,
} from '../../utils/budget';
import { useBudgetStore, useMonthTransactions } from '../../store/budgetStore';
import { LEGACY_EXCEL_CATEGORIES, showExcelArchiveInLedger } from '../../constants/categories';
import { CategoryLabel } from '../shared/CategoryIcon';
import { AccountSummary } from './AccountSummary';
import { BulkAssignModal } from './BulkAssignModal';
import { LedgerMonthPanel } from './LedgerMonthPanel';
import { TransactionTable } from './TransactionTable';

interface MonthAccordionProps {
  monthId: string;
  summary: MonthSummary;
}

function MonthAccordionBody({ monthId, summary }: MonthAccordionProps) {
  const transactions = useMonthTransactions(monthId);
  const allTransactions = useBudgetStore((s) => s.transactions);
  const months = useBudgetStore((s) => s.months);
  const accounts = useBudgetStore((s) => s.accounts);
  const categoryTotals = useBudgetStore((s) => s.categoryTotals);
  const ledgerFilters = useBudgetStore((s) => s.ledgerFilters);
  const categories = useBudgetStore((s) => s.categories);
  const saveCategoryTotals = useBudgetStore((s) => s.saveCategoryTotals);
  const createQuickTransaction = useBudgetStore((s) => s.createQuickTransaction);

  const [showBulk, setShowBulk] = useState(false);
  const [catDraft, setCatDraft] = useState<Record<string, string>>({});

  const monthCategories = useMemo(
    () => categoryTotalsForMonth(categoryTotals, monthId),
    [categoryTotals, monthId],
  );

  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const filteredTx = useMemo(
    () => filterTransactions(transactions, { ...ledgerFilters, categoryNames }),
    [transactions, ledgerFilters, categoryNames],
  );

  const accountSummaries = useMemo(
    () => getAllAccountsSummary(allTransactions, months, monthId, accounts),
    [allTransactions, months, monthId, accounts],
  );

  const balance = summary.importedBalance ?? summary.computedBalance;
  const showExcelArchive = showExcelArchiveInLedger(summary.yearMonth);

  const saveCategories = () => {
    const totals = LEGACY_EXCEL_CATEGORIES.map((category) => ({
      category,
      amount: parseMoneyInput(catDraft[category] ?? '') ?? 0,
    })).filter((t) => t.amount !== 0);
    void saveCategoryTotals(monthId, totals);
  };

  return (
    <div className="border-t border-[var(--app-border)] p-3 space-y-4">
      <AccountSummary monthId={monthId} summaries={accountSummaries} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm"
          onClick={() => setShowBulk(true)}
        >
          Массовое назначение
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm"
          onClick={() =>
            void createQuickTransaction(monthId, {
              operationKind: 'correction',
              accountId: 'main_card',
              txDate: new Date().toISOString().slice(0, 10),
              expenseName: 'Коррекция',
              expenseAmount: 0,
              paymentStatus: 'done',
            })
          }
        >
          Корректировка баланса
        </button>
      </div>

      <TransactionTable transactions={filteredTx} />

      <div className="rounded-lg border border-dashed border-[var(--app-border)] p-3 text-sm">
        <div className="font-semibold">
          Итого: расходы {formatMoney(summary.expenses)} · доходы {formatMoney(summary.income)} · Δ{' '}
          <span
            className={
              summary.delta >= 0 ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'
            }
          >
            {formatDelta(summary.delta)}
          </span>{' '}
          · баланс {formatMoney(balance)}
        </div>
      </div>

      {showExcelArchive && (
        <div className="rounded-lg border border-[var(--app-border)] p-3">
          <h4 className="mb-2 text-sm font-semibold">Итоги из Excel (архив)</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LEGACY_EXCEL_CATEGORIES.map((cat) => {
              const found = monthCategories.find((c) => c.category === cat);
              return (
                <label key={cat} className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
                  <CategoryLabel legacyName={cat} iconSize={14} />
                  <input
                    className="money-input"
                    defaultValue={found?.amount ? String(found.amount) : ''}
                    onChange={(e) => setCatDraft((prev) => ({ ...prev, [cat]: e.target.value }))}
                    onBlur={saveCategories}
                    inputMode="decimal"
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      {showBulk && (
        <BulkAssignModal
          monthId={monthId}
          transactions={allTransactions}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
}

export const MonthAccordion = memo(function MonthAccordion({
  monthId,
  summary,
}: MonthAccordionProps) {
  const collapsed = useBudgetStore((s) => s.collapsed[monthId] ?? true);
  const setCollapsed = useBudgetStore((s) => s.setCollapsed);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)]">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--app-bg-soft)]"
        onClick={() => setCollapsed(monthId, !collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="shrink-0 text-[var(--app-primary)]" size={20} />
        ) : (
          <ChevronDown className="shrink-0 text-[var(--app-primary)]" size={20} />
        )}
        <LedgerMonthPanel summary={summary} />
      </button>

      {!collapsed && <MonthAccordionBody monthId={monthId} summary={summary} />}
    </div>
  );
});
