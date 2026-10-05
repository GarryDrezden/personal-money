import { describe, expect, it } from 'vitest';
import globus from '../test/receipts/globus.txt?raw';
import perek from '../test/receipts/perekrestok.txt?raw';
import { parseReceiptText, receiptPreviewLabel, serializeReceipt } from './receiptParse';

describe('parseReceiptText', () => {
  it('parses Globus loyalty receipt: store, date, total, merged items', () => {
    const parsed = parseReceiptText(globus);
    expect(parsed.store).toBe('Глобус');
    expect(parsed.date).toBe('2026-10-04');
    expect(parsed.total).toBe(12129);
    expect(parsed.items[0]).toMatchObject({ name: 'КОФЕ ЗЕР FRESCO GUATEMALA М/У 900Г', amount: 1572.77, count: 1 });
    const milk = parsed.items.find((i) => i.name.includes('МОЛОКО ВОЛОГЖАНКА'));
    expect(milk).toMatchObject({ amount: 212.3, count: 2 });
    expect(parsed.items.some((i) => /списание|акция/i.test(i.name))).toBe(false);
  });

  it('parses Perekrestok OFD receipt lines with price * qty', () => {
    const parsed = parseReceiptText(perek);
    expect(parsed.store).toBe('Перекрёсток');
    expect(parsed.date).toBe('2026-09-11');
    expect(parsed.total).toBe(4504.42);
    expect(parsed.items[0].name).toMatch(/Крев/i);
    expect(parsed.items[0].amount).toBe(949.99);
    const cucumber = parsed.items.find((i) => /Огурцы/i.test(i.name));
    expect(cucumber?.amount).toBe(153.26);
  });

  it('parses GPT-style dashed list', () => {
    const parsed = parseReceiptText(
      'Пятёрочка\nМолоко — 89,90 ₽\nХлеб — 62,00 руб.\nИтого 151,90',
    );
    expect(parsed.store).toBe('Пятёрочка');
    expect(parsed.total).toBe(151.9);
    expect(parsed.items).toEqual([
      { name: 'Молоко', amount: 89.9, count: 1 },
      { name: 'Хлеб', amount: 62, count: 1 },
    ]);
  });

  it('returns empty result for blank text', () => {
    expect(parseReceiptText('')).toEqual({ store: null, date: null, total: null, items: [] });
  });

  it('builds a preview label', () => {
    const label = receiptPreviewLabel(parseReceiptText(globus));
    expect(label).toContain('Глобус');
    expect(label).toContain('04.10.2026');
    expect(label).toContain('позиц');
  });
});

describe('serializeReceipt', () => {
  it('round-trips a dashed list', () => {
    const text = serializeReceipt({
      store: 'Глобус',
      date: '2026-10-04',
      total: 186.15,
      items: [
        { name: 'Молоко', amount: 106.15, count: 1 },
        { name: 'Хлеб', amount: 80, count: 1 },
      ],
    });
    expect(text).toBe(
      ['Глобус', '04.10.2026', 'Молоко — 106,15', 'Хлеб — 80,00', 'Итого 186,15'].join('\n'),
    );
    const parsed = parseReceiptText(text);
    expect(parsed.store).toBe('Глобус');
    expect(parsed.date).toBe('2026-10-04');
    expect(parsed.total).toBe(186.15);
    expect(parsed.items).toEqual([
      { name: 'Молоко', amount: 106.15, count: 1 },
      { name: 'Хлеб', amount: 80, count: 1 },
    ]);
  });
});
