import type { OperationKind, PaymentStatus, Transaction } from '../types';

const CREDIT_PAYMENT_CATEGORIES = new Set(['transfer', 'credit_card_payment']);

export function isIgnored(tx: Transaction): boolean {
  return tx.paymentStatus === 'ignored';
}

/** Пополнение кредитки: перевод или платёж на счёт типа credit. */
export function isCreditCardPayment(tx: Transaction, creditAccountId: string): boolean {
  if (isIgnored(tx)) return false;
  const amount = txAmount(tx);
  if (amount <= 0) return false;

  if (tx.targetAccountId === creditAccountId) {
    return tx.operationKind === 'credit_card_payment' || tx.operationKind === 'transfer';
  }

  // Ошибочно записан как расход на кредитке с категорией перевода
  if (
    tx.accountId === creditAccountId
    && tx.operationKind === 'regular'
    && (tx.expenseAmount ?? 0) > 0
    && tx.categoryId != null
    && CREDIT_PAYMENT_CATEGORIES.has(tx.categoryId)
  ) {
    return true;
  }

  return false;
}

/** Возврат / зачисление на кредитку — уменьшает долг. */
export function isCreditCardDebtReduction(tx: Transaction, creditAccountId: string): boolean {
  if (isIgnored(tx)) return false;
  return (
    tx.accountId === creditAccountId
    && tx.operationKind === 'regular'
    && (tx.incomeAmount ?? 0) > 0
    && !(tx.expenseAmount ?? 0)
  );
}

/** Трата с кредитки (покупка), не пополнение и не возврат. */
export function isCreditCardSpending(tx: Transaction, creditAccountId: string): boolean {
  if (isIgnored(tx)) return false;
  if (isCreditCardPayment(tx, creditAccountId)) return false;
  if (isCreditCardDebtReduction(tx, creditAccountId)) return false;
  return (
    tx.accountId === creditAccountId
    && tx.operationKind === 'regular'
    && (tx.expenseAmount ?? 0) > 0
  );
}

export function txAmount(tx: Transaction): number {
  return Math.abs(tx.expenseAmount ?? 0) || Math.abs(tx.incomeAmount ?? 0);
}

/** Перевод между своими счетами — не расход и не доход в аналитике. */
export function isInternalTransfer(tx: Transaction): boolean {
  if (isIgnored(tx)) return false;
  const kind = tx.operationKind;
  if (kind === 'transfer' || kind === 'credit_card_payment') return true;
  if (tx.categoryId === 'transfer' || tx.categoryId === 'credit_card_payment') return true;
  if (tx.targetAccountId && (tx.expenseAmount ?? 0) > 0) return true;
  return false;
}

export function isCountedAsExpense(tx: Transaction): boolean {
  if (isIgnored(tx)) return false;
  if (isInternalTransfer(tx)) return false;
  const kind = tx.operationKind;
  if (kind === 'correction') return false;
  if (kind === 'debt_payment') return (tx.expenseAmount ?? 0) > 0;
  return (tx.expenseAmount ?? 0) > 0 && kind === 'regular';
}

export function isCountedAsIncome(tx: Transaction): boolean {
  if (isIgnored(tx)) return false;
  if (isInternalTransfer(tx)) return false;
  if (tx.operationKind !== 'regular') return false;
  return (tx.incomeAmount ?? 0) > 0;
}

export function accountDelta(tx: Transaction, accountId: string): number {
  if (isIgnored(tx)) return 0;
  let delta = 0;
  const amount = txAmount(tx);
  const kind = tx.operationKind;

  if (tx.accountId === accountId) {
    if (kind === 'correction') {
      delta += tx.incomeAmount ?? -(tx.expenseAmount ?? 0);
      if (tx.incomeAmount == null && tx.expenseAmount == null) delta = 0;
      if (tx.expenseAmount != null && tx.incomeAmount == null) delta = -(tx.expenseAmount);
      if (tx.incomeAmount != null) delta = tx.incomeAmount;
    } else if (kind === 'transfer' || kind === 'credit_card_payment') {
      delta -= amount;
    } else if ((tx.expenseAmount ?? 0) > 0) {
      delta -= tx.expenseAmount ?? 0;
    } else if ((tx.incomeAmount ?? 0) > 0) {
      delta += tx.incomeAmount ?? 0;
    }
  }

  if (tx.targetAccountId === accountId) {
    if (kind === 'transfer' || kind === 'credit_card_payment') {
      delta += amount;
    }
  }

  return delta;
}

export function getOperationLabel(kind: OperationKind): string {
  const map: Record<OperationKind, string> = {
    regular: 'Обычная',
    transfer: 'Перевод',
    debt_payment: 'Кредит',
    credit_card_payment: 'Кредитка',
    correction: 'Корректировка',
  };
  return map[kind] ?? kind;
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    done: 'Проведено',
    planned: 'Запланировано',
    ignored: 'Игнор',
  };
  return map[status] ?? status;
}
