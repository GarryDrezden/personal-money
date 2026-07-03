import type { MonthSummary } from '../../types';
import { formatDelta, formatMoney } from '../../utils/budget';
import { formatYearMonth } from '../../constants/categories';

const RPG_LABELS = {
  victory: '🏆 Победа',
  neutral: '⚖ Нейтрально',
  danger: '💀 Минус месяца',
} as const;

interface LedgerMonthPanelProps {
  summary: MonthSummary;
}

export function LedgerMonthPanel({ summary }: LedgerMonthPanelProps) {
  const balance = summary.importedBalance ?? summary.computedBalance;
  const rpgClass =
    summary.rpgStatus === 'victory'
      ? 'rpg-victory'
      : summary.rpgStatus === 'danger'
        ? 'rpg-danger'
        : 'rpg-neutral';

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="font-semibold">{formatYearMonth(summary.yearMonth)}</span>
      <span className={rpgClass}>{RPG_LABELS[summary.rpgStatus]}</span>
      <span className="text-[var(--app-text-muted)]">
        {summary.transactionCount} оп.
      </span>
      <span>Δ {formatDelta(summary.delta)}</span>
      <span>баланс {formatMoney(balance)}</span>
    </div>
  );
}
