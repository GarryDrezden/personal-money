import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'success' | 'danger' | 'neutral';
}

const variants = {
  default: 'bg-[var(--app-card)] border-[var(--app-border)]',
  success:
    'border-[color-mix(in_srgb,var(--app-success)_40%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-success)_10%,var(--app-card))]',
  danger:
    'border-[color-mix(in_srgb,var(--app-danger)_40%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_10%,var(--app-card))]',
  neutral: 'bg-[var(--app-bg-soft)] border-[var(--app-border)]',
};

export function Card({
  children,
  className = '',
  onClick,
  variant = 'default',
}: CardProps) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-[var(--app-shadow)] backdrop-blur-sm ${variants[variant]} ${onClick ? 'cursor-pointer transition-shadow hover:brightness-[1.02]' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  );
}
