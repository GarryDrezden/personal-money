import { useEffect, useMemo, useState } from 'react';

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { QuickStartModal } from './components/onboarding/QuickStartModal';

import { DashboardPage } from './pages/DashboardPage';

import { LedgerPage } from './pages/LedgerPage';

import { AnalyticsPage } from './pages/AnalyticsPage';

import { SettingsPage } from './pages/SettingsPage';

import { FaqPage } from './pages/FaqPage';

import { LoginPage } from './pages/LoginPage';

import { RegisterPage } from './pages/RegisterPage';

import { useBudgetStore } from './store/budgetStore';

import { useAuthStore } from './store/authStore';
import { shouldShowOnboarding } from './utils/onboarding';
import { shouldShowQuickStart } from './utils/quickStart';



function LoadingScreen() {

  return (

    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">

      <p className="text-[var(--app-text-muted)]">Загрузка…</p>

    </div>

  );

}



function ErrorScreen({ message }: { message: string }) {

  return (

    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--app-bg)] p-6 text-center">

      <p className="font-medium text-[var(--app-danger)]">Не удалось подключиться к API</p>

      <p className="text-sm text-[var(--app-text-muted)]">{message}</p>

    </div>

  );

}



function ProtectedApp() {

  const { init, loading, error, transactions, settings } = useBudgetStore();

  const user = useAuthStore((s) => s.user);

  const location = useLocation();

  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [quickStartDismissed, setQuickStartDismissed] = useState(false);

  const showOnboarding = useMemo(() => {
    if (!user || loading || onboardingDismissed) return false;
    return shouldShowOnboarding(user.id, transactions.length, settings.importCompletedAt);
  }, [user, loading, onboardingDismissed, transactions.length, settings.importCompletedAt]);

  const showQuickStart = useMemo(() => {
    if (!user || loading || quickStartDismissed || showOnboarding) return false;
    return shouldShowQuickStart(user.id);
  }, [user, loading, quickStartDismissed, showOnboarding]);



  useEffect(() => {

    if (user) {

      void init();

    }

  }, [init, user]);



  if (!user) {

    return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  }



  if (loading) return <LoadingScreen />;

  if (error) return <ErrorScreen message={error} />;



  return (

    <>

      <Routes>

        <Route element={<AppShell />}>

          <Route path="/" element={<DashboardPage />} />

          <Route path="/ledger" element={<LedgerPage />} />

          <Route path="/analytics" element={<AnalyticsPage />} />

          <Route path="/settings" element={<SettingsPage />} />

          <Route path="/faq" element={<FaqPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>

      </Routes>

      {showOnboarding && user && (
        <OnboardingWizard
          userId={user.id}
          onComplete={() => {
            setOnboardingDismissed(true);
          }}
        />
      )}

      {showQuickStart && user && (
        <QuickStartModal userId={user.id} onClose={() => setQuickStartDismissed(true)} />
      )}

    </>

  );

}



function AuthGate({ children }: { children: React.ReactNode }) {

  const user = useAuthStore((s) => s.user);

  if (user) {

    return <Navigate to="/" replace />;

  }

  return <>{children}</>;

}



export default function App() {

  const { checking, checkSession } = useAuthStore();



  useEffect(() => {

    void checkSession();

  }, [checkSession]);



  if (checking) return <LoadingScreen />;



  return (

    <BrowserRouter>

      <Routes>

        <Route

          path="/login"

          element={

            <AuthGate>

              <LoginPage />

            </AuthGate>

          }

        />

        <Route

          path="/register"

          element={

            <AuthGate>

              <RegisterPage />

            </AuthGate>

          }

        />

        <Route path="/*" element={<ProtectedApp />} />

      </Routes>

    </BrowserRouter>

  );

}


