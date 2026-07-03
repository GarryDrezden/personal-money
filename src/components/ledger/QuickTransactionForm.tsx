import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { QuickFormPrefs } from '../../types';
import { useBudgetStore } from '../../store/budgetStore';
import { categoryName } from '../../utils/budget';
import { suggestCategory } from '../../utils/categorize';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';
import { CategoryIcon } from '../shared/CategoryIcon';
import { MoneyInput } from '../shared/MoneyInput';

const SIMPLE_TYPES: { id: QuickFormPrefs['operationType']; label: string }[] = [
  { id: 'expense', label: 'Расход' },
  { id: 'income', label: 'Доход' },
  { id: 'transfer', label: 'Перевод' },
];

const ADVANCED_TYPES: { id: QuickFormPrefs['operationType']; label: string }[] = [
  { id: 'debt_payment', label: 'Кредит' },
  { id: 'credit_card_payment', label: 'Кредитка' },
  { id: 'correction', label: 'Коррекция' },
];

function isSimpleType(type: QuickFormPrefs['operationType']): boolean {
  return type === 'expense' || type === 'income' || type === 'transfer';
}

interface QuickTransactionFormProps {
  monthId: string;
  compact?: boolean;
}

export function QuickTransactionForm({ monthId, compact = false }: QuickTransactionFormProps) {
  const quickForm = useBudgetStore((s) => s.quickForm);
  const accounts = useBudgetStore((s) => s.accounts);
  const categories = useBudgetStore((s) => s.categories);
  const setQuickForm = useBudgetStore((s) => s.setQuickForm);
  const createQuickTransaction = useBudgetStore((s) => s.createQuickTransaction);
  const showToast = useBudgetStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const categoryTouched = useRef(false);

  const opType = quickForm.operationType;
  const creditAccount = useMemo(
    () => accounts.find((a) => a.type === 'credit' && a.isActive && a.status !== 'closed'),
    [accounts],
  );

  const suggestedCategoryId = useMemo(
    () => (name.trim() ? suggestCategory(name) : null),
    [name],
  );

  useEffect(() => {
    if (!isSimpleType(opType)) setAdvancedOpen(true);
  }, [opType]);

  useEffect(() => {
    if (!name.trim()) categoryTouched.current = false;
  }, [name]);

  useEffect(() => {
    if (!name.trim() || categoryTouched.current || !suggestedCategoryId) return;
    if (opType !== 'expense' && opType !== 'income') return;
    if (quickForm.categoryId === suggestedCategoryId) return;
    setQuickForm({ categoryId: suggestedCategoryId });
  }, [name, suggestedCategoryId, opType, quickForm.categoryId, setQuickForm]);

  const setOpType = (t: QuickFormPrefs['operationType']) => {
    setQuickForm({ operationType: t });
    if (isSimpleType(t)) setAdvancedOpen(false);
  };

  const handleCategoryChange = (id: string) => {
    categoryTouched.current = true;
    setQuickForm({ categoryId: id });
  };

  const applySuggestion = () => {
    if (!suggestedCategoryId) return;
    categoryTouched.current = false;
    setQuickForm({ categoryId: suggestedCategoryId });
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
        const targetId = creditAccount?.id ?? quickForm.targetAccountId;
        await createQuickTransaction(monthId, {
          ...base,
          operationKind: 'credit_card_payment',
          accountId: quickForm.accountId,
          targetAccountId: targetId,
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

      setAmount('');
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

  const showTarget = opType === 'transfer' || opType === 'credit_card_payment';
  const showCategory = opType !== 'transfer' && opType !== 'correction';
  const showSuggestion =
    (opType === 'expense' || opType === 'income') &&
    suggestedCategoryId &&
    name.trim().length > 0;

  const suggestionApplied =
    showSuggestion && quickForm.categoryId === suggestedCategoryId && !categoryTouched.current;

  return (
    <div
      className={`rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] ${
        compact ? 'p-3' : 'sticky top-0 z-10 p-4 shadow-md'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-0.5">
          {SIMPLE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                opType === t.id
                  ? 'bg-[var(--app-primary)] text-[var(--app-primary-fg)] shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
              onClick={() => setOpType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
            advancedOpen || !isSimpleType(opType)
              ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
              : 'border-[var(--app-border)] text-[var(--app-text-muted)]'
          }`}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          Ещё
          {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {!isSimpleType(opType) && (
          <span className="text-xs text-[var(--app-text-muted)]">
            {ADVANCED_TYPES.find((t) => t.id === opType)?.label}
          </span>
        )}
      </div>

      {advancedOpen && (
        <div className="mb-3 flex flex-wrap gap-1">
          {ADVANCED_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                opType === t.id
                  ? 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
                  : 'border border-[var(--app-border)] text-[var(--app-text-muted)]'
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
            onKeyDown={onKeyDown}
            placeholder={
              opType === 'income'
                ? 'Источник дохода'
                : opType === 'transfer'
                  ? 'Комментарий (необяз.)'
                  : 'Магазин, услуга…'
            }
          />
          {showSuggestion && (
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <CategoryIcon categoryId={suggestedCategoryId} size={12} />
              <span className="text-[10px] text-[var(--app-text-muted)]">
                {categoryName(categories, suggestedCategoryId)}
              </span>
              {suggestionApplied ? (
                <span className="text-[10px] text-[var(--app-success)]">· подобрано</span>
              ) : (
                <button
                  type="button"
                  className="text-[10px] font-medium text-[var(--app-primary)] hover:underline"
                  onClick={applySuggestion}
                >
                  применить
                </button>
              )}
            </span>
          )}
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
            {opType === 'credit_card_payment' ? 'Кредитка' : 'Куда'}
            {opType === 'credit_card_payment' && creditAccount ? (
              <input className="money-input opacity-80" value={creditAccount.name} readOnly />
            ) : (
              <AccountSelect
                value={quickForm.targetAccountId}
                onChange={(id) => setQuickForm({ targetAccountId: id })}
              />
            )}
          </label>
        )}
        {showCategory && (
          <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
            Категория
            <CategorySelect
              value={quickForm.categoryId}
              onChange={handleCategoryChange}
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
            className="btn-primary w-full rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => void submit()}
          >
            {busy ? '…' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
