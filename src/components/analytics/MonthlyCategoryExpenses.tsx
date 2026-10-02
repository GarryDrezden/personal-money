import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatYearMonth } from '../../constants/categories';
import {
  formatMoney,
  type MonthCategoryExpenseItem,
  type MonthCategoryExpenseRow,
} from '../../utils/budget';

function toggleKey(open: Set<string>, key: string): Set<string> {
  const next = new Set(open);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function CategoryExpenseRow({
  monthId,
  item,
  open,
  onToggle,
}: {
  monthId: string;
  item: MonthCategoryExpenseItem;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `category-expenses-${monthId}-${item.categoryId}`;

  return (
    <li>
      <button
        type="button"
        className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-[var(--app-bg-soft)]"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        {open ? (
          <ChevronDown className="shrink-0 text-[var(--app-primary)]" size={16} />
        ) : (
          <ChevronRight className="shrink-0 text-[var(--app-primary)]" size={16} />
        )}
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
        <span className="shrink-0 font-medium text-[var(--app-danger)]">
          {formatMoney(item.amount)}
        </span>
      </button>
      {open && (
        <ul id={panelId} className="ml-5 mt-1 space-y-1 border-l border-[var(--app-border)] pl-3">
          {item.entries.map((entry) => (
            <li key={entry.name} className="flex justify-between gap-2 text-[var(--app-text-muted)]">
              <span className="min-w-0">
                {entry.name}
                {entry.count > 1 && (
                  <span className="ml-1 text-xs opacity-80">×{entry.count}</span>
                )}
              </span>
              <span className="shrink-0 font-medium text-[var(--app-danger)]">
                {formatMoney(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function MonthlyCategoryExpenses({
  year,
  months,
}: {
  year: string;
  months: MonthCategoryExpenseRow[];
}) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  return (
    <div className="space-y-4">
      {months.map((month) => (
        <div
          key={month.monthId}
          className="rounded-lg border border-[var(--app-border)] p-3"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{formatYearMonth(month.yearMonth)}</h3>
            <span className="text-sm text-[var(--app-text-muted)]">
              итого <strong className="text-[var(--app-text)]">{formatMoney(month.total)}</strong>
            </span>
          </div>
          {month.items.length ? (
            <ul className="space-y-1 text-sm">
              {month.items.map((item) => {
                const key = `${month.monthId}:${item.categoryId}`;
                return (
                  <CategoryExpenseRow
                    key={item.categoryId}
                    monthId={month.monthId}
                    item={item}
                    open={openKeys.has(key)}
                    onToggle={() => setOpenKeys((prev) => toggleKey(prev, key))}
                  />
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--app-text-muted)]">Нет расходов</p>
          )}
        </div>
      ))}
      {!months.length && (
        <p className="text-sm text-[var(--app-text-muted)]">Нет данных за {year} год</p>
      )}
    </div>
  );
}
