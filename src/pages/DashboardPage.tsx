import { Wallet } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
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
      <EmptyState
        icon={Wallet}
        title="Бюджет ещё не настроен"
        description="Импортируйте Excel или пройдите быструю настройку в настройках"
        actionLabel="Перейти в настройки"
        actionTo="/settings"
      />
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
