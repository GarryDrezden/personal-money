import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-card-strong)] p-3 shadow-lg md:bottom-6 md:left-auto md:right-6">
      <p className="text-sm">Доступна новая версия приложения</p>
      <button
        type="button"
        className="btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
        onClick={() => void updateServiceWorker(true)}
      >
        <RefreshCw size={14} />
        Обновить
      </button>
      <button
        type="button"
        className="shrink-0 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
        onClick={() => setNeedRefresh(false)}
      >
        Позже
      </button>
    </div>
  );
}
