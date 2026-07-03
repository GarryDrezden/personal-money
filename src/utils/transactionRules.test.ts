import { describe, expect, it } from 'vitest';
import {
  accountDelta,
  isCountedAsExpense,
  isCountedAsIncome,
  isCreditCardPayment,
  isCreditCardSpending,
  isIgnored,
  isInternalTransfer,
} from './transactionRules';
import { CREDIT_ACCOUNT, MAIN_ACCOUNT, SHARED_ACCOUNT, tx } from '../test/fixtures';

describe('transactionRules', () => {
  it('isIgnored excludes transaction from calculations', () => {
    const ignored = tx({
      id: '1',
      monthId: 'm1',
      expenseAmount: 1000,
      paymentStatus: 'ignored',
    });
    expect(isIgnored(ignored)).toBe(true);
    expect(isCountedAsExpense(ignored)).toBe(false);
    expect(accountDelta(ignored, MAIN_ACCOUNT.id)).toBe(0);
  });

  it('transfer kind is internal and not expense/income', () => {
    const transfer = tx({
      id: '2',
      monthId: 'm1',
      operationKind: 'transfer',
      expenseAmount: 5000,
      targetAccountId: SHARED_ACCOUNT.id,
    });
    expect(isInternalTransfer(transfer)).toBe(true);
    expect(isCountedAsExpense(transfer)).toBe(false);
    expect(isCountedAsIncome(transfer)).toBe(false);
  });

  it('target account + expense counts as internal transfer', () => {
    const legacy = tx({
      id: '3',
      monthId: 'm1',
      operationKind: 'regular',
      expenseAmount: 3000,
      targetAccountId: SHARED_ACCOUNT.id,
    });
    expect(isInternalTransfer(legacy)).toBe(true);
    expect(isCountedAsExpense(legacy)).toBe(false);
  });

  it('regular expense is counted', () => {
    const expense = tx({
      id: '4',
      monthId: 'm1',
      expenseAmount: 500,
      categoryId: 'food',
    });
    expect(isCountedAsExpense(expense)).toBe(true);
  });

  it('correction is not counted as expense', () => {
    const correction = tx({
      id: '5',
      monthId: 'm1',
      operationKind: 'correction',
      expenseAmount: 200,
    });
    expect(isCountedAsExpense(correction)).toBe(false);
  });

  it('transfer income side is not counted as income', () => {
    const transfer = tx({
      id: '6',
      monthId: 'm1',
      operationKind: 'transfer',
      expenseAmount: 5000,
      targetAccountId: SHARED_ACCOUNT.id,
    });
    expect(isCountedAsIncome(transfer)).toBe(false);
  });

  it('credit card payment via transfer reduces debt path', () => {
    const payment = tx({
      id: '7',
      monthId: 'm1',
      operationKind: 'transfer',
      expenseAmount: 10000,
      accountId: MAIN_ACCOUNT.id,
      targetAccountId: CREDIT_ACCOUNT.id,
    });
    expect(isCreditCardPayment(payment, CREDIT_ACCOUNT.id)).toBe(true);
    expect(isCountedAsExpense(payment)).toBe(false);
  });

  it('credit card spending is detected', () => {
    const purchase = tx({
      id: '8',
      monthId: 'm1',
      accountId: CREDIT_ACCOUNT.id,
      expenseAmount: 2500,
      categoryId: 'food',
    });
    expect(isCreditCardSpending(purchase, CREDIT_ACCOUNT.id)).toBe(true);
    expect(isCountedAsExpense(purchase)).toBe(true);
  });

  it('accountDelta subtracts expense from source account', () => {
    const expense = tx({
      id: '9',
      monthId: 'm1',
      accountId: MAIN_ACCOUNT.id,
      expenseAmount: 1000,
    });
    expect(accountDelta(expense, MAIN_ACCOUNT.id)).toBe(-1000);
  });

  it('accountDelta moves money on transfer between accounts', () => {
    const transfer = tx({
      id: '10',
      monthId: 'm1',
      operationKind: 'transfer',
      accountId: MAIN_ACCOUNT.id,
      targetAccountId: SHARED_ACCOUNT.id,
      expenseAmount: 5000,
    });
    expect(accountDelta(transfer, MAIN_ACCOUNT.id)).toBe(-5000);
    expect(accountDelta(transfer, SHARED_ACCOUNT.id)).toBe(5000);
  });
});
