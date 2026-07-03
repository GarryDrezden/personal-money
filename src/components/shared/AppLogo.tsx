interface AppLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function LogoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-icon.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-[22%] ${className}`.trim()}
      aria-hidden
    />
  );
}

export function AppLogo({ size = 32, showText = true, className = '' }: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <LogoIcon size={size} />
      {showText && (
        <div className="min-w-0 leading-tight">
          <span className="block text-base font-bold tracking-tight text-[var(--app-text)]">
            Личный бюджет
          </span>
          <span className="block text-[10px] font-medium tracking-wide text-[var(--app-text-muted)]">
            where-is-the-money.ru
          </span>
        </div>
      )}
    </div>
  );
}
