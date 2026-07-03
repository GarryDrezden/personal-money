import type { CategoryMonthSummary } from '../../types';
import { formatMoney } from '../../utils/budget';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../shared/ProgressBar';
import { CategoryLabel } from '../shared/CategoryIcon';

interface CategorySummaryProps {
  items: CategoryMonthSummary[];
}

function limitHint(item: CategoryMonthSummary): string | null {
  if (item.monthlyLimit == null || item.monthlyLimit <= 0) return null;
  const remaining = item.monthlyLimit - item.amount;
  if (remaining >= 0) {
    return `осталось ${formatMoney(remaining)}`;
  }
  return `перерасход ${formatMoney(Math.abs(remaining))}`;
}

export function CategorySummary({ items }: CategorySummaryProps) {
  if (!items.length) {
    return (
      <p className="text-sm text-[var(--app-text-muted)]">Нет расходов по категориям в этом месяце</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((c) => {
        const hint = limitHint(c);
        const remaining = c.monthlyLimit != null ? c.monthlyLimit - c.amount : null;

        return (
          <div key={c.categoryId} className="rounded-lg border border-[var(--app-border)] p-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <CategoryLabel categoryId={c.categoryId} name={c.name} iconSize={18} className="font-medium" />
              <div className="text-right">
                <div className="font-medium tabular-nums">{formatMoney(c.amount)}</div>
                {hint && (
                  <div
                    className={`text-xs tabular-nums ${
                      remaining != null && remaining < 0
                        ? 'font-medium text-[var(--app-danger)]'
                        : 'text-[var(--app-success)]'
                    }`}
                  >
                    {hint}
                  </div>
                )}
              </div>
            </div>
            {c.monthlyLimit != null && c.monthlyLimit > 0 && (
              <div className="mt-1">
                <ProgressBar value={c.amount} max={c.monthlyLimit} status={c.limitStatus} />
                <div className="mt-0.5 flex justify-between text-xs text-[var(--app-text-muted)]">
                  <span>лимит {formatMoney(c.monthlyLimit)}</span>
                  {remaining != null && remaining >= 0 && (
                    <span className="text-[var(--app-success)]">{formatMoney(remaining)} свободно</span>
                  )}
                </div>
              </div>
            )}
            {c.excelAmount != null && Math.abs(c.excelAmount - c.amount) > 1 && (
              <div className="mt-1 flex items-center gap-2 text-xs">
                <Badge variant="default">Excel: {formatMoney(c.excelAmount)}</Badge>
                <span className="text-[var(--app-text-muted)]">по операциям: {formatMoney(c.amount)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
