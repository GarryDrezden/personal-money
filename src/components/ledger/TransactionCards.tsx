import { memo, useCallback } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { Transaction } from '../../types';
import { accountName, parseMoneyInput } from '../../utils/budget';
import { useBudgetStore } from '../../store/budgetStore';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';
import { CategoryIcon } from '../shared/CategoryIcon';
import { TransactionAmount } from '../shared/TransactionAmount';
import { TX_KIND_LABELS, useDebouncedTransaction } from './useDebouncedTransaction';

const TransactionCard = memo(function TransactionCard({
  tx,
  onSave,
  onDelete,
  onDuplicate,
}: {
  tx: Transaction;
  onSave: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onDuplicate: (tx: Transaction) => void;
}) {
  const accounts = useBudgetStore((s) => s.accounts);
  const [draft, setDraft] = useDebouncedTransaction(tx, onSave);

  const title = draft.expenseName ?? draft.incomeSource ?? '';
  const amount =
    (draft.expenseAmount ?? 0) > 0 ? draft.expenseAmount : draft.incomeAmount;

  return (
    <article
      className={`ledger-tx-card ${draft.paymentStatus === 'ignored' ? 'opacity-50' : ''}`}
    >
      <div className="ledger-tx-card-top">
        <div className="flex min-w-0 items-center gap-2">
          <CategoryIcon categoryId={draft.categoryId} size={18} />
          <input
            className="money-input min-w-0 flex-1 text-sm font-medium"
            value={title}
            onChange={(e) => {
              const v = e.target.value || null;
              if ((draft.expenseAmount ?? 0) > 0 || draft.operationKind !== 'regular') {
                setDraft({ ...draft, expenseName: v });
              } else {
                setDraft({ ...draft, incomeSource: v });
              }
            }}
            placeholder="Название"
          />
        </div>
        <TransactionAmount tx={draft} className="text-base" />
      </div>

      <div className="ledger-tx-card-meta">
        <input
          type="date"
          className="money-input text-xs"
          value={draft.txDate ?? ''}
          onChange={(e) => setDraft({ ...draft, txDate: e.target.value || null })}
        />
        <input
          className="money-input w-24 text-right text-sm font-semibold"
          value={amount ?? ''}
          onChange={(e) => {
            const n = parseMoneyInput(e.target.value);
            if ((draft.incomeAmount ?? 0) > 0 && !(draft.expenseAmount ?? 0)) {
              setDraft({ ...draft, incomeAmount: n });
            } else {
              setDraft({ ...draft, expenseAmount: n, incomeAmount: null });
            }
          }}
          inputMode="decimal"
        />
      </div>

      <div className="ledger-tx-card-fields">
        <AccountSelect
          value={draft.accountId ?? ''}
          onChange={(id) => setDraft({ ...draft, accountId: id || null })}
          allowEmpty
          className="money-input text-xs"
        />
        <CategorySelect
          value={draft.categoryId ?? ''}
          onChange={(id) => setDraft({ ...draft, categoryId: id || null })}
          type="all"
        />
      </div>

      <div className="ledger-tx-card-footer">
        <span className="text-xs text-[var(--app-text-muted)]">
          {accountName(accounts, draft.accountId)} ·{' '}
          {TX_KIND_LABELS[draft.operationKind] ?? draft.operationKind}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-[var(--app-bg-soft)]"
            onClick={() => onDuplicate(tx)}
            aria-label="Копировать"
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10"
            onClick={() => onDelete(tx.id)}
            aria-label="Удалить"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
});

interface TransactionCardsProps {
  transactions: Transaction[];
}

export function TransactionCards({ transactions }: TransactionCardsProps) {
  const updateTransaction = useBudgetStore((s) => s.updateTransaction);
  const removeTransaction = useBudgetStore((s) => s.removeTransaction);
  const duplicateTransaction = useBudgetStore((s) => s.duplicateTransaction);

  const onSave = useCallback((tx: Transaction) => void updateTransaction(tx), [updateTransaction]);

  if (!transactions.length) {
    return <p className="text-sm text-[var(--app-text-muted)]">Нет операций по фильтрам</p>;
  }

  return (
    <div className="ledger-tx-cards space-y-2">
      {transactions.map((tx) => (
        <TransactionCard
          key={tx.id}
          tx={tx}
          onSave={onSave}
          onDelete={removeTransaction}
          onDuplicate={duplicateTransaction}
        />
      ))}
    </div>
  );
}
