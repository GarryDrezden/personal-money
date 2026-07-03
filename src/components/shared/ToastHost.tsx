import { useBudgetStore } from '../../store/budgetStore';

export function ToastHost() {
  const toasts = useBudgetStore((s) => s.toasts);
  const dismissToast = useBudgetStore((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm shadow-lg ${
            t.type === 'error'
              ? 'bg-[var(--app-danger)] text-white'
              : 'bg-[var(--app-success)] text-white'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          {t.actionLabel && t.onAction && (
            <button
              type="button"
              className="shrink-0 rounded-md bg-white/20 px-2 py-1 text-xs font-semibold hover:bg-white/30"
              onClick={() => {
                void t.onAction?.();
                dismissToast(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
          {!t.actionLabel && (
            <button
              type="button"
              className="sr-only"
              onClick={() => dismissToast(t.id)}
            >
              Закрыть
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
