import { useState, type ReactNode } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Account, AccountType, Category, CategoryType } from '../../types';
import { useBudgetStore } from '../../store/budgetStore';
import { Card } from '../ui/Card';
import { MoneyInput } from '../shared/MoneyInput';
import { CategoryIcon } from '../shared/CategoryIcon';
import { AccountIcon } from '../shared/AccountIcon';
import { IconPicker } from '../shared/IconPicker';
import { COLOR_OPTIONS } from '../../utils/icons';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  debit: 'Дебетовая',
  credit: 'Кредитная',
};

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  expense: 'Расход',
  income: 'Доход',
  system: 'Системная',
};

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.label}
          onClick={() => onChange(c.id)}
          className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
            value === c.id ? 'border-[var(--app-text)] scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-strong)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-soft)]"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type AccountDraft = {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  initialBalance: string;
  creditLimit: string;
};

type CategoryDraft = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  monthlyLimit: string;
};

const emptyAccountDraft = (): AccountDraft => ({
  name: '',
  type: 'debit',
  icon: 'credit-card',
  color: 'orange',
  initialBalance: '0',
  creditLimit: '',
});

const accountToDraft = (a: Account): AccountDraft => ({
  name: a.name,
  type: a.type,
  icon: a.icon ?? 'credit-card',
  color: a.color ?? 'orange',
  initialBalance: String(a.initialBalance),
  creditLimit: a.creditLimit != null ? String(a.creditLimit) : '',
});

const emptyCategoryDraft = (): CategoryDraft => ({
  name: '',
  type: 'expense',
  icon: 'utensils',
  color: 'purple',
  monthlyLimit: '',
});

const categoryToDraft = (c: Category): CategoryDraft => ({
  name: c.name,
  type: c.type,
  icon: c.icon ?? 'utensils',
  color: c.color ?? 'purple',
  monthlyLimit: c.monthlyLimit != null ? String(c.monthlyLimit) : '',
});

