export const LEGACY_EXCEL_CATEGORIES = [
  'Основная карта',
  'На кредиты',
  'Общая карта',
  'Еда',
  'Ежемесячные',
  'Стануша',
  'Кредиты',
  'Остальное',
  'Кредитка',
  'Алкоголь',
] as const;

export const MONTH_LABELS: Record<number, string> = {
  1: 'Январь',
  2: 'Февраль',
  3: 'Март',
  4: 'Апрель',
  5: 'Май',
  6: 'Июнь',
  7: 'Июль',
  8: 'Август',
  9: 'Сентябрь',
  10: 'Октябрь',
  11: 'Ноябрь',
  12: 'Декабрь',
};

export function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTH_LABELS[m] ?? yearMonth} ${y}`;
}

/** С этого месяца учёт в приложении; Excel-архив в журнале не показываем. */
export const APP_LEDGER_FROM_YEAR_MONTH = '2026-07';

export function showExcelArchiveInLedger(yearMonth: string): boolean {
  return yearMonth < APP_LEDGER_FROM_YEAR_MONTH;
}

/** @deprecated use LEGACY_EXCEL_CATEGORIES */
export const BUDGET_CATEGORIES = LEGACY_EXCEL_CATEGORIES;
