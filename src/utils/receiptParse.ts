export interface ReceiptItem {
  name: string;
  amount: number;
  count: number;
}

export interface ReceiptParseResult {
  store: string | null;
  date: string | null;
  total: number | null;
  items: ReceiptItem[];
}

const SKIP_LINE =
  /^(арт\.|списание|акция по карте|начислено бонусов|ваша выгода|оплата по|банковск|ндс(?:\s|$)|способ расчета|предмет расчета|кассир|сайт |фд(?:\s|$)|фн(?:\s|$)|фпд(?:\s|$)|рн ккт|версия ффд|код формы|телефон или эл|эл\. адрес|смен[аы]\s*№|чек\s*№|кассовый чек|приход$|безналичн|наличн|предварительн|последующ|сумма встречн|№ авт|сно(?:\s|$)|^\*{2,}|карта «|чек отправлен|место расчетов|инн(?:\s|$)|дата\s*\|)/i;

const TOTAL_LINE = /^(итого|итог)(?:\s|$)/i;
const QTY_AMOUNT =
  /^(\d+(?:[.,]\d+)?)\s*(шт\.?|кг)\s+(\d[\d\s]*(?:[.,]\d{1,2})?)\s*руб/i;
const PRICE_QTY = /цена\s*\*\s*кол/i;
const EQUALS_AMOUNT = /=\s*(\d[\d\s]*(?:[.,]\d{1,2})?)\s*$/;
const GENERIC_AMOUNT =
  /^(.+?)\s+[—–\-]\s+(\d[\d\s]*[.,]\d{2})\s*(?:₽|руб\.?)?\s*$|^(.+?)\s+(\d[\d\s]*[.,]\d{2})\s*(?:₽|руб\.?)\s*$/;

export function parseRuAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeName(name: string): string {
  return name
    .replace(/\t+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\d+\s*\.{2,}\s*/, '')
    .replace(/^\d+\s*\.\s*/, '')
    .trim();
}

function isSkipLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (SKIP_LINE.test(t)) return true;
  if (TOTAL_LINE.test(t)) return true;
  return false;
}

function detectStore(text: string): string | null {
  if (/глобус/i.test(text)) return 'Глобус';
  if (/перекр[её]сток/i.test(text)) return 'Перекрёсток';
  if (/пят[её]рочка/i.test(text)) return 'Пятёрочка';
  if (/магнит/i.test(text)) return 'Магнит';
  if (/лента/i.test(text)) return 'Лента';
  if (/ашан|auchan/i.test(text)) return 'Ашан';
  return null;
}

function detectDate(text: string): string | null {
  const m = text.match(/(\d{2})[.](\d{2})[.](\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function detectTotal(lines: string[]): number | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!TOTAL_LINE.test(line)) continue;
    const m = line.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)/);
    if (!m) continue;
    const amount = parseRuAmount(m[1]);
    if (amount != null && amount > 0) return amount;
  }
  return null;
}

function uniqueName(raw: string): string {
  const cleaned = normalizeName(raw);
  const parts = cleaned.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && (parts[0] === parts[1] || parts[1].startsWith(parts[0]))) {
    return parts[1].length >= parts[0].length ? parts[1] : parts[0];
  }
  return cleaned;
}

export function mergeReceiptItems(
  items: { name: string; amount: number; count?: number }[],
): ReceiptItem[] {
  const map = new Map<string, ReceiptItem>();
  for (const item of items) {
    const name = uniqueName(item.name);
    if (!name || item.amount <= 0) continue;
    const key = name.toLowerCase();
    const addCount = item.count ?? 1;
    const prev = map.get(key);
    if (prev) {
      prev.amount += item.amount;
      prev.count += addCount;
    } else {
      map.set(key, { name, amount: item.amount, count: addCount });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'),
  );
}

function parseStructuredItems(lines: string[]): { name: string; amount: number }[] {
  const items: { name: string; amount: number }[] = [];
  let pending = '';

  const takePending = (): string => {
    const name = pending;
    pending = '';
    return name;
  };

  const addPending = (line: string) => {
    pending = pending ? `${pending} ${line}` : line;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const qtyMatch = line.match(QTY_AMOUNT);
    if (qtyMatch) {
      const amount = parseRuAmount(qtyMatch[3]);
      const name = takePending();
      if (name && amount != null && amount > 0) items.push({ name, amount });
      continue;
    }

    if (PRICE_QTY.test(line)) {
      const eq = line.match(EQUALS_AMOUNT);
      const amount = eq ? parseRuAmount(eq[1]) : null;
      const name = takePending();
      if (name && amount != null && amount > 0) items.push({ name, amount });
      continue;
    }

    if (isSkipLine(line)) continue;
    addPending(line);
  }

  return items;
}

function parseGenericItems(lines: string[]): { name: string; amount: number }[] {
  const items: { name: string; amount: number }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || isSkipLine(line) || QTY_AMOUNT.test(line) || PRICE_QTY.test(line)) continue;
    const m = line.match(GENERIC_AMOUNT);
    if (!m) continue;
    const name = (m[1] || m[3] || '').trim();
    const amount = parseRuAmount(m[2] || m[4] || '');
    if (!name || name.length < 2 || amount == null || amount <= 0) continue;
    if (/^\d+$/.test(name)) continue;
    items.push({ name, amount });
  }
  return items;
}

export function parseReceiptText(text: string | null | undefined): ReceiptParseResult {
  const raw = (text ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) {
    return { store: null, date: null, total: null, items: [] };
  }
  const lines = raw.split('\n');
  let items = parseStructuredItems(lines);
  if (items.length < 2) {
    const generic = parseGenericItems(lines);
    if (generic.length > items.length) items = generic;
  }
  return {
    store: detectStore(raw),
    date: detectDate(raw),
    total: detectTotal(lines),
    items: mergeReceiptItems(items),
  };
}

export function receiptPreviewLabel(parsed: ReceiptParseResult): string | null {
  if (!parsed.items.length && parsed.total == null && !parsed.store) return null;
  const parts: string[] = [];
  if (parsed.store) parts.push(parsed.store);
  if (parsed.date) {
    const [y, m, d] = parsed.date.split('-');
    parts.push(`${d}.${m}.${y}`);
  }
  if (parsed.items.length) parts.push(`${parsed.items.length} позиц.`);
  if (parsed.total != null) {
    parts.push(
      `${parsed.total.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`,
    );
  }
  return parts.join(' · ');
}
