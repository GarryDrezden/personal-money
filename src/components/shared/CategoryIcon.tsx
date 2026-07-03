import type { LucideProps } from 'lucide-react';
import { useBudgetStore } from '../../store/budgetStore';
import { categoryName } from '../../utils/budget';
import { resolveCategoryIconComponent } from '../../utils/categoryIcons';

interface CategoryIconProps extends Omit<LucideProps, 'ref'> {
  categoryId?: string | null;
  legacyName?: string | null;
}

export function CategoryIcon({
  categoryId,
  legacyName,
  size = 16,
  className = '',
  ...props
}: CategoryIconProps) {
  const categories = useBudgetStore((s) => s.categories);
  const Icon = resolveCategoryIconComponent(categories, categoryId, legacyName);

  return (
    <Icon
      size={size}
      className={`shrink-0 text-[var(--app-primary)] ${className}`.trim()}
      aria-hidden
      {...props}
    />
  );
}

interface CategoryLabelProps {
  categoryId?: string | null;
  name?: string;
  legacyName?: string | null;
  iconSize?: number;
  className?: string;
}

export function CategoryLabel({
  categoryId,
  name,
  legacyName,
  iconSize = 16,
  className = '',
}: CategoryLabelProps) {
  const categories = useBudgetStore((s) => s.categories);
  const label = name ?? legacyName ?? categoryName(categories, categoryId ?? null);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`.trim()}>
      <CategoryIcon categoryId={categoryId} legacyName={legacyName} size={iconSize} />
      <span>{label}</span>
    </span>
  );
}
