import type { LucideProps } from 'lucide-react';
import { useBudgetStore } from '../../store/budgetStore';
import { categoryName } from '../../utils/budget';
import { resolveCategoryIconComponent } from '../../utils/categoryIcons';
import { colorHex } from '../../utils/icons';

interface CategoryIconProps extends Omit<LucideProps, 'ref' | 'color'> {
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
  const cat = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const Icon = resolveCategoryIconComponent(categories, categoryId, legacyName);
  const tint = colorHex(cat?.color ?? 'pink');
  const box = Number(size) + 10;

  return (
    <span
      className={`cozy-icon-badge inline-flex shrink-0 items-center justify-center rounded-lg ${className}`.trim()}
      style={{
        width: box,
        height: box,
        backgroundColor: `${tint}22`,
        color: tint,
      }}
    >
      <Icon size={size} aria-hidden {...props} />
    </span>
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