export function AccountsEditor() {
  const accounts = useBudgetStore((s) => s.accounts);
  const saveAccount = useBudgetStore((s) => s.saveAccount);
  const deleteAccount = useBudgetStore((s) => s.deleteAccount);

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; account: Account } | null>(
    null,
  );
  const [draft, setDraft] = useState<AccountDraft>(emptyAccountDraft());
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setDraft(emptyAccountDraft());
    setModal({ mode: 'create' });
  };

  const openEdit = (account: Account) => {
    setDraft(accountToDraft(account));
    setModal({ mode: 'edit', account });
  };

  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        type: draft.type,
        icon: draft.icon,
        color: draft.color,
        initialBalance: Number(draft.initialBalance.replace(',', '.')) || 0,
        creditLimit:
          draft.type === 'credit' && draft.creditLimit
            ? Number(draft.creditLimit.replace(',', '.'))
            : null,
        sortOrder:
          modal?.mode === 'create'
            ? Math.max(0, ...accounts.map((a) => a.sortOrder)) + 1
            : modal?.mode === 'edit'
              ? modal.account.sortOrder
              : 0,
        ...(modal?.mode === 'edit' ? { id: modal.account.id } : {}),
      };
      await saveAccount(payload);
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: Account) => {
    if (!window.confirm(`Закрыть счёт «${account.name}»? Операции сохранятся.`)) return;
    await deleteAccount(account.id);
    closeModal();
  };

  const activeAccounts = accounts
    .filter((a) => a.status !== 'hidden' && a.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Карты и счета</h2>
          <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">
            Дебетовые и кредитные карты с начальным балансом
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border)] text-left text-xs text-[var(--app-text-muted)]">
              <th className="pb-2 pr-3 font-medium">Счёт</th>
              <th className="pb-2 pr-3 font-medium">Тип</th>
              <th className="pb-2 pr-3 font-medium">Начальный баланс</th>
              <th className="pb-2 pr-3 font-medium">Лимит</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {activeAccounts.map((acc) => (
              <tr
                key={acc.id}
                className="border-b border-[var(--app-border)] last:border-0 hover:bg-[var(--app-bg-soft)]"
              >
                <td className="py-3 pr-3">
                  <button
                    type="button"
                    onClick={() => openEdit(acc)}
                    className="flex items-center gap-2 text-left font-medium hover:text-[var(--app-primary)]"
                  >
                    <AccountIcon icon={acc.icon} accountColor={acc.color} size={16} />
                    {acc.name}
                  </button>
                </td>
                <td className="py-3 pr-3 text-[var(--app-text-muted)]">
                  {ACCOUNT_TYPE_LABELS[acc.type]}
                </td>
                <td className="py-3 pr-3 tabular-nums">
                  {acc.initialBalance.toLocaleString('ru-RU')} ₽
                </td>
                <td className="py-3 pr-3 tabular-nums text-[var(--app-text-muted)]">
                  {acc.type === 'credit' && acc.creditLimit != null
                    ? `${acc.creditLimit.toLocaleString('ru-RU')} ₽`
                    : '—'}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(acc)}
                    className="rounded-lg px-2 py-1 text-xs text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
                  >
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Новый счёт' : 'Редактирование счёта'}
          onClose={closeModal}
        >
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Название</span>
              <input
                className="money-input"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Основная карта"
                autoFocus
              />
            </label>

            <div className="space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Тип счёта</span>
              <div className="flex gap-2">
                {(['debit', 'credit'] as AccountType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, type: t }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      draft.type === t
                        ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
                        : 'border-[var(--app-border)]'
                    }`}
                  >
                    {ACCOUNT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Иконка</span>
              <IconPicker
                value={draft.icon}
                onChange={(icon) => setDraft((d) => ({ ...d, icon }))}
              />
            </div>

            <div className="space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Цвет</span>
              <ColorPicker
                value={draft.color}
                onChange={(color) => setDraft((d) => ({ ...d, color }))}
              />
            </div>

            <label className="block space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">
                {draft.type === 'credit' ? 'Доступно на старте' : 'Начальный баланс'}
              </span>
              <MoneyInput
                value={draft.initialBalance}
                onChange={(v) => setDraft((d) => ({ ...d, initialBalance: v }))}
              />
            </label>

            {draft.type === 'credit' && (
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--app-text-muted)]">Кредитный лимит</span>
                <MoneyInput
                  value={draft.creditLimit}
                  onChange={(v) => setDraft((d) => ({ ...d, creditLimit: v }))}
                  placeholder="380000"
                />
              </label>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={saving || !draft.name.trim()}
                onClick={() => void handleSave()}
                className="flex-1 rounded-lg bg-[var(--app-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              {modal.mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => void handleDelete(modal.account)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--app-danger)] px-3 py-2.5 text-sm text-[var(--app-danger)]"
                >
                  <Trash2 size={16} />
                  Закрыть
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

export function CategoriesEditor() {
  const categories = useBudgetStore((s) => s.categories);
  const saveCategory = useBudgetStore((s) => s.saveCategory);
  const deleteCategory = useBudgetStore((s) => s.deleteCategory);

  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; category: Category } | null
  >(null);
  const [draft, setDraft] = useState<CategoryDraft>(emptyCategoryDraft());
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setDraft(emptyCategoryDraft());
    setModal({ mode: 'create' });
  };

  const openEdit = (category: Category) => {
    setDraft(categoryToDraft(category));
    setModal({ mode: 'edit', category });
  };

  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await saveCategory({
        name: draft.name.trim(),
        type: draft.type,
        icon: draft.icon,
        color: draft.color,
        monthlyLimit: draft.monthlyLimit
          ? Number(draft.monthlyLimit.replace(',', '.'))
          : null,
        sortOrder:
          modal?.mode === 'create'
            ? Math.max(0, ...categories.map((c) => c.sortOrder)) + 1
            : modal?.mode === 'edit'
              ? modal.category.sortOrder
              : 0,
        ...(modal?.mode === 'edit' ? { id: modal.category.id } : {}),
      });
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Удалить категорию «${category.name}»?`)) return;
    await deleteCategory(category.id);
    closeModal();
  };

  const userCategories = categories
    .filter((c) => c.isActive && c.type !== 'system')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Категории</h2>
          <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">
            Расходы и доходы с иконками и лимитами
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {userCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => openEdit(cat)}
            className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] p-3 text-left transition-colors hover:border-[var(--app-primary)] hover:bg-[var(--app-bg-soft)]"
          >
            <CategoryIcon categoryId={cat.id} size={20} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{cat.name}</p>
              <p className="text-xs text-[var(--app-text-muted)]">
                {CATEGORY_TYPE_LABELS[cat.type]}
                {cat.monthlyLimit != null && ` · лимит ${cat.monthlyLimit.toLocaleString('ru-RU')} ₽`}
              </p>
            </div>
          </button>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Новая категория' : 'Редактирование категории'}
          onClose={closeModal}
        >
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Название</span>
              <input
                className="money-input"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Еда"
                autoFocus
              />
            </label>

            <div className="space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Тип</span>
              <div className="flex gap-2">
                {(['expense', 'income'] as CategoryType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, type: t }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      draft.type === t
                        ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
                        : 'border-[var(--app-border)]'
                    }`}
                  >
                    {CATEGORY_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Иконка</span>
              <IconPicker
                value={draft.icon}
                onChange={(icon) => setDraft((d) => ({ ...d, icon }))}
              />
            </div>

            <div className="space-y-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Цвет</span>
              <ColorPicker
                value={draft.color}
                onChange={(color) => setDraft((d) => ({ ...d, color }))}
              />
            </div>

            {draft.type === 'expense' && (
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--app-text-muted)]">Месячный лимит (необязательно)</span>
                <MoneyInput
                  value={draft.monthlyLimit}
                  onChange={(v) => setDraft((d) => ({ ...d, monthlyLimit: v }))}
                  placeholder="15000"
                />
              </label>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={saving || !draft.name.trim()}
                onClick={() => void handleSave()}
                className="flex-1 rounded-lg bg-[var(--app-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              {modal.mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => void handleDelete(modal.category)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--app-danger)] px-3 py-2.5 text-sm text-[var(--app-danger)]"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

export function MaintenanceTools() {
  const transactions = useBudgetStore((s) => s.transactions);
  const uncategorized = transactions.filter(
    (t) => !t.categoryId && (t.expenseAmount || t.incomeAmount),
  ).length;
  const noAccount = transactions.filter((t) => !t.accountId).length;

  return (
    <Card>
      <h2 className="font-semibold">Обслуживание</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        Проверка качества данных в журнале
      </p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--app-bg-soft)] p-3">
          <dt className="text-xs text-[var(--app-text-muted)]">Без категории</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{uncategorized}</dd>
        </div>
        <div className="rounded-xl bg-[var(--app-bg-soft)] p-3">
          <dt className="text-xs text-[var(--app-text-muted)]">Без счёта</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{noAccount}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-[var(--app-text-muted)]">
        Массовое назначение — в журнале, кнопка внутри месяца
      </p>
    </Card>
  );
}
