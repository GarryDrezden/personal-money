import { useState } from 'react';
import { useBudgetStore } from '../../store/budgetStore';
import { Card } from '../ui/Card';
import { MoneyInput } from '../shared/MoneyInput';
import { CategoryIcon } from '../shared/CategoryIcon';

export function AccountsEditor() {
  const accounts = useBudgetStore((s) => s.accounts);
  const saveAccount = useBudgetStore((s) => s.saveAccount);
  const [drafts, setDrafts] = useState<
    Record<string, { name: string; initialBalance: string; creditLimit: string }>
  >({});

  const getDraft = (id: string, name: string, initialBalance: number, creditLimit: number | null) =>
    drafts[id] ?? {
      name,
      initialBalance: String(initialBalance),
      creditLimit: creditLimit != null ? String(creditLimit) : '',
    };

  return (
    <Card>
      <h2 className="font-semibold">Карты и счета</h2>
      <div className="mt-3 space-y-3">
        {accounts
          .filter((a) => a.status !== 'hidden')
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((acc) => {
            const d = getDraft(acc.id, acc.name, acc.initialBalance, acc.creditLimit);
            return (
              <div key={acc.id} className="grid gap-2 sm:grid-cols-4">
                <input
                  className="money-input"
                  value={d.name}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [acc.id]: { ...d, name: e.target.value },
                    }))
                  }
                />
                <MoneyInput
                  value={d.initialBalance}
                  onChange={(v) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [acc.id]: { ...d, initialBalance: v },
                    }))
                  }
                  placeholder={acc.type === 'credit' ? 'доступно старт' : 'старт'}
                />
                {acc.type === 'credit' ? (
                  <MoneyInput
                    value={d.creditLimit}
                    onChange={(v) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [acc.id]: { ...d, creditLimit: v },
                      }))
                    }
                    placeholder="лимит"
                  />
                ) : (
                  <span className="text-xs text-[var(--app-text-muted)] self-center">дебет</span>
                )}
                <button
                  type="button"
                  className="rounded-lg bg-[var(--app-primary-soft)] px-3 py-2 text-sm text-[var(--app-primary)]"
                  onClick={() =>
                    void saveAccount({
                      id: acc.id,
                      name: d.name,
                      initialBalance: Number(d.initialBalance.replace(',', '.')) || 0,
                      creditLimit:
                        acc.type === 'credit' && d.creditLimit
                          ? Number(d.creditLimit.replace(',', '.'))
                          : null,
                    })
                  }
                >
                  Сохранить
                </button>
              </div>
            );
          })}
      </div>
    </Card>
  );
}

export function CategoriesEditor() {
  const categories = useBudgetStore((s) => s.categories);
  const saveCategory = useBudgetStore((s) => s.saveCategory);
  const [drafts, setDrafts] = useState<
    Record<string, { name: string; monthlyLimit: string }>
  >({});

  const getDraft = (id: string, name: string, limit: number | null) =>
    drafts[id] ?? { name, monthlyLimit: limit != null ? String(limit) : '' };

  return (
    <Card>
      <h2 className="font-semibold">Категории</h2>
      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
        {categories
          .filter((c) => c.isActive && c.type !== 'system')
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((cat) => {
            const d = getDraft(cat.id, cat.name, cat.monthlyLimit);
            return (
              <div key={cat.id} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto] items-center text-sm">
                <CategoryIcon categoryId={cat.id} size={18} />
                <span className="text-[var(--app-text-muted)]">{cat.type}</span>
                <input
                  className="money-input"
                  value={d.name}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [cat.id]: { ...d, name: e.target.value },
                    }))
                  }
                />
                <MoneyInput
                  value={d.monthlyLimit}
                  onChange={(v) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [cat.id]: { ...d, monthlyLimit: v },
                    }))
                  }
                  placeholder="лимит"
                />
                <button
                  type="button"
                  className="rounded-lg border border-[var(--app-border)] px-2 py-1 text-xs"
                  onClick={() =>
                    void saveCategory({
                      id: cat.id,
                      name: d.name,
                      monthlyLimit: d.monthlyLimit
                        ? Number(d.monthlyLimit.replace(',', '.'))
                        : null,
                    })
                  }
                >
                  OK
                </button>
              </div>
            );
          })}
      </div>
    </Card>
  );
}

export function MaintenanceTools() {
  const transactions = useBudgetStore((s) => s.transactions);
  const uncategorized = transactions.filter((t) => !t.categoryId && (t.expenseAmount || t.incomeAmount)).length;
  const noAccount = transactions.filter((t) => !t.accountId).length;

  return (
    <Card>
      <h2 className="font-semibold">Обслуживание</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--app-text-muted)]">Без категории</dt>
          <dd>{uncategorized}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--app-text-muted)]">Без счёта</dt>
          <dd>{noAccount}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-[var(--app-text-muted)]">
        Массовое назначение — в журнале, кнопка внутри месяца
      </p>
    </Card>
  );
}
