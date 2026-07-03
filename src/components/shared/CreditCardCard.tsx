import { useMemo } from 'react';
import type { Account, AccountMonthSummary } from '../../types';
import {
  creditDebtAmount,
  formatMoney,
  getCreditCardSummary,
} from '../../utils/budget';
import { useBudgetStore } from '../../store/budgetStore';
import { Card } from '../ui/Card';
import { ProgressBar } from './ProgressBar';

interface CreditCardCardProps {
  summary: AccountMonthSummary;
  account: Account;
  monthId: string;
  compact?: boolean;
  variant?: 'default' | 'neutral';
  onReconcile?: () => void;
  reconcileDisabled?: boolean;
}

export function CreditCardCard({
  summary,
  account,
  monthId,
  compact = false,
  variant = 'default',
  onReconcile,
  reconcileDisabled = false,
}: CreditCardCardProps) {
  const transactions = useBudgetStore((s) => s.transactions);

  const limit = account.creditLimit ?? summary.creditLimit ?? 0;
  const available = summary.closingAvailable ?? summary.closingBalance + limit;
  const debt = creditDebtAmount(summary);

  const monthBreakdown = useMemo(
    () => getCreditCardSummary(transactions, monthId, account.id),
    [transactions, monthId, account.id],
  );

  const usagePct = limit > 0 ? debt / limit : 0;
  const progressStatus =
    usagePct >= 0.8 ? 'danger' : usagePct >= 0.5 ? 'warning' : 'ok';

  return (
    <Card variant={variant}>
      <div className="text-xs font-medium uppercase text-[var(--app-text-muted)]">
        {account.name}
      </div>
      <div className={`mt-1 font-bold ${compact ? 'text-lg' : 'text-xl'}`}>
        долг {formatMoney(debt)}
      </div>
      <div className="text-xs text-[var(--app-text-muted)]">
        доступно {formatMoney(available)}
        {limit > 0 && ` · лимит ${formatMoney(limit)}`}
      </div>
      {limit > 0 && (
        <div className="mt-2">
          <ProgressBar value={debt} max={limit} status={progressStatus} />
        </div>
      )}
      {!compact && (
        <div className="mt-2 space-y-0.5 text-xs text-[var(--app-text-muted)]">
          <div className="flex justify-between gap-2">
            <span>Траты за месяц</span>
            <span className="text-[var(--app-text)]">{formatMoney(monthBreakdown.spending)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Платежи</span>
            <span className="text-[var(--app-success)]">{formatMoney(monthBreakdown.payments)}</span>
          </div>
          {monthBreakdown.refunds > 0 && (
            <div className="flex justify-between gap-2">
              <span>Возвраты</span>
              <span className="text-[var(--app-success)]">{formatMoney(monthBreakdown.refunds)}</span>
            </div>
          )}
        </div>
      )}
      {onReconcile && (
        <button
          type="button"
          disabled={reconcileDisabled}
          className="mt-2 text-xs text-[var(--app-primary)] underline disabled:opacity-50"
          onClick={onReconcile}
        >
          Сверка с банком
        </button>
      )}
    </Card>
  );
}
