import { useMemo, useState } from 'react';
import type { Transaction } from '../../types';
import { useBudgetStore } from '../../store/budgetStore';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';
import { suggestCategory } from '../../utils/categorize';

interface BulkAssignModalProps {
  monthId: string;
  transactions: Transaction[];
  onClose: () => void;
}

export function BulkAssignModal({ monthId, transactions, onClose }: BulkAssignModalProps) {
  const bulkUpdateTransactions = useBudgetStore((s) => s.bulkUpdateTransactions);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);

  const unassigned = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.monthId === monthId &&
          (!t.accountId || !t.categoryId) &&
          t.paymentStatus !== 'ignored',
      ),
    [transactions, monthId],
  );

  const handleSuggestCategories = async () => {
    setBusy(true);
    try {
      for (const tx of unassigned.filter((t) => !t.categoryId)) {
        const title = tx.expenseName ?? tx.incomeSource ?? '';
        const suggested = suggestCategory(title);
        if (suggested) {
          await bulkUpdateTransactions([tx.id], { categoryId: suggested });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (!accountId && !categoryId) return;
    setBusy(true);
    try {
      const patch: Partial<Transaction> = {};
      if (accountId) patch.accountId = accountId;
      if (categoryId) patch.categoryId = categoryId;
      await bulkUpdateTransactions(
        unassigned.map((t) => t.id),
        patch,
      );
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-card-strong)] p-4 shadow-xl">
        <h3 className="font-semibold">Массовое назначение</h3>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          Без счёта/категории: {unassigned.length} операций
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            Счёт
            <AccountSelect value={accountId} onChange={setAccountId} allowEmpty />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Категория
            <CategorySelect value={categoryId} onChange={setCategoryId} type="all" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-[var(--app-secondary)] px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void handleSuggestCategories()}
          >
            Предложить категории
          </button>
          <button
            type="button"
            disabled={busy || (!accountId && !categoryId)}
            className="btn-primary rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => void handleApply()}
          >
            Применить
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
