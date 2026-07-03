import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { QuickFormPrefs } from '../../types';
import { useBudgetStore } from '../../store/budgetStore';
import { categoryName } from '../../utils/budget';
import { suggestCategory } from '../../utils/categorize';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';
import { CategoryIcon } from '../shared/CategoryIcon';
import { MoneyInput } from '../shared/MoneyInput';

type OpType = QuickFormPrefs['operationType'];

const SIMPLE_TYPES: {
  id: OpType;
  label: string;
  icon: LucideIcon;
  namePlaceholder: string;
  submitLabel: string;
}[] = [
  {
    id: 'expense',
    label: 'Расход',
    icon: TrendingDown,
    namePlaceholder: 'Пятёрочка, такси, подписка…',
    submitLabel: 'Добавить расход',
  },
  {
    id: 'income',
    label: 'Доход',
    icon: TrendingUp,
    namePlaceholder: 'Зарплата, возврат, подработка…',
    submitLabel: 'Добавить доход',
  },
  {
    id: 'transfer',
    label: 'Перевод',
    icon: ArrowLeftRight,
    namePlaceholder: 'Комментарий (необязательно)',
    submitLabel: 'Записать перевод',
  },
];

const ADVANCED_TYPES: { id: OpType; label: string; submitLabel: string }[] = [
  { id: 'debt_payment', label: 'Платёж по кредиту', submitLabel: 'Записать платёж' },
  { id: 'credit_card_payment', label: 'На кредитку', submitLabel: 'Записать на кредитку' },
  { id: 'correction', label: 'Коррекция баланса', submitLabel: 'Записать коррекцию' },
];

function isSimpleType(type: OpType): boolean {
  return type === 'expense' || type === 'income' || type === 'transfer';
}

function getSubmitLabel(opType: OpType): string {
  const simple = SIMPLE_TYPES.find((t) => t.id === opType);
  if (simple) return simple.submitLabel;
  return ADVANCED_TYPES.find((t) => t.id === opType)?.submitLabel ?? 'Добавить';
}

