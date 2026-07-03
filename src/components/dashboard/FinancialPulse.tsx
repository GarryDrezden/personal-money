import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import {
  useBudgetStore,
  useCurrentMonthSummary,
  useSummaries,
} from '../../store/budgetStore';
import {
  creditDebtAmount,
  formatDelta,
  formatMoney,
  getAllAccountsSummary,
  getPreviousMonthSummary,
  getTotalAccountsBalance,
  percentChange,
} from '../../utils/budget';
import { formatYearMonth } from '../../constants/categories';
import { Card } from '../ui/Card';

export function FinancialPulse() {
  const summaries = useSummaries();
  const current = useCurrentMonthSummary();
  const transactions = useBudgetStore((s) => s.transactions);
  const months = useBudgetStore((s) => s.months);
  const accounts = useBudgetStore((s) => s.accounts);

  const prevSummary = useMemo(
    () => (current ? getPreviousMonthSummary(summaries, current.monthId) : undefined),
    [summaries, current],
  );

  const totalBalance = useMemo(() => {
    if (!current) return 0;
    return getTotalAccountsBalance(transactions, months, current.monthId, accounts);
  }, [transactions, months, accounts, current]);

  const creditInfo = useMemo(() => {
    if (!current) return null;
    const creditAccount = accounts.find((a) => a.type === 'credit' && a.isActive && a.status !== 'closed');
    if (!creditAccount) return null;
    const summary = getAllAccountsSummary(transactions, months, current.monthId, accounts).find(
      (s) => s.accountId === creditAccount.id,
    );
    if (!summary) return null;
    const debt = creditDebtAmount(summary);
    const limit = summary.creditLimit ?? 0;
    const available = summary.closingAvailable ?? Math.max(0, limit - debt);
    return { account: creditAccount, debt, available, limit };
  }, [transactions, months, accounts, current]);

  if (!current) return null;

  const expenseChange = percentChange(current.expenses, prevSummary?.expenses ?? 0);
  const monthLabel = formatYearMonth(current.yearMonth);
  const balance = current.importedBalance ?? current.computedBalance ?? 0;

  return (
    <Card className="!p-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:border-r lg:border-[var(--app-border)] lg:pr-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
            <Wallet size={14} className="text-[var(--app-primary)]" />
            Свободно на счетах
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
            {formatMoney(totalBalance)}
          </div>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
            дебетовые карты · на конец {monthLabel.toLowerCase()}
          </p>
        </div>

        <div className="lg:border-r lg:border-[var(--app-border)] lg:pr-5">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
            {monthLabel}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[var(--app-text-muted)]">Расходы</div>
              <div className="text-xl font-bold tabular-nums text-[var(--app-danger)]">
                {formatMoney(current.expenses)}
              </div>
              {expenseChange != null && (
                <div
                  className={`mt-0.5 flex items-center gap-0.5 text-xs ${
                    expenseChange > 0 ? 'text-[var(--app-danger)]' : 'text-[var(--app-success)]'
                  }`}
                >
                  {expenseChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {expenseChange > 0 ? '+' : ''}
                  {expenseChange.toFixed(0)}% к прошл. мес.
                </div>
              )}
            </div>
            <div>
              <div className="text-[var(--app-text-muted)]">Доходы</div>
              <div className="text-xl font-bold tabular-nums text-[var(--app-success)]">
                {formatMoney(current.income)}
              </div>
              <div
                className={`mt-0.5 text-xs font-medium ${
                  current.delta >= 0 ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'
                }`}
              >
                Δ {formatDelta(current.delta)}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--app-text-muted)]">
            Накопления: {formatMoney(balance)}
          </p>
        </div>

        <div>
          {creditInfo ? (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                {creditInfo.account.name}
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums">
                Долг {formatMoney(creditInfo.debt)}
              </div>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                Доступно{' '}
                <span className="font-medium text-[var(--app-text)]">
                  {formatMoney(creditInfo.available)}
                </span>
                {creditInfo.limit > 0 && (
                  <span> · лимит {formatMoney(creditInfo.limit)}</span>
                )}
              </p>
              {creditInfo.limit > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
                  <div
                    className="h-full rounded-full bg-[var(--app-warning)]"
                    style={{
                      width: `${Math.min(100, (creditInfo.debt / creditInfo.limit) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                Кредитные счета
              </div>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                Нет активной кредитки.{' '}
                <Link to="/settings" className="text-[var(--app-primary)] hover:underline">
                  Добавить
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
