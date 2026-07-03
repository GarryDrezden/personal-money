import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import {
  AccountCards,
  AttentionBlock,
  MonthCategoriesWidget,
  QuickEntryWidget,
  RecentTransactions,
} from '../components/dashboard/DashboardWidgets';
import { FinancialPulse } from '../components/dashboard/FinancialPulse';
import { YearOverview } from '../components/dashboard/YearOverview';
import { useSummaries, useCurrentMonthSummary } from '../store/budgetStore';
import { formatYearMonth } from '../constants/categories';

export function DashboardPage() {
  const summaries = useSummaries();
  const current = useCurrentMonthSummary();

  if (!summaries.length) {
    return (
      <div className="surface-panel">
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
      <div className="ledger-top-grid">
        <PageHeader
          className="h-full"
          title="Главная"
          subtitle={`${current ? formatYearMonth(current.yearMonth) : ''} · ежедневный учёт`}
        />
        <AttentionBlock className="h-full" />
      </div>

      <FinancialPulse />
      <AccountCards />
      <div className="ledger-top-grid">
        <QuickEntryWidget />
        <MonthCategoriesWidget />
      </div>
      <RecentTransactions />
      <YearOverview />
    </div>
  );
}
