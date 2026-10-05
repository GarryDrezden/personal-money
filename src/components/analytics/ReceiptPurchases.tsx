import { formatYearMonth } from '../../constants/categories';
import { formatMoney, type MonthReceiptItemsRow } from '../../utils/budget';

export function ReceiptPurchases({
  year,
  months,
}: {
  year: string;
  months: MonthReceiptItemsRow[];
}) {
  if (!months.length) {
    return (
      <p className="text-sm text-[var(--app-text-muted)]">
        Пока нет текстов чеков за {year}. Вставьте текст в расход — здесь появятся позиции.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {months.map((month) => (
        <div key={month.monthId} className="rounded-lg border border-[var(--app-border)] p-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{formatYearMonth(month.yearMonth)}</h3>
            <span className="text-sm text-[var(--app-text-muted)]">
              {month.storeCount} чек. · итого{' '}
              <strong className="text-[var(--app-text)]">{formatMoney(month.total)}</strong>
            </span>
          </div>
          <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
            {month.items.map((item) => (
              <li key={item.name} className="flex justify-between gap-2">
                <span className="min-w-0">
                  {item.name}
                  {item.count > 1 && (
                    <span className="ml-1 text-xs text-[var(--app-text-muted)]">×{item.count}</span>
                  )}
                </span>
                <span className="shrink-0 font-medium text-[var(--app-danger)]">
                  {formatMoney(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
