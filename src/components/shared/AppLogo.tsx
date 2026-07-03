interface AppLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function AppLogo({ size = 32, showText = true, className = '' }: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <defs>
          <linearGradient id="pb-grad" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="0.55" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="pb-shine" x1="20" y1="14" x2="44" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#pb-grad)" />
        <rect x="10" y="10" width="44" height="44" rx="12" fill="url(#pb-shine)" />
        <rect x="14" y="24" width="36" height="24" rx="6" fill="#fff" fillOpacity="0.95" />
        <rect x="14" y="24" width="36" height="9" rx="6" fill="#fff7ed" />
        <path d="M14 31h36" stroke="#fde68a" strokeWidth="1.5" />
        <circle cx="42" cy="37" r="5.5" fill="#92400e" />
        <circle cx="42" cy="37" r="2.5" fill="#fef3c7" />
        <path d="M22 37h9" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M46 16c2.5 0 4.5 2 4.5 4.5S48.5 25 46 25"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
        <circle cx="46" cy="14" r="2.2" fill="#fff" />
      </svg>
      {showText && (
        <div className="min-w-0 leading-tight">
          <span className="block text-base font-bold tracking-tight text-[var(--app-text)]">
            Где деньги?
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
            Personal Budget
          </span>
        </div>
      )}
    </div>
  );
}
