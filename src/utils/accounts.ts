import type { Account } from '../types';

export function getActiveCreditAccounts(accounts: Account[]): Account[] {
  return accounts
    .filter((a) => a.type === 'credit' && a.isActive && a.status !== 'hidden' && a.status !== 'closed')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
}

export function getPrimaryCreditAccount(accounts: Account[]): Account | undefined {
  return getActiveCreditAccounts(accounts)[0];
}

export function findCreditAccountSummary<T extends { accountId: string }>(
  summaries: T[],
  accounts: Account[],
  accountId?: string,
): T | undefined {
  if (accountId) return summaries.find((s) => s.accountId === accountId);
  const primary = getPrimaryCreditAccount(accounts);
  return primary ? summaries.find((s) => s.accountId === primary.id) : undefined;
}
