import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useBudgetStore, useSummaries } from '../../store/budgetStore';
import { formatDelta, formatMoney, topExpenseNames, yearTotals } from '../../utils/budget';
import { Card } from '../ui/Card';
import { StatTile } from '../ui/StatTile';

export function YearOverview() {
  const transactions = useBudgetStore((s) => s.transactions);
  const summaries = useSummaries();
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);

  const yearSummary = yearTotals(summaries, year);

  const topExpensesYear = useMemo(() => {
    const monthYear = new Map(summaries.map((s) => [s.monthId, s.yearMonth]));
    const yearTx = transactions.filter((t) =>
      (monthYear.get(t.monthId) ?? '').startsWith(String(year)),
    );
    return topExpenseNames(yearTx, 5);
  }, [transactions, summaries, year]);

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-[var(--app-bg-soft)]"
      >
        <div>
          <h2 className="font-semibold">Обзор {year}</h2>
          <p className="text-sm text-[var(--app-text-muted)]">
            Расходы {formatMoney(yearSummary.expenses)} · Δ {formatDelta(yearSummary.delta)}
          </p>
        </div>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-[var(--app-border)] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label={`Расходы ${year}`} value={formatMoney(yearSummary.expenses)} />
            <StatTile label={`Доходы ${year}`} value={formatMoney(yearSummary.income)} />
            <StatTile
              label={`Дельта ${year}`}
              value={formatDelta(yearSummary.delta)}
              tone={yearSummary.delta >= 0 ? 'positive' : 'negative'}
            />
          </div>
          {topExpensesYear.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Топ-5 расходов</h3>
              <ul className="space-y-2 text-sm">
                {topExpensesYear.map((item) => (
                  <li key={item.name} className="flex justify-between gap-2">
                    <span>{item.name}</span>
                    <span className="font-medium tabular-nums">{formatMoney(item.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
