import { useMemo, useState } from 'react';
import type { AccountMonthSummary } from '../../types';
import {
  creditAvailableDelta,
  creditDebtAmount,
  formatMoney,
  parseMoneyInput,
} from '../../utils/budget';
import { useBudgetStore } from '../../store/budgetStore';
import { MoneyInput } from '../shared/MoneyInput';

interface CreditReconcileModalProps {
  monthId: string;
  summary: AccountMonthSummary;
  onClose: () => void;
}

export function CreditReconcileModal({ monthId, summary, onClose }: CreditReconcileModalProps) {
  const reconcileCreditCard = useBudgetStore((s) => s.reconcileCreditCard);
  const showToast = useBudgetStore((s) => s.showToast);

  const limit = summary.creditLimit ?? 380_000;
  const currentAvail = summary.closingAvailable ?? summary.closingBalance + limit;
  const debt = creditDebtAmount(summary);

  const [input, setInput] = useState(String(Math.round(currentAvail)));
  const [busy, setBusy] = useState(false);

  const target = useMemo(() => parseMoneyInput(input), [input]);
  const diff = target != null ? creditAvailableDelta(summary, target) : null;

  const handleSubmit = async () => {
    if (target == null || !Number.isFinite(target) || target < 0 || target > limit) {
      showToast('Укажите сумму от 0 до лимита', 'error');
      return;
    }
    if (diff != null && Math.abs(diff) < 1) {
      showToast('Кредитка уже совпадает с банком', 'error');
      return;
    }

    setBusy(true);
    try {
      await reconcileCreditCard(monthId, target);
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--app-border)] bg-[var(--app-card-strong)] p-4 shadow-xl">
        <h3 className="font-semibold">Сверка с банком</h3>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          Лимит {formatMoney(limit)} · долг {formatMoney(debt)}
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-lg bg-[var(--app-bg-soft)] p-3">
            <div className="flex justify-between gap-2">
              <span className="text-[var(--app-text-muted)]">Доступно в приложении</span>
              <span className="font-medium">{formatMoney(currentAvail)}</span>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            Доступно по банку
            <MoneyInput value={input} onChange={setInput} />
          </label>

          {diff != null && Math.abs(diff) >= 1 && (
            <p className="text-[var(--app-text-muted)]">
              Будет создана коррекция{' '}
              <strong className={diff > 0 ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'}>
                {diff > 0 ? '+' : '−'}
                {formatMoney(Math.abs(diff))}
              </strong>
            </p>
          )}
          {diff != null && Math.abs(diff) < 1 && (
            <p className="text-[var(--app-success)]">Совпадает с банком</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-[var(--app-primary)] px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void handleSubmit()}
          >
            Сверить
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm"
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
