import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import {
  useBudgetStore,
  useCurrentMonthSummary,
  useSummaries,
} from '../../store/budgetStore';
import {
  creditDebtAmount,
  formatMoney,
  getAllAccountsSummary,
  getPreviousMonthSummary,
  getRecentTransactions,
  getTotalAccountsBalance,
  getTransactionsWithoutAccount,
  getUncategorizedTransactions,
  percentChange,
} from '../../utils/budget';
import { getActiveCreditAccounts } from '../../utils/accounts';
import { useMonthCategorySummaries } from '../../store/selectors';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { AccountIcon } from '../shared/AccountIcon';
import { QuickTransactionForm } from '../ledger/QuickTransactionForm';
import { CategorySummary } from '../ledger/CategorySummary';
import { CategoryIcon } from '../shared/CategoryIcon';
import { CreditCardCard } from '../shared/CreditCardCard';
import { CreditReconcileModal } from '../ledger/CreditReconcileModal';
import { TransactionAmount } from '../shared/TransactionAmount';
import { DeltaAmount, MoneyAmount } from '../shared/MoneyAmount';
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
                  <div className="mt-2 min-w-0">
                    <MoneyAmount value={s.closingBalance} size="lg" />
                  </div>
                  <div className="text-xs text-[var(--app-text-muted)]">
                    расходы <MoneyAmount value={s.expenses} size="inline" className="inline" />
                  </div>
                </Card>
              </Link>
            );
          })}
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

export function MonthCategoriesWidget({ className = '' }: { className?: string }) {
  const current = useCurrentMonthSummary();
  const items = useMonthCategorySummaries(current?.monthId ?? '');

  if (!current) return null;

  return (
    <Card className={`flex h-full flex-col ${className}`.trim()}>
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

export function QuickEntryWidget({ className = '' }: { className?: string }) {
  const current = useCurrentMonthSummary();
  if (!current) return null;
  return (
    <Card className={`flex h-full flex-col ${className}`.trim()}>
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
      {!recent.length ? (
        <EmptyState
          icon={Inbox}
          title="Пока пусто"
          description="Добавьте первую операцию — кнопка + внизу справа"
          actionLabel="Открыть журнал"
          actionTo="/ledger"
          compact
        />
      ) : (
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
        </ul>
      )}
    </Card>
  );
}

export function AttentionBlock({ className = '' }: { className?: string }) {
  const transactions = useBudgetStore((s) => s.transactions);
  const months = useBudgetStore((s) => s.months);
  const accounts = useBudgetStore((s) => s.accounts);
  const current = useCurrentMonthSummary();
  const summaries = useSummaries();
  const categoryItems = useMonthCategorySummaries(current?.monthId ?? '');

  const prevSummary = useMemo(
    () => (current ? getPreviousMonthSummary(summaries, current.monthId) : undefined),
    [summaries, current],
  );

  const totalBalance = useMemo(() => {
    if (!current) return 0;
    return getTotalAccountsBalance(transactions, months, current.monthId, accounts);
  }, [transactions, months, accounts, current]);

  const expenseChange = prevSummary ? percentChange(current?.expenses ?? 0, prevSummary.expenses) : null;

  const tightestLimit = useMemo(() => {
    const withLimits = categoryItems.filter((c) => c.monthlyLimit != null && c.monthlyLimit > 0);
    if (!withLimits.length) return null;
    return [...withLimits].sort(
      (a, b) => a.monthlyLimit! - a.amount - (b.monthlyLimit! - b.amount),
    )[0];
  }, [categoryItems]);

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
    const limitRemaining =
      tightestLimit && tightestLimit.monthlyLimit != null
        ? tightestLimit.monthlyLimit - tightestLimit.amount
        : null;

    return (
      <Card variant="success" className={`dashboard-attention-ok flex h-full min-w-0 flex-col justify-center ${className}`.trim()}>
        <h2 className="font-semibold">Всё в порядке</h2>
        {current ? (
          <ul className="mt-2 space-y-2 text-sm">
            <li className="dashboard-stat-row">
              <span className="text-[var(--app-text-muted)]">На счетах</span>
              <MoneyAmount value={totalBalance} size="md" className="dashboard-stat-value" />
            </li>
            <li className="dashboard-stat-row dashboard-stat-row--stack">
              <span className="text-[var(--app-text-muted)]">Месяц</span>
              <div className="dashboard-stat-value min-w-0 space-y-0.5">
                <div>
                  <span className="text-[var(--app-text-muted)]">расходы </span>
                  <MoneyAmount value={current.expenses} size="sm" tone="danger" className="inline" />
                </div>
                {current.delta !== 0 && (
                  <div>
                    <span className="text-[var(--app-text-muted)]">Δ </span>
                    <DeltaAmount value={current.delta} size="sm" className="inline" />
                  </div>
                )}
              </div>
            </li>
            {expenseChange != null && (
              <li className="dashboard-stat-row">
                <span className="text-[var(--app-text-muted)]">К прошл. мес.</span>
                <span
                  className={`dashboard-stat-value text-right text-sm font-medium ${
                    expenseChange > 0 ? 'text-[var(--app-danger)]' : 'text-[var(--app-success)]'
                  }`}
                >
                  {expenseChange > 0 ? '+' : ''}
                  {expenseChange.toFixed(0)}% расходов
                </span>
              </li>
            )}
            {limitRemaining != null && (
              <li className="dashboard-stat-row dashboard-stat-row--stack">
                <span className="text-[var(--app-text-muted)]">«{tightestLimit!.name}»</span>
                <div className="dashboard-stat-value min-w-0">
                  <span className="text-[var(--app-text-muted)]">осталось </span>
                  <MoneyAmount
                    value={limitRemaining}
                    size="sm"
                    tone={limitRemaining < 0 ? 'danger' : 'default'}
                    className="inline"
                  />
                </div>
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">Нет срочных замечаний</p>
        )}
      </Card>
    );
  }

  return (
    <Card variant="danger" className={`flex h-full flex-col justify-center ${className}`.trim()}>
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
