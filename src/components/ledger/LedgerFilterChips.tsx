import { useMemo } from 'react';
import { X } from 'lucide-react';
import { DEFAULT_LEDGER_FILTERS } from '../../types';
import { useBudgetStore } from '../../store/budgetStore';
import { accountName } from '../../utils/budget';

const OP_LABELS: Record<string, string> = {
  expense: 'Расход',
  income: 'Доход',
  transfer: 'Перевод',
  credit_card_payment: 'На кредитку',
  debt_payment: 'Кредит',
  correction: 'Коррекция',
};

export function LedgerFilterChips() {
  const filters = useBudgetStore((s) => s.ledgerFilters);
  const accounts = useBudgetStore((s) => s.accounts);
  const categories = useBudgetStore((s) => s.categories);
  const setLedgerFilters = useBudgetStore((s) => s.setLedgerFilters);

  const chips = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = [];

    if (filters.search.trim()) {
      list.push({
        key: 'search',
        label: `«${filters.search.trim()}»`,
        clear: () => setLedgerFilters({ search: '' }),
      });
    }
    if (filters.accountId) {
      list.push({
        key: 'account',
        label: accountName(accounts, filters.accountId),
        clear: () => setLedgerFilters({ accountId: '' }),
      });
    }
    if (filters.categoryId) {
      const cat = categories.find((c) => c.id === filters.categoryId);
      list.push({
        key: 'category',
        label: cat?.name ?? filters.categoryId,
        clear: () => setLedgerFilters({ categoryId: '' }),
      });
    }
    if (filters.incomeCategoryId) {
      const cat = categories.find((c) => c.id === filters.incomeCategoryId);
      list.push({
        key: 'incomeCategory',
        label: cat?.name ?? filters.incomeCategoryId,
        clear: () => setLedgerFilters({ incomeCategoryId: '' }),
      });
    }
    if (filters.incomeOnly) {
      list.push({
        key: 'incomeOnly',
        label: 'только доходы',
        clear: () => setLedgerFilters({ incomeOnly: false, operationType: filters.operationType === 'income' ? '' : filters.operationType }),
      });
    }
    if (filters.operationType) {
      list.push({
        key: 'op',
        label: OP_LABELS[filters.operationType] ?? filters.operationType,
        clear: () => setLedgerFilters({ operationType: '' }),
      });
    }
    if (filters.largeOnly) {
      list.push({
        key: 'large',
        label: '>5000 ₽',
        clear: () => setLedgerFilters({ largeOnly: false }),
      });
    }
    if (filters.noCategory) {
      list.push({
        key: 'noCategory',
        label: 'без категории',
        clear: () => setLedgerFilters({ noCategory: false }),
      });
    }
    if (filters.noAccount) {
      list.push({
        key: 'noAccount',
        label: 'без счёта',
        clear: () => setLedgerFilters({ noAccount: false }),
      });
    }

    return list;
  }, [filters, accounts, categories, setLedgerFilters]);

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-2.5 py-1 text-xs"
          onClick={chip.clear}
        >
          {chip.label}
          <X size={12} />
        </button>
      ))}
      <button
        type="button"
        className="text-xs text-[var(--app-primary)] underline"
        onClick={() => setLedgerFilters({ ...DEFAULT_LEDGER_FILTERS })}
      >
        Сбросить всё
      </button>
    </div>
  );
}
