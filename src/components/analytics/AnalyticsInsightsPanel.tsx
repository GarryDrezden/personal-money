import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useBudgetStore, useCurrentMonthSummary, useSummaries } from '../../store/budgetStore';
import { formatYearMonth } from '../../constants/categories';
import { formatMoney, getCategoryMonthSummary } from '../../utils/budget';
import {
  buildAnalyticsInsights,
  buildPeriodComparisons,
  getMonthForecast,
  type AnalyticsInsight,
  type InsightSeverity,
  type PeriodComparison,
} from '../../utils/analyticsInsights';
import { Card } from '../ui/Card';

const SEVERITY_ICON: Record<InsightSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertTriangle,
  success: CheckCircle2,
};

const SEVERITY_CLASS: Record<InsightSeverity, string> = {
  info: 'analytics-insight--info',
  warning: 'analytics-insight--warning',
  danger: 'analytics-insight--danger',
  success: 'analytics-insight--success',
};

function ComparisonCard({ item }: { item: PeriodComparison }) {
  const pct = item.changePct;
  const up = pct != null && pct > 0;
  const down = pct != null && pct < 0;
  const bad = item.invertColors ? up : false;
  const good = item.invertColors ? down : up;

  return (
    <div className="analytics-comparison-card">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
        {item.label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{formatMoney(item.current)}</div>
      <div className="mt-1 text-xs text-[var(--app-text-muted)]">
        vs {formatMoney(item.reference)} ({item.referenceLabel})
      </div>
      {pct != null && (
        <div
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            bad
              ? 'bg-[color-mix(in_srgb,var(--app-danger)_15%,transparent)] text-[var(--app-danger)]'
              : good
                ? 'bg-[color-mix(in_srgb,var(--app-success)_15%,transparent)] text-[var(--app-success)]'
                : 'bg-[var(--app-bg-soft)] text-[var(--app-text-muted)]'
          }`}
        >
          {up ? <ArrowUpRight size={12} /> : down ? <ArrowDownRight size={12} /> : null}
          {up ? '+' : ''}
          {pct.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

function InsightRow({ insight }: { insight: AnalyticsInsight }) {
  const Icon = SEVERITY_ICON[insight.severity];
  const content = (
    <div className={`analytics-insight ${SEVERITY_CLASS[insight.severity]}`}>
      <Icon size={18} className="analytics-insight-icon shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{insight.title}</h3>
          {insight.metric && (
            <span className="text-sm font-bold tabular-nums text-[var(--app-text-muted)]">
              {insight.metric}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">{insight.body}</p>
      </div>
    </div>
  );

  if (insight.link) {
    return (
      <Link to={insight.link} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}

export function AnalyticsInsightsPanel() {
  const summaries = useSummaries();
  const current = useCurrentMonthSummary();
  const transactions = useBudgetStore((s) => s.transactions);
  const months = useBudgetStore((s) => s.months);
  const categories = useBudgetStore((s) => s.categories);
  const categoryTotals = useBudgetStore((s) => s.categoryTotals);

  const categoryItems = useMemo(() => {
    if (!current) return [];
    return getCategoryMonthSummary(
      transactions,
      current.monthId,
      categories,
      categoryTotals,
      current.expenses,
      months,
    );
  }, [transactions, current, categories, categoryTotals, months]);

  const forecast = useMemo(() => {
    if (!current) return null;
    return getMonthForecast(current.expenses, current.yearMonth);
  }, [current]);

  const comparisons = useMemo(() => {
    if (!current) return [];
    return buildPeriodComparisons(current, summaries);
  }, [current, summaries]);

  const insights = useMemo(() => {
    if (!current || !forecast) return [];
    return buildAnalyticsInsights({
      current,
      summaries,
      forecast,
      categoryItems,
      transactions,
      months,
    });
  }, [current, summaries, forecast, categoryItems, transactions, months]);

  if (!current || !forecast) return null;

  const monthLabel = formatYearMonth(current.yearMonth);

  return (
    <div className="space-y-4">
      <Card className="!p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              <Sparkles size={14} className="text-[var(--app-primary)]" />
              Выводы · {monthLabel}
            </div>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Сравнения, прогноз и аномалии по текущему месяцу
            </p>
          </div>
          {forecast.isCurrentMonth && (
            <div className="analytics-forecast-badge">
              <TrendingUp size={14} />
              <span>
                Прогноз: <strong>{formatMoney(forecast.projectedExpenses)}</strong>
              </span>
              <span className="text-[var(--app-text-muted)]">
                · {forecast.daysElapsed}/{forecast.daysInMonth} дн.
              </span>
            </div>
          )}
        </div>

        {comparisons.length > 0 && (
          <div className="analytics-comparison-grid">
            {comparisons.map((c) => (
              <ComparisonCard key={c.id} item={c} />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Что заметили</h2>
        <div className="space-y-2">
          {insights.map((insight) => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </div>
      </Card>
    </div>
  );
}
