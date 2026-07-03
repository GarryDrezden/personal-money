import type {
  Account,
  AppSettings,
  BudgetData,
  BudgetMonth,
  Category,
  MonthCategoryTotal,
  QuickFormPrefs,
  Transaction,
} from '../types';

const API = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'API error');
  }
  return res.json() as Promise<T>;
}

export const apiRepository = {
  me: () => request<{ id: string; username: string }>(`${API}/auth/me`),

  login: (username: string, password: string) =>
    request<{ id: string; username: string }>(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    request<{ id: string; username: string }>(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: boolean }>(`${API}/auth/logout`, { method: 'POST' }),

  loadAll: () => request<BudgetData>(`${API}/`),

  createTransaction: (payload: Partial<Transaction> & { monthId: string }) =>
    request<Transaction>(`${API}/transactions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTransaction: (id: string, payload: Partial<Transaction>) =>
    request<Transaction>(`${API}/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteTransaction: (id: string) =>
    request<{ ok: boolean }>(`${API}/transactions/${id}`, { method: 'DELETE' }),

  bulkUpdateTransactions: (ids: string[], patch: Partial<Transaction>) =>
    request<{ ok: boolean; updated: number }>(`${API}/transactions/bulk-update`, {
      method: 'POST',
      body: JSON.stringify({ ids, patch }),
    }),

  suggestCategory: (title: string) =>
    request<{ categoryId: string | null }>(`${API}/transactions/suggest-category`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  updateMonthCategories: (monthId: string, totals: { category: string; amount: number }[]) =>
    request<MonthCategoryTotal[]>(`${API}/months/${monthId}/categories`, {
      method: 'PUT',
      body: JSON.stringify({ totals }),
    }),

  updateMonthBalance: (monthId: string, importedBalance: number) =>
    request(`${API}/months/${monthId}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ importedBalance }),
    }),

  ensureMonth: (yearMonth: string) =>
    request<BudgetMonth>(`${API}/months`, {
      method: 'POST',
      body: JSON.stringify({ yearMonth }),
    }),

  saveAccount: (account: Partial<Account> & { id?: string }) =>
    account.id
      ? request<Account>(`${API}/accounts/${account.id}`, {
          method: 'PUT',
          body: JSON.stringify(account),
        })
      : request<Account>(`${API}/accounts`, {
          method: 'POST',
          body: JSON.stringify(account),
        }),

  deleteAccount: (id: string) =>
    request<{ ok: boolean }>(`${API}/accounts/${id}`, { method: 'DELETE' }),

  saveCategory: (category: Partial<Category> & { id?: string }) =>
    category.id
      ? request<Category>(`${API}/categories/${category.id}`, {
          method: 'PUT',
          body: JSON.stringify(category),
        })
      : request<Category>(`${API}/categories`, {
          method: 'POST',
          body: JSON.stringify(category),
        }),

  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`${API}/categories/${id}`, { method: 'DELETE' }),

  saveSettings: (settings: Partial<AppSettings>) =>
    request<AppSettings>(`${API}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  importXlsx: (file: File, force = false) => {
    const form = new FormData();
    form.append('file', file);
    const q = force ? '?force=1' : '';
    return fetch(`${API}/import/xlsx${q}`, { method: 'POST', credentials: 'include', body: form }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? 'Import failed');
      }
      return res.json() as Promise<{ ok: boolean; months: number; transactions: number }>;
    });
  },

  resetImport: () => request<{ ok: boolean }>(`${API}/import/reset`, { method: 'POST' }),

  backupUrl: () => `${API}/backup`,
};

export type { QuickFormPrefs };
