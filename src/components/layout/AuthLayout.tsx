import type { ReactNode } from 'react';
import { AppLogo } from '../shared/AppLogo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-page-glow auth-page-glow--left" aria-hidden />
      <div className="auth-page-glow auth-page-glow--right" aria-hidden />

      <div className="auth-page-inner">
        <header className="auth-page-brand">
          <AppLogo size={64} />
          <p className="auth-page-tagline">Счета, траты и аналитика — в одном месте</p>
        </header>

        <div className="auth-page-card surface-panel">
          <h1 className="auth-page-title">{title}</h1>
          <p className="auth-page-subtitle">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
