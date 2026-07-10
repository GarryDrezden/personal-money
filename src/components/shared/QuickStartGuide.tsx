import { Link } from 'react-router-dom';
import { QUICK_START_INTRO, QUICK_START_STEPS } from '../../constants/quickStart';

interface QuickStartGuideProps {
  onNavigate?: () => void;
  compact?: boolean;
}

export function QuickStartGuide({ onNavigate, compact = false }: QuickStartGuideProps) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <p className="text-sm text-[var(--app-text-muted)]">{QUICK_START_INTRO}</p>
      <ol className="space-y-3">
        {QUICK_START_STEPS.map(({ icon: Icon, title, body, link }) => (
          <li
            key={title}
            className="flex gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">{body}</p>
              {link && (
                <Link
                  to={link.to}
                  onClick={onNavigate}
                  className="mt-2 inline-block text-sm font-medium text-[var(--app-primary)] hover:underline"
                >
                  {link.label} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
