import type { Account, BudgetMonth, Transaction } from '../types';

export function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'monthId'>): Transaction {
  return {
    sortOrder: 1,
    txDate: '2025-06-15',
    expenseName: null,
    expenseAmount: null,
    incomeSource: null,
    incomeAmount: null,
    category: null,
    accountId: 'main_card',
    targetAccountId: null,
    categoryId: null,
    operationKind: 'regular',
    paymentStatus: 'done',
    note: '',
    ...partial,
  };
}

export function month(partial: Partial<BudgetMonth> & Pick<BudgetMonth, 'id' | 'yearMonth'>): BudgetMonth {
  return {
    sortOrder: 1,
    openingBalance: null,
    importedBalance: null,
    collapsed: true,
    ...partial,
  };
}

export const MAIN_ACCOUNT: Account = {
  id: 'main_card',
  name: 'Основная карта',
  type: 'debit',
  color: 'orange',
  icon: 'credit-card',
  initialBalance: 0,
  creditLimit: null,
  status: 'active',
  isActive: true,
  sortOrder: 1,
};

export const SHARED_ACCOUNT: Account = {
  id: 'shared_card',
  name: 'Общая карта',
  type: 'debit',
  color: 'green',
  icon: 'wallet',
  initialBalance: 0,
  creditLimit: null,
  status: 'active',
  isActive: true,
  sortOrder: 2,
};

export const CREDIT_ACCOUNT: Account = {
  id: 'credit_card',
  name: 'Кредитка',
  type: 'credit',
  color: 'red',
  icon: 'badge-ruble',
  initialBalance: 100000,
  creditLimit: 100000,
  status: 'active',
  isActive: true,
  sortOrder: 3,
};
