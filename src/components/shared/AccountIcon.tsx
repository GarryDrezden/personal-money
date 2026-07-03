import type { LucideProps } from 'lucide-react';
import { colorHex, resolveIconComponent } from '../../utils/icons';

interface AccountIconProps extends Omit<LucideProps, 'ref' | 'color'> {
  icon?: string | null;
  accountColor?: string | null;
}

export function AccountIcon({
  icon,
  accountColor,
  size = 18,
  className = '',
  ...props
}: AccountIconProps) {
  const Icon = resolveIconComponent(icon);
  const tint = colorHex(accountColor);
  const box = Number(size) + 10;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${className}`.trim()}
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
