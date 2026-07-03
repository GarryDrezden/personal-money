import type { CategoryMonthSummary, MonthSummary, Transaction, BudgetMonth } from '../types';
import {
  currentYearMonth,
  formatMoney,
  getMonthTransactions,
  getPreviousMonthSummary,
  isCountedAsExpense,
  percentChange,
  toAmount,
} from './budget';

export type InsightSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface AnalyticsInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  metric?: string;
  link?: string;
}

export interface MonthForecast {
  yearMonth: string;
  daysElapsed: number;
  daysInMonth: number;
  dailyAverage: number;
  projectedExpenses: number;
  currentExpenses: number;
  isCurrentMonth: boolean;
}

export interface PeriodComparison {
  id: string;
  label: string;
  current: number;
  reference: number;
  referenceLabel: string;
  changePct: number | null;
  invertColors?: boolean;
}

function daysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function getMonthForecast(
  currentExpenses: number,
  yearMonth: string,
  referenceDate = new Date(),
): MonthForecast {
  const totalDays = daysInMonth(yearMonth);
  const isCurrentMonth = yearMonth === currentYearMonth();
  const daysElapsed = isCurrentMonth
    ? Math.max(1, referenceDate.getDate())
    : totalDays;
  const dailyAverage = currentExpenses / daysElapsed;
  const projectedExpenses = dailyAverage * totalDays;

  return {
    yearMonth,
    daysElapsed,
    daysInMonth: totalDays,
    dailyAverage,
    projectedExpenses,
    currentExpenses,
    isCurrentMonth,
  };
}

export function getSameMonthYearAgo(
  summaries: MonthSummary[],
  yearMonth: string,
): MonthSummary | undefined {
  const [y, m] = yearMonth.split('-');
  const prevYear = `${Number(y) - 1}-${m}`;
  return summaries.find((s) => s.yearMonth === prevYear);
}

export function buildPeriodComparisons(
  current: MonthSummary,
  summaries: MonthSummary[],
): PeriodComparison[] {
  const prev = getPreviousMonthSummary(summaries, current.monthId);
  const yoy = getSameMonthYearAgo(summaries, current.yearMonth);

  const items: PeriodComparison[] = [];

  if (prev) {
    items.push({
      id: 'mom-expenses',
      label: 'Расходы к прошл. месяцу',
      current: current.expenses,
      reference: prev.expenses,
      referenceLabel: 'прошлый месяц',
      changePct: percentChange(current.expenses, prev.expenses),
      invertColors: true,
    });
    items.push({
      id: 'mom-income',
      label: 'Доходы к прошл. месяцу',
      current: current.income,
      reference: prev.income,
      referenceLabel: 'прошлый месяц',
      changePct: percentChange(current.income, prev.income),
    });
  }

  if (yoy) {
    items.push({
      id: 'yoy-expenses',
      label: 'Расходы к прошл. году',
      current: current.expenses,
      reference: yoy.expenses,
      referenceLabel: 'тот же месяц год назад',
      changePct: percentChange(current.expenses, yoy.expenses),
      invertColors: true,
    });
    items.push({
      id: 'yoy-income',
      label: 'Доходы к прошл. году',
      current: current.income,
      reference: yoy.income,
      referenceLabel: 'тот же месяц год назад',
      changePct: percentChange(current.income, yoy.income),
    });
  }

  return items;
}

function categoryAmountForMonth(
  transactions: Transaction[],
  months: BudgetMonth[],
  monthId: string,
  categoryId: string,
): number {
  const monthTx = getMonthTransactions(transactions, monthId, months).filter(isCountedAsExpense);
  let total = 0;
  for (const tx of monthTx) {
    if (tx.categoryId === categoryId) {
      total += toAmount(tx.expenseAmount);
    }
  }
  return total;
}

