import { ICON_SLUGS, resolveIconComponent } from '../../utils/icons';

interface IconPickerProps {
  value: string | null;
  onChange: (slug: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className = '' }: IconPickerProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {ICON_SLUGS.map((slug) => {
        const Icon = resolveIconComponent(slug);
        const selected = value === slug;
        return (
          <button
            key={slug}
            type="button"
            title={slug}
            onClick={() => onChange(slug)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              selected
                ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
                : 'border-[var(--app-border)] text-[var(--app-text-muted)] hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]'
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
