import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSummaries, useBudgetStore, useCurrentMonthSummary } from '../store/budgetStore';
import { formatDelta, formatMoney, topExpenseNames, yearTotals } from '../utils/budget';
import { formatYearMonth } from '../constants/categories';
import { StatTile } from '../components/ui/StatTile';
import {
  AccountCards,
  AttentionBlock,
  MonthCategoriesWidget,
  QuickEntryWidget,
  RecentTransactions,
} from '../components/dashboard/DashboardWidgets';

export function DashboardPage() {
  const transactions = useBudgetStore((s) => s.transactions);
  const summaries = useSummaries();
  const current = useCurrentMonthSummary();
  const year = new Date().getFullYear();
  const yearSummary = yearTotals(summaries, year);

  const topExpensesYear = useMemo(() => {
    const monthYear = new Map(summaries.map((s) => [s.monthId, s.yearMonth]));
    const yearTx = transactions.filter((t) =>
      (monthYear.get(t.monthId) ?? '').startsWith(String(year)),
    );
    return topExpenseNames(yearTx, 5);
  }, [transactions, summaries, year]);

  if (!summaries.length) {
    return (
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-4">
        <h1 className="text-2xl font-bold">Личный бюджет</h1>
        <p className="mt-2 text-[var(--app-text-muted)]">
          Данные не импортированы. Перейдите в{' '}
          <Link to="/settings" className="text-[var(--app-primary)] underline">
            Настройки
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Главная</h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          {current ? formatYearMonth(current.yearMonth) : ''} · ежедневный учёт
        </p>
      </div>

      <AttentionBlock />
      <AccountCards />
      <QuickEntryWidget />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Расходы (месяц)" value={formatMoney(current?.expenses ?? 0)} />
        <StatTile label="Доходы (месяц)" value={formatMoney(current?.income ?? 0)} />
        <StatTile
          label="Дельта (месяц)"
          value={formatDelta(current?.delta ?? 0)}
          tone={(current?.delta ?? 0) >= 0 ? 'positive' : 'negative'}
          sub={`баланс ${formatMoney(current?.importedBalance ?? current?.computedBalance ?? 0)}`}
        />
      </div>

      <MonthCategoriesWidget />

      <RecentTransactions />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label={`Расходы ${year}`} value={formatMoney(yearSummary.expenses)} />
        <StatTile label={`Доходы ${year}`} value={formatMoney(yearSummary.income)} />
        <StatTile label={`Дельта ${year}`} value={formatDelta(yearSummary.delta)} tone={yearSummary.delta >= 0 ? 'positive' : 'negative'} />
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-4">
        <h2 className="mb-3 font-semibold">Топ-5 расходов за {year}</h2>
        <ul className="space-y-2 text-sm">
          {topExpensesYear.map((item) => (
            <li key={item.name} className="flex justify-between gap-2">
              <span>{item.name}</span>
              <span className="font-medium">{formatMoney(item.total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
