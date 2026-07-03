import { useBudgetStore } from '../../store/budgetStore';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';

const OP_TYPES = [
  { value: '', label: 'Все' },
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
  { value: 'transfer', label: 'Перевод' },
  { value: 'credit_card_payment', label: 'На кредитку' },
  { value: 'debt_payment', label: 'Кредит' },
  { value: 'correction', label: 'Коррекция' },
];

export function LedgerFilters() {
  const filters = useBudgetStore((s) => s.ledgerFilters);
  const setLedgerFilters = useBudgetStore((s) => s.setLedgerFilters);

  const setIncomeOnly = (checked: boolean) => {
    setLedgerFilters({
      incomeOnly: checked,
      operationType: checked ? 'income' : filters.operationType === 'income' ? '' : filters.operationType,
    });
  };

  const setOperationType = (value: string) => {
    setLedgerFilters({
      operationType: value,
      incomeOnly: value === 'income',
      incomeCategoryId: value === 'expense' || value === 'transfer' ? '' : filters.incomeCategoryId,
      categoryId: value === 'income' ? '' : filters.categoryId,
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Поиск
          <input
            className="money-input min-w-[140px]"
            value={filters.search}
            onChange={(e) => setLedgerFilters({ search: e.target.value })}
            placeholder="Название, источник…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Счёт
          <AccountSelect
            value={filters.accountId}
            onChange={(id) => setLedgerFilters({ accountId: id })}
            allowEmpty
            includeCredit
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Категория расхода
          <CategorySelect
            value={filters.categoryId}
            onChange={(id) => setLedgerFilters({ categoryId: id, incomeCategoryId: id ? '' : filters.incomeCategoryId })}
            type="expense"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Тип операции
          <select
            className="money-input min-w-[130px]"
            value={filters.operationType}
            onChange={(e) => setOperationType(e.target.value)}
          >
            {OP_TYPES.map((t) => (
              <option key={t.value || 'all'} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-xs">
          <input
            type="checkbox"
            checked={filters.largeOnly}
            onChange={(e) => setLedgerFilters({ largeOnly: e.target.checked })}
          />
          &gt;5000 ₽
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-xs">
          <input
            type="checkbox"
            checked={filters.noCategory}
            onChange={(e) => setLedgerFilters({ noCategory: e.target.checked })}
          />
          без категории
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-xs">
          <input
            type="checkbox"
            checked={filters.noAccount}
            onChange={(e) => setLedgerFilters({ noAccount: e.target.checked })}
          />
          без счёта
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--app-border)] pt-2">
        <span className="self-center text-xs font-medium text-[var(--app-text-muted)]">Доходы</span>
        <label className="flex flex-col gap-1 text-xs text-[var(--app-text-muted)]">
          Категория дохода
          <CategorySelect
            value={filters.incomeCategoryId}
            onChange={(id) =>
              setLedgerFilters({
                incomeCategoryId: id,
                categoryId: id ? '' : filters.categoryId,
                incomeOnly: id ? true : filters.incomeOnly,
                operationType: id ? 'income' : filters.operationType === 'income' && !filters.incomeOnly ? '' : filters.operationType,
              })
            }
            type="income"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={filters.incomeOnly}
            onChange={(e) => setIncomeOnly(e.target.checked)}
          />
          только доходы
        </label>
      </div>
    </div>
  );
}
