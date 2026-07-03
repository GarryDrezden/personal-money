import { useEffect, useState } from 'react';
import type { Transaction } from '../../types';

export function useDebouncedTransaction(
  tx: Transaction,
  onSave: (tx: Transaction) => void,
  delay = 600,
) {
  const [draft, setDraft] = useState(tx);

  useEffect(() => {
    setDraft(tx);
  }, [tx]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(draft) !== JSON.stringify(tx)) onSave(draft);
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, tx, onSave, delay]);

  return [draft, setDraft] as const;
}

export const TX_KIND_LABELS: Record<string, string> = {
  regular: '—',
  transfer: '⇄',
  debt_payment: 'кредит',
  credit_card_payment: 'кредитка',
  correction: '±',
};
