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

export function suggestCategory(title: string): string | null {
  const lower = title.toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.categoryId;
    }
  }
  return null;
}
