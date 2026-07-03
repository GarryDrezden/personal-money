import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  children?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  children,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}>
      <div className="empty-state-icon" aria-hidden>
        <Icon size={compact ? 24 : 32} strokeWidth={1.75} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {children}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="empty-state-action btn-primary">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" className="empty-state-action btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
