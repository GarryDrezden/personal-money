interface ProgressBarProps {
  value: number;
  max: number;
  status?: 'ok' | 'warning' | 'danger';
}

export function ProgressBar({ value, max, status = 'ok' }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color =
    status === 'danger'
      ? 'var(--app-danger)'
      : status === 'warning'
        ? 'var(--app-warning)'
        : 'var(--app-primary)';

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full"
      style={{ background: 'var(--app-progress-track)' }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
