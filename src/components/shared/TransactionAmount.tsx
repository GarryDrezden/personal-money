import type { Transaction } from '../../types';
import { getTransactionDisplay } from '../../utils/budget';

const KIND_CLASS: Record<string, string> = {
  expense: 'text-[var(--app-danger)]',
  income: 'text-[var(--app-success)]',
  transfer: 'text-[var(--app-text-muted)]',
  correction: 'text-[var(--app-warning)]',
  neutral: 'text-[var(--app-text)]',
};

interface TransactionAmountProps {
  tx: Transaction;
  className?: string;
}

export function TransactionAmount({ tx, className = '' }: TransactionAmountProps) {
  const { kind, signedText } = getTransactionDisplay(tx);
  return (
    <span className={`shrink-0 font-medium ${KIND_CLASS[kind]} ${className}`}>
      {signedText}
    </span>
  );
}
