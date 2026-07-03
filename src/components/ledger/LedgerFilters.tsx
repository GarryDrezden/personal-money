import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';
import { useBudgetStore } from '../../store/budgetStore';
import { DEFAULT_LEDGER_FILTERS } from '../../types';
import { AccountSelect } from '../shared/AccountSelect';
import { CategorySelect } from '../shared/CategorySelect';

const OP_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
  { value: 'transfer', label: 'Перевод' },
  { value: 'credit_card_payment', label: 'На кредитку' },
  { value: 'debt_payment', label: 'Кредит' },
  { value: 'correction', label: 'Коррекция' },
];

function countActiveFilters(filters: typeof DEFAULT_LEDGER_FILTERS): number {
  let n = 0;
  if (filters.accountId) n++;
  if (filters.categoryId) n++;
  if (filters.incomeCategoryId) n++;
  if (filters.operationType) n++;
  if (filters.largeOnly) n++;
  if (filters.noCategory) n++;
  if (filters.noAccount) n++;
  if (filters.incomeOnly) n++;
  return n;
}

export function LedgerFilters() {
  const filters = useBudgetStore((s) => s.ledgerFilters);
  const setLedgerFilters = useBudgetStore((s) => s.setLedgerFilters);
  const [open, setOpen] = useState(true);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);
  const hasSearch = filters.search.trim().length > 0;

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
    <div className="ledger-filters">
      <div className="ledger-filters-search">
        <label className="quick-entry-field">
          <span className="quick-entry-label">Поиск в журнале</span>
          <div className="ledger-search-input-wrap">
            <Search size={16} className="ledger-search-icon" aria-hidden />
            <input
              className="ledger-search-input"
              value={filters.search}
              onChange={(e) => setLedgerFilters({ search: e.target.value })}
              placeholder="Название, источник, заметка…"
            />
            {hasSearch && (
              <button
                type="button"
                className="ledger-search-clear"
                onClick={() => setLedgerFilters({ search: '' })}
                aria-label="Очистить поиск"
              >
                ×
              </button>
            )}
          </div>
        </label>
      </div>

      <button
        type="button"
        className="ledger-filters-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Фильтры
          {activeCount > 0 && (
            <span className="rounded-full bg-[var(--app-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--app-primary)]">
              {activeCount}
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--app-text-muted)]">
          <span className="ledger-filters-toggle-meta hidden sm:inline">
            {open ? 'Свернуть' : 'Счёт, категория, тип…'}
          </span>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {open && (
        <div className="ledger-filters-body">
          <div className="ledger-filters-grid">
            <label className="quick-entry-field">
              <span className="quick-entry-label">Счёт</span>
              <AccountSelect
                value={filters.accountId}
                onChange={(id) => setLedgerFilters({ accountId: id })}
                allowEmpty
                includeCredit
              />
            </label>
            <label className="quick-entry-field">
              <span className="quick-entry-label">Категория расхода</span>
              <CategorySelect
                value={filters.categoryId}
                onChange={(id) =>
                  setLedgerFilters({ categoryId: id, incomeCategoryId: id ? '' : filters.incomeCategoryId })
                }
                type="expense"
              />
            </label>
            <label className="quick-entry-field">
              <span className="quick-entry-label">Тип операции</span>
              <select
                className="money-input"
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
            <label className="quick-entry-field">
              <span className="quick-entry-label">Категория дохода</span>
              <CategorySelect
                value={filters.incomeCategoryId}
                onChange={(id) =>
                  setLedgerFilters({
                    incomeCategoryId: id,
                    categoryId: id ? '' : filters.categoryId,
                    incomeOnly: id ? true : filters.incomeOnly,
                    operationType:
                      id ? 'income' : filters.operationType === 'income' && !filters.incomeOnly ? '' : filters.operationType,
                  })
                }
                type="income"
              />
            </label>
          </div>

          <div className="ledger-filters-checks">
            <label className="ledger-filters-check">
              <input
                type="checkbox"
                checked={filters.largeOnly}
                onChange={(e) => setLedgerFilters({ largeOnly: e.target.checked })}
              />
              Сумма &gt; 5000 ₽
            </label>
            <label className="ledger-filters-check">
              <input
                type="checkbox"
                checked={filters.noCategory}
                onChange={(e) => setLedgerFilters({ noCategory: e.target.checked })}
              />
              Без категории
            </label>
            <label className="ledger-filters-check">
              <input
                type="checkbox"
                checked={filters.noAccount}
                onChange={(e) => setLedgerFilters({ noAccount: e.target.checked })}
              />
              Без счёта
            </label>
            <label className="ledger-filters-check font-medium">
              <input
                type="checkbox"
                checked={filters.incomeOnly}
                onChange={(e) => setIncomeOnly(e.target.checked)}
              />
              Только доходы
            </label>
            {(activeCount > 0 || hasSearch) && (
              <button
                type="button"
                className="text-xs font-medium text-[var(--app-primary)] hover:underline"
                onClick={() => setLedgerFilters({ ...DEFAULT_LEDGER_FILTERS })}
              >
                Сбросить все
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
