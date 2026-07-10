import { formatDelta, formatMoney } from '../../utils/budget';

export type MoneySize = 'hero' | 'xl' | 'lg' | 'md' | 'sm' | 'inline';

export type MoneyTone = 'default' | 'success' | 'danger' | 'muted';

function shrinkSize(preferred: MoneySize, charCount: number): MoneySize {
  const order: MoneySize[] = ['hero', 'xl', 'lg', 'md', 'sm', 'inline'];
  const idx = order.indexOf(preferred);
  const start = idx >= 0 ? idx : 2;

  if (charCount > 24) return 'inline';
  if (charCount > 20) return 'sm';
  if (charCount > 16) return 'md';
  if (charCount > 13 && start < 3) return 'lg';
  if (charCount > 11 && start < 2) return 'xl';
  return order[start] ?? 'md';
}

interface MoneyAmountProps {
  value: number | null | undefined;
  size?: MoneySize;
  tone?: MoneyTone;
  className?: string;
}

export function MoneyAmount({ value, size = 'lg', tone = 'default', className = '' }: MoneyAmountProps) {
  const formatted = formatMoney(value);
  const resolved = shrinkSize(size, formatted.length);

  return (
    <span
      className={`money-amount money-amount--${resolved} money-amount--tone-${tone} ${className}`.trim()}
      title={formatted}
    >
      {formatted}
    </span>
  );
}

interface DeltaAmountProps {
  value: number;
  size?: MoneySize;
  className?: string;
}

export function DeltaAmount({ value, size = 'md', className = '' }: DeltaAmountProps) {
  const formatted = formatDelta(value);
  const tone: MoneyTone = value >= 0 ? 'success' : 'danger';
  const resolved = shrinkSize(size, formatted.length);

  return (
    <span
      className={`money-amount money-amount--${resolved} money-amount--tone-${tone} ${className}`.trim()}
      title={formatted}
    >
      {formatted}
    </span>
  );
}
