import { useMemo } from 'react';
import { create } from 'zustand';
import type {
  Account,
  BudgetData,
  BudgetMonth,
  Category,
  LedgerFilters,
  QuickFormPrefs,
  Transaction,
  AppSettings,
} from '../types';
import { DEFAULT_LEDGER_FILTERS as DEF_FILTERS, DEFAULT_QUICK_FORM as DEF_FORM } from '../types';
import { apiRepository } from './apiRepository';
import {
  buildMonthSummaries,
  creditAvailableDelta,
  currentYearMonth,
  findMonthByYearMonth,
  getAllAccountsSummary,
  getMonthTransactions,
  indexTransactionsByMonth,
  yearMonthFromDate,
} from '../utils/budget';
import { suggestCategory } from '../utils/categorize';

const COLLAPSED_KEY = 'personal-budget-collapsed';
const QUICK_FORM_KEY = 'personal-budget-last-form';

function loadCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    const expanded = Object.values(parsed).filter((v) => v === false).length;
    if (expanded > 1) {
      localStorage.removeItem(COLLAPSED_KEY);
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function saveCollapsed(map: Record<string, boolean>) {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(map));
}

function loadQuickForm(): QuickFormPrefs {
  try {
    const raw = localStorage.getItem(QUICK_FORM_KEY);
    return raw ? { ...DEF_FORM, ...JSON.parse(raw) } : { ...DEF_FORM, txDate: new Date().toISOString().slice(0, 10) };
  } catch {
    return { ...DEF_FORM, txDate: new Date().toISOString().slice(0, 10) };
  }
}

