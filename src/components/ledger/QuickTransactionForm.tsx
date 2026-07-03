import { useState } from 'react';
import type { QuickFormPrefs } from '../../types';
import { useBudgetStore } from '../../store/budgetStore';
import { suggestCategory } from '../../utils/categorize';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';
import { MoneyInput } from '../shared/MoneyInput';

const OP_TYPES: { id: QuickFormPrefs['operationType']; label: string }[] = [
  { id: 'expense', label: 'Расход' },
  { id: 'income', label: 'Доход' },
  { id: 'transfer', label: 'Перевод' },
  { id: 'debt_payment', label: 'Кредит' },
  { id: 'credit_card_payment', label: 'Кредитка' },
  { id: 'correction', label: 'Коррекция' },
];

interface QuickTransactionFormProps {
  monthId: string;
  compact?: boolean;
}

export function QuickTransactionForm({ monthId, compact = false }: QuickTransactionFormProps) {
  const quickForm = useBudgetStore((s) => s.quickForm);
  const accounts = useBudgetStore((s) => s.accounts);
  const setQuickForm = useBudgetStore((s) => s.setQuickForm);
  const createQuickTransaction = useBudgetStore((s) => s.createQuickTransaction);
  const showToast = useBudgetStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const opType = quickForm.operationType;

  const setOpType = (t: typeof opType) => {
    setQuickForm({ operationType: t });
  };

  const handleNameBlur = () => {
    if (!name.trim() || quickForm.categoryId) return;
    const suggested = suggestCategory(name);
    if (suggested) setQuickForm({ categoryId: suggested });
  };

  const submit = async () => {
    const num = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) {
      showToast('Укажите сумму', 'error');
      return;
    }
    setBusy(true);
    try {
      const base = {
        txDate: quickForm.txDate,
        note,
        paymentStatus: 'done' as const,
      };

      if (opType === 'expense') {
        await createQuickTransaction(monthId, {
          ...base,
          operationKind: 'regular',
          accountId: quickForm.accountId,
          categoryId: quickForm.categoryId || null,
          expenseName: name || 'Расход',
          expenseAmount: num,
          incomeAmount: null,
          incomeSource: null,
        });
      } else if (opType === 'income') {
        await createQuickTransaction(monthId, {
          ...base,
          operationKind: 'regular',
          accountId: quickForm.accountId,
          categoryId: quickForm.categoryId || null,
          incomeSource: name || 'Доход',
          incomeAmount: num,
          expenseAmount: null,
          expenseName: null,
        });
      } else if (opType === 'transfer') {
        const targetAccount = accounts.find((a) => a.id === quickForm.targetAccountId);
        const isCreditPayment = targetAccount?.type === 'credit';
        await createQuickTransaction(monthId, {
          ...base,
          operationKind: isCreditPayment ? 'credit_card_payment' : 'transfer',
          accountId: quickForm.accountId,
          targetAccountId: quickForm.targetAccountId,
          categoryId: isCreditPayment ? 'credit_card_payment' : 'transfer',
          expenseName: name || (isCreditPayment ? 'На кредитку' : 'Перевод'),
          expenseAmount: num,
        });
      } else if (opType === 'credit_card_payment') {
        await createQuickTransaction(monthId, {
          ...base,
          operationKind: 'credit_card_payment',
          accountId: quickForm.accountId,
          targetAccountId: 'credit_card',
          categoryId: 'credit_card_payment',
          expenseName: name || 'Платёж по кредитке',
          expenseAmount: num,
        });
      } else if (opType === 'debt_payment') {
        await createQuickTransaction(monthId, {
          ...base,
          operationKind: 'debt_payment',
          accountId: quickForm.accountId,
          categoryId: 'credits',
          expenseName: name || 'Платёж по кредиту',
          expenseAmount: num,
        });
      } else if (opType === 'correction') {
        await createQuickTransaction(monthId, {
          ...base,
          operationKind: 'correction',
          accountId: quickForm.accountId,
          expenseName: num < 0 ? name || 'Коррекция' : null,
          expenseAmount: num < 0 ? Math.abs(num) : null,
          incomeSource: num >= 0 ? name || 'Коррекция' : null,
          incomeAmount: num >= 0 ? num : null,
        });
      }

      setName('');
      setAmount('');
      setNote('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  const showTarget = opType === 'transfer';
  const showCategory = opType !== 'transfer' && opType !== 'correction';

  return (
    <div
      className={`rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] ${
        compact ? 'p-3' : 'sticky top-0 z-10 p-4 shadow-md'
      }`}
    >
      {!compact && (
        <div className="mb-3 flex flex-wrap gap-1">
          {OP_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                opType === t.id
                  ? 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
                  : 'border border-[var(--app-border)]'
              }`}
              onClick={() => setOpType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div
        className={`grid gap-2 ${
          compact ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7'
        }`}
      >
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Дата
          <input
            type="date"
            className="money-input"
            value={quickForm.txDate}
            onChange={(e) => setQuickForm({ txDate: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Название
          <input
            className="money-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={onKeyDown}
            placeholder="Описание"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Сумма
          <MoneyInput value={amount} onChange={setAmount} onKeyDown={onKeyDown} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Счёт
          <AccountSelect value={quickForm.accountId} onChange={(id) => setQuickForm({ accountId: id })} />
        </label>
        {showTarget && (
          <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
            Куда
            <AccountSelect
              value={quickForm.targetAccountId}
              onChange={(id) => setQuickForm({ targetAccountId: id })}
            />
          </label>
        )}
        {showCategory && (
          <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
            Категория
            <CategorySelect
              value={quickForm.categoryId}
              onChange={(id) => setQuickForm({ categoryId: id })}
              type={opType === 'income' ? 'income' : 'expense'}
            />
          </label>
        )}
        {!compact && (
          <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)] lg:col-span-2">
            Заметка
            <input className="money-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        )}
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-lg bg-[var(--app-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void submit()}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}
