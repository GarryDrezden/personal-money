interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'gold';
  className?: string;
}

const styles = {
  default:
    'bg-[var(--app-card-strong)] text-[var(--app-text-muted)] border border-[var(--app-border)]',
  success:
    'bg-[color-mix(in_srgb,var(--app-success)_16%,var(--app-card-strong))] text-[var(--app-success)]',
  danger:
    'bg-[color-mix(in_srgb,var(--app-danger)_16%,var(--app-card-strong))] text-[var(--app-danger)]',
  gold: 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
