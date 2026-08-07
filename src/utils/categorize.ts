import type { Transaction } from '../types';

const RULES: { keywords: string[]; categoryId: string }[] = [
  { keywords: ['пятерочка', 'пятёрочка', 'дикси', 'магнит', 'ашан', 'лента', 'вкусвилл', 'перекресток', 'перекрёсток', 'глобус'], categoryId: 'food' },
  { keywords: ['ozon', 'озон', 'wildberries', 'вайлдберриз', 'яндекс маркет'], categoryId: 'marketplace' },
  { keywords: ['ggsel', 'steam', 'playstation', 'xbox'], categoryId: 'games' },
  { keywords: ['аптека', 'здрав', 'горздрав'], categoryId: 'health' },
  { keywords: ['азс', 'лукойл', 'газпром', 'роснефть', 'бензин'], categoryId: 'car' },
  { keywords: ['пиво', 'вино', 'красное белое', 'винлаб'], categoryId: 'alcohol' },
  { keywords: ['кредит', 'ипотека', 'сбер кредит', 'тиньков машина'], categoryId: 'credits' },
  { keywords: ['мосэнерго', 'мегафон', 'бизби', 'жкх'], categoryId: 'monthly' },
  { keywords: ['стануша'], categoryId: 'stanusha' },
  { keywords: ['контур'], categoryId: 'salary' },
];

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleOf(tx: Transaction): string {
  return normalizeTitle(tx.expenseName ?? tx.incomeSource ?? '');
}

/** Самая частая (при ничьей — самая свежая) категория по точному совпадению названия. */
export function suggestCategoryFromHistory(
  title: string,
  transactions: Transaction[],
): string | null {
  const needle = normalizeTitle(title);
  if (needle.length < 2) return null;

  const counts = new Map<string, { count: number; lastSort: number }>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx.categoryId || tx.paymentStatus === 'ignored') continue;
    const name = titleOf(tx);
    if (!name || name !== needle) continue;

    const prev = counts.get(tx.categoryId);
    const sortKey = i;
    if (!prev) {
      counts.set(tx.categoryId, { count: 1, lastSort: sortKey });
    } else {
      counts.set(tx.categoryId, {
        count: prev.count + 1,
        lastSort: Math.max(prev.lastSort, sortKey),
      });
    }
  }

  if (!counts.size) return null;

  let bestId: string | null = null;
  let bestCount = 0;
  let bestSort = -1;
  for (const [id, { count, lastSort }] of counts) {
    if (count > bestCount || (count === bestCount && lastSort > bestSort)) {
      bestId = id;
      bestCount = count;
      bestSort = lastSort;
    }
  }
  return bestId;
}

function suggestCategoryFromRules(title: string): string | null {
  const lower = title.toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.categoryId;
    }
  }
  return null;
}

/**
 * Подсказка категории: сначала история операций (точное совпадение названия),
 * затем статические keyword-правила.
 */
export function suggestCategory(
  title: string,
  transactions: Transaction[] = [],
): string | null {
  return suggestCategoryFromHistory(title, transactions) ?? suggestCategoryFromRules(title);
}