function getCategoryHistoricalAverage(
  transactions: Transaction[],
  months: BudgetMonth[],
  categoryId: string,
  beforeYearMonth: string,
  lookback = 3,
): number | null {
  const priorMonths = months
    .filter((m) => m.yearMonth < beforeYearMonth)
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
    .slice(0, lookback);

  if (priorMonths.length === 0) return null;

  const total = priorMonths.reduce(
    (sum, m) => sum + categoryAmountForMonth(transactions, months, m.id, categoryId),
    0,
  );
  return total / priorMonths.length;
}

export function buildAnalyticsInsights(params: {
  current: MonthSummary;
  summaries: MonthSummary[];
  forecast: MonthForecast;
  categoryItems: CategoryMonthSummary[];
  transactions: Transaction[];
  months: BudgetMonth[];
}): AnalyticsInsight[] {
  const {
    current,
    summaries,
    forecast,
    categoryItems,
    transactions,
    months,
  } = params;

  const insights: AnalyticsInsight[] = [];
  const prev = getPreviousMonthSummary(summaries, current.monthId);
  const yoy = getSameMonthYearAgo(summaries, current.yearMonth);
  const monthLink = (extra: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ month: current.monthId, ...extra }).toString();
    return `/ledger?${qs}`;
  };

  if (forecast.isCurrentMonth) {
    const vsPrev = prev ? forecast.projectedExpenses - prev.expenses : null;
    if (vsPrev != null && vsPrev > 0 && prev!.expenses > 0) {
      const pct = Math.round((vsPrev / prev!.expenses) * 100);
      if (pct >= 10) {
        insights.push({
          id: 'forecast-high',
          severity: pct >= 25 ? 'warning' : 'info',
          title: 'Прогноз расходов до конца месяца',
          body: `При текущем темпе (~${formatMoney(forecast.dailyAverage)}/день) к концу месяца выйдет около ${formatMoney(forecast.projectedExpenses)} — на ${pct}% больше прошлого месяца.`,
          metric: formatMoney(forecast.projectedExpenses),
        });
      } else if (vsPrev < 0 && Math.abs(vsPrev) / prev!.expenses > 0.1) {
        insights.push({
          id: 'forecast-low',
          severity: 'success',
          title: 'Темп ниже прошлого месяца',
          body: `Прогноз ${formatMoney(forecast.projectedExpenses)} — экономнее, чем в прошлом месяце (${formatMoney(prev!.expenses)}).`,
          metric: formatMoney(forecast.projectedExpenses),
        });
      }
    } else if (forecast.daysElapsed <= 5 && forecast.currentExpenses === 0) {
      insights.push({
        id: 'forecast-empty',
        severity: 'info',
        title: 'Мало данных для прогноза',
        body: 'Запишите несколько операций — тогда покажем прогноз до конца месяца.',
      });
    }

    const pace = forecast.daysElapsed / forecast.daysInMonth;
    if (pace < 1 && prev && current.expenses > prev.expenses) {
      insights.push({
        id: 'ahead-of-last-month',
        severity: 'warning',
        title: 'Уже больше, чем в прошлом месяце',
        body: `Потрачено ${formatMoney(current.expenses)} при ${forecast.daysElapsed} из ${forecast.daysInMonth} дней — прошлый месяц был ${formatMoney(prev.expenses)}.`,
        link: monthLink(),
      });
    }
  }

  if (prev) {
    const expensePct = percentChange(current.expenses, prev.expenses);
    if (expensePct != null && expensePct >= 20) {
      insights.push({
        id: 'mom-expense-spike',
        severity: expensePct >= 40 ? 'danger' : 'warning',
        title: 'Расходы выросли к прошлому месяцу',
        body: `+${expensePct.toFixed(0)}% (${formatMoney(prev.expenses)} → ${formatMoney(current.expenses)}).`,
        metric: `+${expensePct.toFixed(0)}%`,
        link: monthLink(),
      });
    }
  }

  if (yoy) {
    const yoyPct = percentChange(current.expenses, yoy.expenses);
    if (yoyPct != null && Math.abs(yoyPct) >= 15) {
      insights.push({
        id: 'yoy-expense-change',
        severity: yoyPct > 25 ? 'warning' : 'info',
        title: yoyPct > 0 ? 'Больше, чем год назад' : 'Меньше, чем год назад',
        body: `Расходы ${yoyPct > 0 ? 'выше' : 'ниже'} на ${Math.abs(yoyPct).toFixed(0)}% от ${yoy.yearMonth.slice(5, 7)}/${yoy.yearMonth.slice(0, 4)} (${formatMoney(yoy.expenses)} → ${formatMoney(current.expenses)}).`,
        metric: `${yoyPct > 0 ? '+' : ''}${yoyPct.toFixed(0)}%`,
      });
    }
  }

  for (const cat of categoryItems) {
    if (cat.monthlyLimit != null && cat.monthlyLimit > 0 && forecast.isCurrentMonth) {
      const usedPct = cat.amount / cat.monthlyLimit;
      const timePct = forecast.daysElapsed / forecast.daysInMonth;
      if (usedPct >= 1) {
        insights.push({
          id: `limit-over-${cat.categoryId}`,
          severity: 'danger',
          title: `Лимит «${cat.name}» превышен`,
          body: `Потрачено ${formatMoney(cat.amount)} при лимите ${formatMoney(cat.monthlyLimit)}.`,
          link: monthLink({ categoryId: cat.categoryId }),
        });
      } else if (usedPct > timePct + 0.15 && usedPct >= 0.5) {
        insights.push({
          id: `limit-pace-${cat.categoryId}`,
          severity: 'warning',
          title: `«${cat.name}» — быстрый темп`,
          body: `${Math.round(usedPct * 100)}% лимита за ${Math.round(timePct * 100)}% месяца. Прогноз: ${formatMoney((cat.amount / forecast.daysElapsed) * forecast.daysInMonth)}.`,
          link: monthLink({ categoryId: cat.categoryId }),
        });
      }
    }

    const histAvg = getCategoryHistoricalAverage(
      transactions,
      months,
      cat.categoryId,
      current.yearMonth,
    );
    if (histAvg != null && histAvg >= 1000 && cat.amount > histAvg * 1.5) {
      insights.push({
        id: `cat-spike-${cat.categoryId}`,
        severity: 'warning',
        title: `Аномалия: «${cat.name}»`,
        body: `${formatMoney(cat.amount)} — в 1,5+ раза выше среднего за 3 месяца (${formatMoney(histAvg)}).`,
        link: monthLink({ categoryId: cat.categoryId }),
      });
    }
  }

  const monthTx = getMonthTransactions(transactions, current.monthId, months).filter(isCountedAsExpense);
  const largeTx = monthTx
    .filter((tx) => toAmount(tx.expenseAmount) >= 5000)
    .sort((a, b) => toAmount(b.expenseAmount) - toAmount(a.expenseAmount))
    .slice(0, 3);

  for (const tx of largeTx) {
    insights.push({
      id: `large-tx-${tx.id}`,
      severity: 'info',
      title: 'Крупная трата',
      body: `${tx.expenseName ?? 'Без названия'} — ${formatMoney(tx.expenseAmount)}${tx.txDate ? ` (${tx.txDate})` : ''}.`,
      metric: formatMoney(tx.expenseAmount),
      link: monthLink({ search: tx.expenseName ?? '' }),
    });
  }

  if (current.delta >= 0 && prev && current.delta > prev.delta) {
    insights.push({
      id: 'positive-delta',
      severity: 'success',
      title: 'Плюс по месяцу',
      body: `Доходы перекрывают расходы на ${formatMoney(current.delta)}.`,
      metric: formatMoney(current.delta),
    });
  } else if (current.delta < 0 && Math.abs(current.delta) > (prev ? Math.abs(prev.delta) : 0)) {
    insights.push({
      id: 'negative-delta',
      severity: 'warning',
      title: 'Минус по месяцу',
      body: `Расходы превышают доходы на ${formatMoney(Math.abs(current.delta))}.`,
      metric: formatMoney(current.delta),
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'all-calm',
      severity: 'success',
      title: 'Всё в пределах нормы',
      body: 'Нет резких скачков и превышений лимитов. Продолжайте в том же духе.',
    });
  }

  return insights.slice(0, 8);
}
