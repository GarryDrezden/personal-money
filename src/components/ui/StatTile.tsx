interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative' | 'neutral';
}

const TONE_CLASS = {
  positive: 'text-[var(--app-success)]',
  negative: 'text-[var(--app-danger)]',
  neutral: 'text-[var(--app-text)]',
};

export function StatTile({ label, value, sub, tone = 'neutral' }: StatTileProps) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-3 text-center backdrop-blur-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">{label}</div>
      <div className={`mt-1 text-xl font-bold ${TONE_CLASS[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--app-text-muted)]">{sub}</div>}
    </div>
  );
}
