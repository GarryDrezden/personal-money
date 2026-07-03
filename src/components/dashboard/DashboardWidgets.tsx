import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  useBudgetStore,
  useCurrentMonthSummary,
} from '../../store/budgetStore';
import {
  creditDebtAmount,
  formatMoney,
  getAllAccountsSummary,
  getRecentTransactions,
  getTransactionsWithoutAccount,
  getUncategorizedTransactions,
} from '../../utils/budget';
import { getActiveCreditAccounts } from '../../utils/accounts';
import { Card } from '../ui/Card';
import { AccountIcon } from '../shared/AccountIcon';
import { QuickTransactionForm } from '../ledger/QuickTransactionForm';
import { CategorySummary } from '../ledger/CategorySummary';
import { CategoryIcon } from '../shared/CategoryIcon';
import { CreditCardCard } from '../shared/CreditCardCard';
import { CreditReconcileModal } from '../ledger/CreditReconcileModal';
import { TransactionAmount } from '../shared/TransactionAmount';
import { useMonthCategorySummaries } from '../../store/selectors';
import type { AccountMonthSummary } from '../../types';

export interface AttentionIssue {
  id: string;
  label: string;
  to: string;
}

function buildLedgerLink(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `/ledger${qs ? `?${qs}` : ''}`;
}

export function AccountCards() {
  const months = useBudgetStore((s) => s.months);
  const transactions = useBudgetStore((s) => s.transactions);
  const accounts = useBudgetStore((s) => s.accounts);
  const current = useCurrentMonthSummary();
  const [reconcileSummary, setReconcileSummary] = useState<AccountMonthSummary | null>(null);

  const summaries = useMemo(() => {
    if (!current) return [];
    return getAllAccountsSummary(transactions, months, current.monthId, accounts);
  }, [transactions, months, accounts, current]);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  if (!current || !summaries.length) return null;

  return (
    <>
      <div>
        <div className="mb-3">
          <h2 className="font-semibold">Карты и счета</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaries.map((s) => {
            const acc = accountMap.get(s.accountId);
            const isCredit = acc?.type === 'credit';
            const ledgerLink = buildLedgerLink({
              month: current.monthId,
              accountId: s.accountId,
            });

            if (isCredit && acc) {
              return (
                <CreditCardCard
                  key={s.accountId}
                  summary={s}
                  account={acc}
                  monthId={current.monthId}
                  compact
                  onReconcile={() => setReconcileSummary(s)}
                />
              );
            }

            return (
              <Link key={s.accountId} to={ledgerLink} className="block transition-opacity hover:opacity-90">
                <Card className="h-full">
                  <div className="flex items-center gap-2">
                    <AccountIcon icon={acc?.icon} accountColor={acc?.color} size={16} />
                    <div className="min-w-0 text-xs font-medium uppercase text-[var(--app-text-muted)] truncate">
                      {acc?.name}
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-bold tabular-nums">{formatMoney(s.closingBalance)}</div>
                  <div className="text-xs text-[var(--app-text-muted)]">
                    расходы {formatMoney(s.expenses)}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {reconcileSummary && (
        <CreditReconcileModal
          monthId={current.monthId}
          summary={reconcileSummary}
          onClose={() => setReconcileSummary(null)}
        />
      )}
    </>
  );
}

export function MonthCategoriesWidget() {
  const current = useCurrentMonthSummary();
  const items = useMonthCategorySummaries(current?.monthId ?? '');

  if (!current) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Категории за месяц</h2>
        <Link to="/ledger" className="text-sm text-[var(--app-primary)]">
          Журнал →
        </Link>
      </div>
      <CategorySummary items={items} />
    </Card>
  );
}

export function QuickEntryWidget() {
  const current = useCurrentMonthSummary();
  if (!current) return null;
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Быстрый ввод</h2>
      <QuickTransactionForm monthId={current.monthId} compact />
    </Card>
  );
}

export function RecentTransactions() {
  const transactions = useBudgetStore((s) => s.transactions);
  const recent = useMemo(() => getRecentTransactions(transactions, 10), [transactions]);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Последние операции</h2>
        <Link to="/ledger" className="text-sm text-[var(--app-primary)]">
          Журнал →
        </Link>
      </div>
      <ul className="space-y-2 text-sm">
        {recent.map((tx) => (
          <li
            key={tx.id}
            className="flex justify-between gap-2 border-b border-[var(--app-border)] pb-2 last:border-0"
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              {tx.categoryId ? <CategoryIcon categoryId={tx.categoryId} size={14} /> : null}
              <span className="truncate">
                {tx.txDate ?? '—'} · {tx.expenseName ?? tx.incomeSource ?? '—'}
              </span>
            </span>
            <TransactionAmount tx={tx} />
          </li>
        ))}
        {!recent.length && (
          <li className="text-[var(--app-text-muted)]">Нет операций</li>
        )}
      </ul>
    </Card>
  );
}

export function AttentionBlock() {
  const transactions = useBudgetStore((s) => s.transactions);
  const months = useBudgetStore((s) => s.months);
  const accounts = useBudgetStore((s) => s.accounts);
  const current = useCurrentMonthSummary();

  const issues = useMemo((): AttentionIssue[] => {
    const list: AttentionIssue[] = [];
    const uncategorized = getUncategorizedTransactions(transactions).length;
    const noAccount = getTransactionsWithoutAccount(transactions).length;
    const monthParam: Record<string, string> = current ? { month: current.monthId } : {};

    if (uncategorized > 0) {
      list.push({
        id: 'noCategory',
        label: `${uncategorized} без категории → разобрать`,
        to: buildLedgerLink({ noCategory: '1', ...monthParam }),
      });
    }
    if (noAccount > 0) {
      list.push({
        id: 'noAccount',
        label: `${noAccount} без счёта → назначить`,
        to: buildLedgerLink({ noAccount: '1', ...monthParam }),
      });
    }

    if (current) {
      const accountSummaries = getAllAccountsSummary(
        transactions,
        months,
        current.monthId,
        accounts,
      );
      for (const creditAccount of getActiveCreditAccounts(accounts)) {
        const credit = accountSummaries.find((s) => s.accountId === creditAccount.id);
        if (!credit) continue;
        const debt = creditDebtAmount(credit);
        const limit = credit.creditLimit ?? creditAccount.creditLimit ?? 0;
        const threshold = limit > 0 ? Math.max(50_000, limit * 0.3) : 100_000;
        if (debt > threshold) {
          list.push({
            id: `creditDebt-${creditAccount.id}`,
            label: `${creditAccount.name}: долг ${formatMoney(debt)}`,
            to: buildLedgerLink({ month: current.monthId, accountId: creditAccount.id }),
          });
        }
      }
    }

    return list;
  }, [transactions, months, accounts, current]);

  if (!issues.length) {
    return (
      <Card variant="success">
        <h2 className="font-semibold">Всё в порядке</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">Нет срочных замечаний</p>
      </Card>
    );
  }

  return (
    <Card variant="danger">
      <h2 className="font-semibold">Требует внимания</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {issues.map((issue) => (
          <li key={issue.id}>
            <Link
              to={issue.to}
              className="text-[var(--app-primary)] underline hover:no-underline"
            >
              {issue.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
