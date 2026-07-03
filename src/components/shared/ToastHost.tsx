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
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm shadow-lg ${
            t.type === 'error'
              ? 'bg-[var(--app-danger)] text-white'
              : 'bg-[var(--app-success)] text-white'
          }`}
          onClick={() => dismissToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
