import { useMemo, useState } from 'react';
import type { AccountMonthSummary } from '../../types';
import { formatMoney } from '../../utils/budget';
import { useBudgetStore } from '../../store/budgetStore';
import { Card } from '../ui/Card';
import { CreditCardCard } from '../shared/CreditCardCard';
import { CreditReconcileModal } from './CreditReconcileModal';

interface AccountSummaryProps {
  monthId: string;
  summaries: AccountMonthSummary[];
}

export function AccountSummary({ monthId, summaries }: AccountSummaryProps) {
  const accounts = useBudgetStore((s) => s.accounts);
  const [reconcileSummary, setReconcileSummary] = useState<AccountMonthSummary | null>(null);

  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((s) => {
          const acc = byId.get(s.accountId);
          const isCredit = acc?.type === 'credit';

          if (isCredit && acc) {
            return (
              <CreditCardCard
                key={s.accountId}
                summary={s}
                account={acc}
                monthId={monthId}
                variant="neutral"
                onReconcile={() => setReconcileSummary(s)}
              />
            );
          }

          return (
            <Card key={s.accountId} variant="neutral">
              <div className="text-xs font-medium uppercase text-[var(--app-text-muted)]">
                {acc?.name ?? s.accountId}
              </div>
              <div className="mt-1 text-lg font-bold">{formatMoney(s.closingBalance)}</div>
              <div className="text-xs text-[var(--app-text-muted)]">
                −{formatMoney(s.expenses)} +{formatMoney(s.income)}
                {(s.transfersIn > 0 || s.transfersOut > 0) &&
                  ` · ⇄ ${formatMoney(s.transfersIn - s.transfersOut)}`}
              </div>
            </Card>
          );
        })}
      </div>

      {reconcileSummary && (
        <CreditReconcileModal
          monthId={monthId}
          summary={reconcileSummary}
          onClose={() => setReconcileSummary(null)}
        />
      )}
    </>
  );
}