function saveQuickForm(prefs: QuickFormPrefs) {
  localStorage.setItem(QUICK_FORM_KEY, JSON.stringify(prefs));
}

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface BudgetState extends BudgetData {
  transactionsByMonth: Record<string, Transaction[]>;
  loading: boolean;
  error: string | null;
  collapsed: Record<string, boolean>;
  expandedMonthId: string | null;
  quickForm: QuickFormPrefs;
  ledgerFilters: LedgerFilters;
  toasts: ToastItem[];
  init: () => Promise<void>;
  setCollapsed: (monthId: string, collapsed: boolean) => void;
  setQuickForm: (patch: Partial<QuickFormPrefs>) => void;
  setLedgerFilters: (patch: Partial<LedgerFilters>) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  dismissToast: (id: string) => void;
  addTransaction: (monthId: string, kind: 'expense' | 'income' | 'both') => Promise<void>;
  createQuickTransaction: (monthId: string, payload: Partial<Transaction>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (tx: Transaction) => Promise<void>;
  bulkUpdateTransactions: (ids: string[], patch: Partial<Transaction>) => Promise<void>;
  saveCategoryTotals: (monthId: string, totals: { category: string; amount: number }[]) => Promise<void>;
  alignMonthBalance: (monthId: string) => Promise<void>;
  reconcileCreditCard: (monthId: string, targetAvailable: number) => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  saveAccount: (account: Partial<Account> & { id?: string }) => Promise<void>;
  saveCategory: (category: Partial<Category> & { id?: string }) => Promise<void>;
  importFile: (file: File, force?: boolean) => Promise<void>;
  ensureMonth: (yearMonth: string) => Promise<BudgetMonth>;
  resolveMonthIdForTxDate: (txDate: string | null | undefined, fallbackMonthId: string) => Promise<string>;
}

function withTxIndex(transactions: Transaction[], months: BudgetMonth[]) {
  return { transactions, transactionsByMonth: indexTransactionsByMonth(transactions, months) };
}

function sortMonths(months: BudgetMonth[]): BudgetMonth[] {
  return [...months].sort((a, b) => a.sortOrder - b.sortOrder);
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  months: [],
  transactions: [],
  transactionsByMonth: {},
  categoryTotals: [],
  accounts: [],
  categories: [],
  settings: {
    currency: 'RUB',
    importCompletedAt: null,
    initialOpeningBalance: 2007,
    themeId: 'cozy',
  },
  loading: true,
  error: null,
  collapsed: loadCollapsed(),
  expandedMonthId: null,
  quickForm: loadQuickForm(),
  ledgerFilters: { ...DEF_FILTERS },
  toasts: [],

  init: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiRepository.loadAll();
      let months = sortMonths(data.months);
      const currentYm = currentYearMonth();
      if (!months.some((m) => m.yearMonth === currentYm)) {
        try {
          const created = await apiRepository.ensureMonth(currentYm);
          months = sortMonths([...months, created]);
        } catch {
          /* API недоступен — месяц создастся при первой операции */
        }
      }
      const collapsed = loadCollapsed();
      let expandedMonthId =
        Object.entries(collapsed).find(([, v]) => v === false)?.[0] ?? null;
      if (!expandedMonthId && months.length) {
        const current = months.find((m) => m.yearMonth === currentYm);
        expandedMonthId = current?.id ?? months[months.length - 1].id;
        collapsed[expandedMonthId] = false;
        saveCollapsed(collapsed);
      }
      const theme = data.settings.themeId;
      document.documentElement.dataset.theme = theme;
      localStorage.setItem('personal-budget-theme', theme);
      set({
        ...data,
        months,
        ...withTxIndex(data.transactions, months),
        collapsed,
        expandedMonthId,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },

  ensureMonth: async (yearMonth) => {
    const existing = findMonthByYearMonth(get().months, yearMonth);
    if (existing) return existing;
    const month = await apiRepository.ensureMonth(yearMonth);
    const months = sortMonths([...get().months, month]);
    set({ months });
    return month;
  },

  resolveMonthIdForTxDate: async (txDate, fallbackMonthId) => {
    const ym = yearMonthFromDate(txDate);
    if (!ym) return fallbackMonthId;
    const month = await get().ensureMonth(ym);
    return month.id;
  },

  setCollapsed: (monthId, collapsed) => {
    const { months } = get();
    let next: Record<string, boolean>;
    let expandedMonthId: string | null;
    if (collapsed) {
      next = { ...get().collapsed, [monthId]: true };
      expandedMonthId = get().expandedMonthId === monthId ? null : get().expandedMonthId;
    } else {
      next = Object.fromEntries(months.map((m) => [m.id, m.id !== monthId]));
      expandedMonthId = monthId;
    }
    saveCollapsed(next);
    set({ collapsed: next, expandedMonthId });
  },

  setQuickForm: (patch) => {
    const quickForm = { ...get().quickForm, ...patch };
    saveQuickForm(quickForm);
    set({ quickForm });
  },

  setLedgerFilters: (patch) => set({ ledgerFilters: { ...get().ledgerFilters, ...patch } }),

  showToast: (message, type = 'success') => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismissToast(id), 3000);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  addTransaction: async (monthId, kind) => {
    const txDate = new Date().toISOString().slice(0, 10);
    const targetMonthId = await get().resolveMonthIdForTxDate(txDate, monthId);
    const payload =
      kind === 'expense'
        ? { monthId: targetMonthId, expenseName: '', expenseAmount: 0, txDate, accountId: 'main_card' }
        : kind === 'income'
          ? { monthId: targetMonthId, incomeSource: '', incomeAmount: 0, txDate, accountId: 'main_card' }
          : { monthId: targetMonthId, expenseName: '', expenseAmount: 0, incomeSource: '', incomeAmount: 0, txDate };
    const tx = await apiRepository.createTransaction(payload);
    const months = get().months;
    set(withTxIndex([...get().transactions, tx], months));
    get().setCollapsed(targetMonthId, false);
  },

  createQuickTransaction: async (monthId, payload) => {
    const targetMonthId = await get().resolveMonthIdForTxDate(payload.txDate ?? null, monthId);
    const tx = await apiRepository.createTransaction({ monthId: targetMonthId, ...payload });
    const months = get().months;
    set(withTxIndex([...get().transactions, tx], months));
    get().setCollapsed(targetMonthId, false);
    get().showToast('Операция добавлена');
  },

  updateTransaction: async (tx) => {
    const targetMonthId = await get().resolveMonthIdForTxDate(tx.txDate, tx.monthId);
    const updated = await apiRepository.updateTransaction(tx.id, { ...tx, monthId: targetMonthId });
    const months = get().months;
    set(withTxIndex(get().transactions.map((t) => (t.id === tx.id ? updated : t)), months));
    if (targetMonthId !== tx.monthId) {
      get().setCollapsed(targetMonthId, false);
    }
  },

  removeTransaction: async (id) => {
    await apiRepository.deleteTransaction(id);
    set(withTxIndex(get().transactions.filter((t) => t.id !== id), get().months));
    get().showToast('Операция удалена');
  },

  duplicateTransaction: async (tx) => {
    const { id: _id, sortOrder: _so, ...rest } = tx;
    const targetMonthId = await get().resolveMonthIdForTxDate(rest.txDate ?? null, tx.monthId);
    const copy = await apiRepository.createTransaction({ ...rest, monthId: targetMonthId });
    set(withTxIndex([...get().transactions, copy], get().months));
    get().showToast('Операция скопирована');
  },

  bulkUpdateTransactions: async (ids, patch) => {
    await apiRepository.bulkUpdateTransactions(ids, patch);
    await get().init();
    get().showToast(`Обновлено: ${ids.length}`);
  },

  saveCategoryTotals: async (monthId, totals) => {
    const saved = await apiRepository.updateMonthCategories(monthId, totals);
    set({
      categoryTotals: [
        ...get().categoryTotals.filter((c) => c.monthId !== monthId),
        ...saved,
      ],
    });
  },

  alignMonthBalance: async (monthId) => {
    const { months, transactions, settings, accounts } = get();
    const summary = buildMonthSummaries(
      months,
      transactions,
      settings.initialOpeningBalance,
      accounts,
    ).find((s) => s.monthId === monthId);
    if (!summary) return;
    await apiRepository.updateMonthBalance(monthId, summary.computedBalance);
    set({
      months: months.map((m) =>
        m.id === monthId ? { ...m, importedBalance: summary.computedBalance } : m,
      ),
    });
    get().showToast('Баланс выровнен');
  },

  reconcileCreditCard: async (monthId, targetAvailable) => {
    const { transactions, months, accounts } = get();
    const credit = getAllAccountsSummary(transactions, months, monthId, accounts).find(
      (s) => s.accountId === 'credit_card',
    );
    if (!credit) return;

    const diff = creditAvailableDelta(credit, targetAvailable);
    if (Math.abs(diff) < 1) {
      get().showToast('Кредитка уже совпадает с банком');
      return;
    }

    const rounded = Math.round(diff * 100) / 100;
    const tx = await apiRepository.createTransaction({
      monthId,
      operationKind: 'correction',
      accountId: 'credit_card',
      categoryId: 'correction',
      txDate: new Date().toISOString().slice(0, 10),
      paymentStatus: 'done',
      note: `сверка: доступно ${targetAvailable}`,
      ...(rounded > 0
        ? { incomeSource: 'Сверка кредитки', incomeAmount: rounded }
        : { expenseName: 'Сверка кредитки', expenseAmount: -rounded }),
    });
    set(withTxIndex([...get().transactions, tx], get().months));
    get().showToast('Кредитка сверена');
  },

  saveSettings: async (patch) => {
    const settings = await apiRepository.saveSettings(patch);
    set({ settings });
    if (patch.themeId) {
      document.documentElement.dataset.theme = patch.themeId;
      localStorage.setItem('personal-budget-theme', patch.themeId);
    }
  },

  saveAccount: async (account) => {
    const saved = await apiRepository.saveAccount(account);
    const accounts = account.id
      ? get().accounts.map((a) => (a.id === saved.id ? saved : a))
      : [...get().accounts, saved];
    set({ accounts });
    get().showToast('Счёт сохранён');
  },

  saveCategory: async (category) => {
    const saved = await apiRepository.saveCategory(category);
    const categories = category.id
      ? get().categories.map((c) => (c.id === saved.id ? saved : c))
      : [...get().categories, saved];
    set({ categories });
    get().showToast('Категория сохранена');
  },

  importFile: async (file, force = false) => {
    await apiRepository.importXlsx(file, force);
    localStorage.removeItem(COLLAPSED_KEY);
    await get().init();
  },
}));

export function useSummaries() {
  const months = useBudgetStore((s) => s.months);
  const transactions = useBudgetStore((s) => s.transactions);
  const accounts = useBudgetStore((s) => s.accounts);
  const initialOpeningBalance = useBudgetStore((s) => s.settings.initialOpeningBalance);
  return buildMonthSummaries(months, transactions, initialOpeningBalance, accounts);
}

export function useCurrentMonthSummary() {
  const summaries = useSummaries();
  const ym = currentYearMonth();
  return summaries.find((s) => s.yearMonth === ym) ?? summaries[summaries.length - 1];
}

export function useMonthTransactions(monthId: string) {
  const transactions = useBudgetStore((s) => s.transactions);
  const months = useBudgetStore((s) => s.months);
  return useMemo(
    () => getMonthTransactions(transactions, monthId, months),
    [transactions, monthId, months],
  );
}

export { suggestCategory };
