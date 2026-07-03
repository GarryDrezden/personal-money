import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBudgetStore, useSummaries } from '../store/budgetStore';
import {
  aggregateCategoryTotals,
  averageMonthlyExpenses,
  filterTransactions,
  formatMoney,
  getAllAccountsSummary,
  getCreditCardSummary,
  getTransactionsWithoutAccount,
  getUncategorizedTransactions,
  isInternalTransfer,
  monthlyExpenseByCategory,
  mostExpensiveMonth,
  topExpenseNames,
  topIncomeSources,
} from '../utils/budget';
import { formatYearMonth } from '../constants/categories';
import { getPrimaryCreditAccount } from '../utils/accounts';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { AccountSelect } from '../components/shared/AccountSelect';
import { CategorySelect } from '../components/shared/CategorySelect';

const COLORS = [
  '#f59e0b',
  '#8b5cf6',
  '#10b981',
  '#f43f5e',
  '#f97316',
  '#7c3aed',
  '#ca8a04',
  '#db2777',
  '#2563eb',
  '#64748b',
];

export function AnalyticsPage() {
  const transactions = useBudgetStore((s) => s.transactions);
  const categoryTotals = useBudgetStore((s) => s.categoryTotals);
  const months = useBudgetStore((s) => s.months);
  const accounts = useBudgetStore((s) => s.accounts);
  const categories = useBudgetStore((s) => s.categories);
  const summaries = useSummaries();
  const years = useMemo(
    () => [...new Set(months.map((m) => m.yearMonth.slice(0, 4)))].sort(),
    [months],
  );
  const [year, setYear] = useState(years[years.length - 1] ?? String(new Date().getFullYear()));
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const monthlyCategoryExpenses = useMemo(
    () => monthlyExpenseByCategory(transactions, months, categories, year),
    [transactions, months, categories, year],
  );

  const yearSummaries = useMemo(
    () => summaries.filter((s) => s.yearMonth.startsWith(year)),
    [summaries, year],
  );

  const yearMonthIds = useMemo(
    () => new Set(yearSummaries.map((s) => s.monthId)),
    [yearSummaries],
  );

  const yearTransactions = useMemo(() => {
    let tx = transactions.filter((t) => yearMonthIds.has(t.monthId) && !isInternalTransfer(t));
    if (accountFilter || categoryFilter) {
      tx = filterTransactions(tx, {
        accountId: accountFilter || undefined,
        categoryId: categoryFilter || undefined,
      });
    }
    return tx;
  }, [transactions, yearMonthIds, accountFilter, categoryFilter]);

  const categoryData = useMemo(
    () => aggregateCategoryTotals(categoryTotals, yearMonthIds),
    [categoryTotals, yearMonthIds],
  );

  const expenseTop = useMemo(() => topExpenseNames(yearTransactions, 15), [yearTransactions]);
  const incomeTop = useMemo(() => topIncomeSources(yearTransactions, 15), [yearTransactions]);
  const avgExpenses = averageMonthlyExpenses(yearSummaries);
  const maxMonth = mostExpensiveMonth(yearSummaries);

  const accountChartData = useMemo(() => {
    return yearSummaries.map((s) => {
      const accSums = getAllAccountsSummary(transactions, months, s.monthId, accounts);
      const row: Record<string, string | number> = {
        name: formatYearMonth(s.yearMonth).replace(/\s\d{4}$/, ''),
      };
      for (const a of accSums) {
        const acc = accounts.find((x) => x.id === a.accountId);
        if (acc?.type === 'credit') {
          row[acc.name] = Math.round(a.debtChange ?? 0);
        } else {
          row[acc?.name ?? a.accountId] = Math.round(a.closingBalance);
        }
      }
      return row;
    });
  }, [yearSummaries, transactions, months, accounts]);

  const primaryCredit = useMemo(() => getPrimaryCreditAccount(accounts), [accounts]);

  const creditCardData = useMemo(
    () => {
      if (!primaryCredit) return [];
      return yearSummaries.map((s) => {
        const cc = getCreditCardSummary(transactions, s.monthId, primaryCredit.id, months);
        return {
          name: formatYearMonth(s.yearMonth).replace(/\s\d{4}$/, ''),
          spending: Math.round(cc.spending),
          payments: Math.round(cc.payments),
        };
      });
    },
    [yearSummaries, transactions, months, primaryCredit],
  );

  const uncategorized = getUncategorizedTransactions(
    transactions.filter((t) => yearMonthIds.has(t.monthId)),
  ).length;
  const noAccount = getTransactionsWithoutAccount(
    transactions.filter((t) => yearMonthIds.has(t.monthId)),
  ).length;

  const activeAccounts = accounts.filter((a) => a.isActive && a.type !== 'credit');

  if (!months.length) {
    return (
      <Card>
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <p className="mt-2 text-[var(--app-text-muted)]">Импортируйте данные для аналитики.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Аналитика" subtitle="Счета, категории, кредитка">
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Год
            <select className="money-input min-w-[100px]" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Счёт
            <AccountSelect value={accountFilter} onChange={setAccountFilter} allowEmpty includeCredit />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Категория
            <CategorySelect value={categoryFilter} onChange={setCategoryFilter} type="all" />
          </label>
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-sm text-[var(--app-text-muted)]">Средний расход/мес</div>
          <div className="mt-1 text-xl font-bold">{formatMoney(avgExpenses)}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--app-text-muted)]">Самый дорогой месяц</div>
          <div className="mt-1 text-xl font-bold">
            {maxMonth ? formatYearMonth(maxMonth.yearMonth) : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--app-text-muted)]">Без категории</div>
          <div className="mt-1 text-xl font-bold">{uncategorized}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--app-text-muted)]">Без счёта</div>
          <div className="mt-1 text-xl font-bold">{noAccount}</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Баланс по картам ({year})</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accountChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              {activeAccounts.map((a, i) => (
                <Line
                  key={a.id}
                  type="monotone"
                  dataKey={a.name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Кредитка: траты и платежи</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={creditCardData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="spending" name="Траты" fill="var(--app-danger)" />
              <Bar dataKey="payments" name="Платежи" fill="var(--app-success)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Траты по категориям ({year})</h2>
        <div className="space-y-4">
          {monthlyCategoryExpenses.map((month) => (
            <div
              key={month.monthId}
              className="rounded-lg border border-[var(--app-border)] p-3"
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{formatYearMonth(month.yearMonth)}</h3>
                <span className="text-sm text-[var(--app-text-muted)]">
                  итого <strong className="text-[var(--app-text)]">{formatMoney(month.total)}</strong>
                </span>
              </div>
              {month.items.length ? (
                <ul className="space-y-1 text-sm">
                  {month.items.map((item) => (
                    <li key={item.categoryId} className="flex justify-between gap-2">
                      <span>{item.name}</span>
                      <span className="shrink-0 font-medium text-[var(--app-danger)]">
                        {formatMoney(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--app-text-muted)]">Нет расходов</p>
              )}
            </div>
          ))}
          {!monthlyCategoryExpenses.length && (
            <p className="text-sm text-[var(--app-text-muted)]">Нет данных за год</p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Категории Excel ({year})</h2>
          <div className="h-64">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--app-text-muted)]">Нет данных</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Топ расходов ({year})</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseTop.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={78} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="total" fill="var(--app-danger)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Топ-15 расходов</h2>
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {expenseTop.map((item) => (
              <li key={item.name} className="flex justify-between gap-2">
                <span>{item.name}</span>
                <span className="shrink-0 font-medium">{formatMoney(item.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Топ-15 доходов</h2>
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {incomeTop.map((item) => (
              <li key={item.name} className="flex justify-between gap-2">
                <span>{item.name}</span>
                <span className="shrink-0 font-medium">{formatMoney(item.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
