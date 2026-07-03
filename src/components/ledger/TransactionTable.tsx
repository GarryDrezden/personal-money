import { memo, useCallback } from 'react';
import { Copy, SearchX, Trash2 } from 'lucide-react';
import type { Transaction } from '../../types';
import { accountName, formatMoney, parseMoneyInput } from '../../utils/budget';
import { useBudgetStore } from '../../store/budgetStore';
import { EmptyState } from '../ui/EmptyState';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';
import { CategoryLabel } from '../shared/CategoryIcon';
import { TX_KIND_LABELS, useDebouncedTransaction } from './useDebouncedTransaction';
import { TransactionCards } from './TransactionCards';

const KIND_LABELS = TX_KIND_LABELS;
const TransactionRow = memo(function TransactionRow({
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
    (draft.expenseAmount ?? 0) > 0
      ? draft.expenseAmount
      : draft.incomeAmount;

  return (
    <tr className={draft.paymentStatus === 'ignored' ? 'opacity-50' : ''}>
      <td className="ledger-col-date">
        <input
          type="date"
          className="money-input"
          value={draft.txDate ?? ''}
          onChange={(e) => setDraft({ ...draft, txDate: e.target.value || null })}
        />
      </td>
      <td className="ledger-col-name">
        <input
          className="money-input"
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
      </td>
      <td className="ledger-col-amount">
        <input
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
      </td>
      <td className="ledger-col-account">
        <AccountSelect
          value={draft.accountId ?? ''}
          onChange={(id) => setDraft({ ...draft, accountId: id || null })}
          allowEmpty
          className="money-input ledger-account-select"
        />
      </td>
      <td className="ledger-col-account">
        {draft.operationKind === 'transfer' ? (
          <AccountSelect
            value={draft.targetAccountId ?? ''}
            onChange={(id) => setDraft({ ...draft, targetAccountId: id || null })}
            allowEmpty
            className="money-input ledger-account-select"
          />
        ) : (
          <span className="text-xs text-[var(--app-text-muted)]">—</span>
        )}
      </td>
      <td className="ledger-col-category">
        <CategorySelect
          value={draft.categoryId ?? ''}
          onChange={(id) => setDraft({ ...draft, categoryId: id || null })}
          type="all"
        />
      </td>
      <td className="text-xs text-[var(--app-text-muted)]">
        {KIND_LABELS[draft.operationKind] ?? draft.operationKind}
      </td>
      <td className="text-xs">{accountName(accounts, draft.accountId)}</td>
      <td className="text-xs">
        <CategoryLabel categoryId={draft.categoryId} iconSize={14} />
      </td>
      <td className="w-20 whitespace-nowrap">
        <button
          type="button"
          className="rounded p-1 hover:bg-[var(--app-bg-soft)]"
          onClick={() => onDuplicate(tx)}
          aria-label="Копировать"
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          className="rounded p-1 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10"
          onClick={() => onDelete(tx.id)}
          aria-label="Удалить"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
});

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const updateTransaction = useBudgetStore((s) => s.updateTransaction);
  const removeTransaction = useBudgetStore((s) => s.removeTransaction);
  const duplicateTransaction = useBudgetStore((s) => s.duplicateTransaction);

  const onSave = useCallback((tx: Transaction) => void updateTransaction(tx), [updateTransaction]);

  if (!transactions.length) {
    return (
      <EmptyState
        icon={SearchX}
        title="Ничего не найдено"
        description="Попробуйте изменить фильтры или добавьте новую операцию"
        compact
      />
    );
  }

  return (
    <>
      <div className="md:hidden">
        <TransactionCards transactions={transactions} />
        {transactions.length > 0 && (
          <p className="ledger-table-summary mt-3">
            {transactions.length} операций · расходы{' '}
            {formatMoney(transactions.reduce((s, t) => s + (t.expenseAmount ?? 0), 0))}
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="ledger-table w-full">
          <thead>
          <tr>
            <th className="ledger-col-date">Дата</th>
            <th className="ledger-col-name">Название</th>
            <th className="ledger-col-amount">Сумма</th>
            <th className="ledger-col-account">Счёт</th>
            <th className="ledger-col-account">Куда</th>
            <th className="ledger-col-category">Категория</th>
            <th>Тип</th>
            <th>Счёт</th>
            <th>Кат.</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onSave={onSave}
              onDelete={removeTransaction}
              onDuplicate={duplicateTransaction}
            />
          ))}
        </tbody>
      </table>
        <div className="ledger-table-summary">
          Показано: {transactions.length} · сумма расходов{' '}
          {formatMoney(transactions.reduce((s, t) => s + (t.expenseAmount ?? 0), 0))}
        </div>
      </div>
    </>
  );
}
