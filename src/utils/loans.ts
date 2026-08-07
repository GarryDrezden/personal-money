import type { Loan, Transaction } from '../types';
import { normalizeTitle } from './categorize';
import { currentYearMonth } from './budget';

export function getActiveLoans(loans: Loan[]): Loan[] {
  return loans
    .filter((l) => l.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
}

export function totalMonthlyLoanPayments(loans: Loan[]): number {
  return getActiveLoans(loans).reduce((sum, l) => sum + l.monthlyPayment, 0);
}

function isLoanPaymentTx(tx: Transaction, loan: Loan): boolean {
  if (tx.paymentStatus === 'ignored') return false;
  if (tx.operationKind !== 'debt_payment' && tx.categoryId !== 'credits') return false;
  const name = normalizeTitle(tx.expenseName ?? '');
  return name === normalizeTitle(loan.name);
}

/** Сколько уже уплачено по кредиту в указанном YYYY-MM. */
export function loanPaidInMonth(
  loan: Loan,
  transactions: Transaction[],
  yearMonth: string,
): number {
  return transactions
    .filter((tx) => {
      if (!isLoanPaymentTx(tx, loan)) return false;
      const ym = tx.txDate?.slice(0, 7);
      return ym === yearMonth;
    })
    .reduce((sum, tx) => sum + (tx.expenseAmount ?? 0), 0);
}

export function isLoanPaidThisMonth(
  loan: Loan,
  transactions: Transaction[],
  yearMonth = currentYearMonth(),
): boolean {
  return loanPaidInMonth(loan, transactions, yearMonth) + 0.01 >= loan.monthlyPayment;
}