function getNamePlaceholder(opType: OpType): string {
  const simple = SIMPLE_TYPES.find((t) => t.id === opType);
  if (simple) return simple.namePlaceholder;
  if (opType === 'debt_payment') return 'Банк, ипотека…';
  if (opType === 'credit_card_payment') return 'Платёж по кредитке';
  return 'Описание';
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
  const [noteOpen, setNoteOpen] = useState(false);
  const categoryTouched = useRef(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

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

  const setOpType = (t: OpType) => {
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
      amountRef.current?.focus();
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
      amountRef.current?.focus();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
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

  const submitLabel = getSubmitLabel(opType);
  const namePlaceholder = getNamePlaceholder(opType);

  const typeSegment = (
    <div className="quick-entry-types" role="tablist" aria-label="Тип операции">
      {SIMPLE_TYPES.map((t) => {
        const Icon = t.icon;
        const active = opType === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`quick-entry-type ${active ? 'quick-entry-type--active' : ''}`}
            onClick={() => setOpType(t.id)}
          >
            <Icon size={compact ? 14 : 16} strokeWidth={2.25} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );

  const advancedBlock = (
    <>
      <button
        type="button"
        className="quick-entry-more"
        onClick={() => setAdvancedOpen((v) => !v)}
        aria-expanded={advancedOpen}
      >
        Ещё типы
        {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {advancedOpen && (
        <div className="quick-entry-advanced">
          {ADVANCED_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`quick-entry-advanced-btn ${opType === t.id ? 'quick-entry-advanced-btn--active' : ''}`}
              onClick={() => setOpType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {!isSimpleType(opType) && (
        <p className="quick-entry-advanced-hint">
          Выбрано: {ADVANCED_TYPES.find((t) => t.id === opType)?.label}
        </p>
      )}
    </>
  );

  const suggestionChip = showSuggestion && (
    <div className="quick-entry-suggestion">
      <Sparkles size={13} className="shrink-0 text-[var(--app-primary)]" />
      <CategoryIcon categoryId={suggestedCategoryId} size={14} />
      <span className="min-w-0 truncate text-sm">
        {categoryName(categories, suggestedCategoryId)}
      </span>
      {suggestionApplied ? (
        <span className="quick-entry-suggestion-badge">подобрано</span>
      ) : (
        <button type="button" className="quick-entry-suggestion-apply" onClick={applySuggestion}>
          применить
        </button>
      )}
    </div>
  );

  const detailsFields = (
    <div className={`quick-entry-details ${compact ? 'quick-entry-details--compact' : ''}`}>
      <label className="quick-entry-field">
        <span className="quick-entry-label">Дата</span>
        <input
          type="date"
          className="money-input"
          value={quickForm.txDate}
          onChange={(e) => setQuickForm({ txDate: e.target.value })}
        />
      </label>
      <label className="quick-entry-field">
        <span className="quick-entry-label">Счёт</span>
        <AccountSelect value={quickForm.accountId} onChange={(id) => setQuickForm({ accountId: id })} />
      </label>
      {showTarget && (
        <label className="quick-entry-field">
          <span className="quick-entry-label">
            {opType === 'credit_card_payment' ? 'Кредитка' : 'Куда переводим'}
          </span>
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
        <label className="quick-entry-field">
          <span className="quick-entry-label">Категория</span>
          <CategorySelect
            value={quickForm.categoryId}
            onChange={handleCategoryChange}
            type={opType === 'income' ? 'income' : 'expense'}
          />
        </label>
      )}
      {!compact && (
        <div className="quick-entry-field quick-entry-field--note">
          {!noteOpen && !note ? (
            <button type="button" className="quick-entry-note-toggle" onClick={() => setNoteOpen(true)}>
              + Заметка
            </button>
          ) : (
            <label className="flex w-full flex-col gap-1">
              <span className="quick-entry-label">Заметка</span>
              <input
                className="money-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Необязательно"
                onKeyDown={onKeyDown}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );

  const submitButton = (
    <button
      type="button"
      disabled={busy}
      className="quick-entry-submit btn-primary"
      onClick={() => void submit()}
    >
      <Plus size={18} strokeWidth={2.5} />
      {busy ? 'Сохраняем…' : submitLabel}
    </button>
  );

  if (compact) {
    return (
      <div className="quick-entry quick-entry--compact">
        {typeSegment}
        <div className="quick-entry-main quick-entry-main--compact">
          <label className="quick-entry-field quick-entry-field--grow">
            <span className="quick-entry-label">Название</span>
            <input
              ref={nameRef}
              className="money-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={namePlaceholder}
            />
          </label>
          <label className="quick-entry-field quick-entry-field--amount">
            <span className="quick-entry-label">Сумма</span>
            <div className="quick-entry-amount-wrap">
              <MoneyInput
                ref={amountRef}
                value={amount}
                onChange={setAmount}
                onKeyDown={onKeyDown}
                className="money-input quick-entry-amount-input"
              />
              <span className="quick-entry-currency">₽</span>
            </div>
          </label>
        </div>
        {suggestionChip}
        {detailsFields}
        <div className="quick-entry-footer quick-entry-footer--compact">
          {advancedBlock}
          {submitButton}
        </div>
      </div>
    );
  }

  return (
    <div className="quick-entry sticky top-0 z-10">
      <div className="quick-entry-header">
        <div>
          <h2 className="quick-entry-title">Новая запись</h2>
          <p className="quick-entry-subtitle">Сумма и название — Enter для сохранения</p>
        </div>
        <div className="hidden sm:block">{advancedBlock}</div>
      </div>

      {typeSegment}
      <div className="sm:hidden">{advancedBlock}</div>

      <div className="quick-entry-main">
        <label className="quick-entry-field quick-entry-field--grow">
          <span className="quick-entry-label">
            {opType === 'income' ? 'Источник' : opType === 'transfer' ? 'Комментарий' : 'Куда / что'}
          </span>
          <input
            ref={nameRef}
            className="money-input quick-entry-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={namePlaceholder}
            autoComplete="off"
          />
        </label>
        <label className="quick-entry-field quick-entry-field--amount">
          <span className="quick-entry-label">Сумма</span>
          <div className="quick-entry-amount-wrap">
            <MoneyInput
              ref={amountRef}
              value={amount}
              onChange={setAmount}
              onKeyDown={onKeyDown}
              className="money-input quick-entry-amount-input"
            />
            <span className="quick-entry-currency">₽</span>
          </div>
        </label>
      </div>

      {suggestionChip}
      {detailsFields}
      {submitButton}
    </div>
  );
}
