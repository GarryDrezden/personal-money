const ONBOARDING_PREFIX = 'personal-budget-onboarding-';

export function isOnboardingCompleted(userId: string): boolean {
  try {
    return localStorage.getItem(`${ONBOARDING_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(userId: string): void {
  try {
    localStorage.setItem(`${ONBOARDING_PREFIX}${userId}`, '1');
  } catch {
    /* ignore */
  }
}

export function shouldShowOnboarding(
  userId: string,
  transactionCount: number,
  importCompletedAt: string | null,
): boolean {
  if (isOnboardingCompleted(userId)) return false;
  if (importCompletedAt) return false;
  if (transactionCount > 0) return false;
  return true;
}

export const DEFAULT_ONBOARDING_EXPENSE_IDS = [
  'food',
  'monthly',
  'transport',
  'entertainment',
  'other',
] as const;
