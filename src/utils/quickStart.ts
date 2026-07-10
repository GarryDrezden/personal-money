const QUICK_START_PREFIX = 'personal-budget-quickstart-';

export function isQuickStartDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(`${QUICK_START_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markQuickStartDismissed(userId: string): void {
  try {
    localStorage.setItem(`${QUICK_START_PREFIX}${userId}`, '1');
  } catch {
    /* ignore */
  }
}

export function shouldShowQuickStart(userId: string): boolean {
  return !isQuickStartDismissed(userId);
}
