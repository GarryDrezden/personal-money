import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`surface-panel ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--app-text-muted)]">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
