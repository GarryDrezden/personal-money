import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSummaries, useBudgetStore, useCurrentMonthSummary } from '../../store/budgetStore';
import { QuickTransactionForm } from '../ledger/QuickTransactionForm';

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const expandedMonthId = useBudgetStore((s) => s.expandedMonthId);
  const summaries = useSummaries();
  const current = useCurrentMonthSummary();

  const monthId =
    expandedMonthId ??
    current?.monthId ??
    summaries[summaries.length - 1]?.monthId;

  if (!monthId) return null;

  return (
    <>
      <button
        type="button"
        className="quick-add-fab btn-primary"
        onClick={() => setOpen(true)}
        aria-label="Добавить операцию"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {open &&
        createPortal(
          <div
            className="quick-add-overlay"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              className="quick-add-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-add-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="quick-add-sheet-header">
                <h2 id="quick-add-title" className="text-lg font-bold">
                  Новая операция
                </h2>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-soft)]"
                  onClick={() => setOpen(false)}
                  aria-label="Закрыть"
                >
                  <X size={20} />
                </button>
              </div>
              <QuickTransactionForm monthId={monthId} compact />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
