import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FolderOpen,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { Account, Category } from '../../types';
import { useBudgetStore } from '../../store/budgetStore';
import { apiRepository } from '../../store/apiRepository';
import { markOnboardingCompleted, DEFAULT_ONBOARDING_EXPENSE_IDS } from '../../utils/onboarding';
import { AccountIcon } from '../shared/AccountIcon';
import { CategoryIcon } from '../shared/CategoryIcon';
import { MoneyInput } from '../shared/MoneyInput';

type StepId = 'welcome' | 'accounts' | 'credit' | 'categories' | 'first-tx' | 'done';

interface AccountDraft {
  enabled: boolean;
  name: string;
  balance: string;
}

interface CategoryDraft {
  enabled: boolean;
  limit: string;
}

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

const STEPS: { id: StepId; label: string }[] = [
  { id: 'welcome', label: 'Старт' },
  { id: 'accounts', label: 'Счета' },
  { id: 'credit', label: 'Кредитка' },
  { id: 'categories', label: 'Категории' },
  { id: 'first-tx', label: 'Операция' },
  { id: 'done', label: 'Готово' },
];

function parseMoney(value: string): number {
  const num = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

function initAccountDrafts(accounts: Account[]): Record<string, AccountDraft> {
  const drafts: Record<string, AccountDraft> = {};
  for (const acc of accounts.filter((a) => a.type === 'debit')) {
    drafts[acc.id] = {
      enabled: acc.id === 'main_card',
      name: acc.name,
      balance: String(acc.initialBalance || 0),
    };
  }
  return drafts;
}

function initCategoryDrafts(
  categoryIds: string[],
  categories: Category[],
): Record<string, CategoryDraft> {
  const drafts: Record<string, CategoryDraft> = {};
  for (const id of categoryIds) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) continue;
    drafts[id] = {
      enabled: DEFAULT_ONBOARDING_EXPENSE_IDS.includes(id as (typeof DEFAULT_ONBOARDING_EXPENSE_IDS)[number]),
      limit: cat.monthlyLimit != null ? String(cat.monthlyLimit) : '',
    };
  }
  return drafts;
}

export function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const accounts = useBudgetStore((s) => s.accounts);
  const categories = useBudgetStore((s) => s.categories);
  const months = useBudgetStore((s) => s.months);
  const init = useBudgetStore((s) => s.init);
  const showToast = useBudgetStore((s) => s.showToast);

  const debitAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'debit').sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts],
  );
  const creditAccount = useMemo(
    () => accounts.find((a) => a.type === 'credit' && a.isActive),
    [accounts],
  );
  const expenseCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === 'expense')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const [step, setStep] = useState<StepId>('welcome');
  const [busy, setBusy] = useState(false);
  const [accountDrafts, setAccountDrafts] = useState(() => initAccountDrafts(accounts));
  const [creditLimit, setCreditLimit] = useState(
    () => String(creditAccount?.creditLimit ?? creditAccount?.initialBalance ?? ''),
  );
  const [creditAvailable, setCreditAvailable] = useState(
    () => String(creditAccount?.initialBalance ?? creditAccount?.creditLimit ?? ''),
  );
  const [categoryDrafts, setCategoryDrafts] = useState(() =>
    initCategoryDrafts(
      expenseCategories.map((c) => c.id),
      categories,
    ),
  );
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('food');
  const [txAccountId, setTxAccountId] = useState('main_card');

  const showCreditStep = Boolean(creditAccount);

  const visibleSteps = useMemo(
    () => STEPS.filter((s) => s.id !== 'credit' || showCreditStep),
    [showCreditStep],
  );
  const visibleIndex = visibleSteps.findIndex((s) => s.id === step);

  const finish = () => {
    markOnboardingCompleted(userId);
    onComplete();
  };

  const saveAccounts = async () => {
    for (const acc of debitAccounts) {
      const draft = accountDrafts[acc.id];
      if (!draft) continue;
      await apiRepository.saveAccount({
        id: acc.id,
        name: draft.name.trim() || acc.name,
        initialBalance: parseMoney(draft.balance),
        isActive: draft.enabled,
        status: draft.enabled ? 'active' : 'hidden',
      });
    }
  };

  const saveCredit = async () => {
    if (!creditAccount) return;
    const limit = parseMoney(creditLimit);
    const available = parseMoney(creditAvailable);
    await apiRepository.saveAccount({
      id: creditAccount.id,
      creditLimit: limit > 0 ? limit : null,
      initialBalance: available > 0 ? available : limit,
      isActive: true,
      status: 'active',
    });
  };

  const saveCategories = async () => {
    for (const cat of expenseCategories) {
      const draft = categoryDrafts[cat.id];
      if (!draft) continue;
      const limitRaw = draft.limit.trim();
      await apiRepository.saveCategory({
        id: cat.id,
        isActive: draft.enabled,
        monthlyLimit: draft.enabled && limitRaw ? parseMoney(limitRaw) : null,
      });
    }
  };

  const goNext = async () => {
    setBusy(true);
    try {
      if (step === 'welcome') {
        setStep('accounts');
      } else if (step === 'accounts') {
        await saveAccounts();
        await init();
        setStep(showCreditStep ? 'credit' : 'categories');
      } else if (step === 'credit') {
        await saveCredit();
        await init();
        setStep('categories');
      } else if (step === 'categories') {
        await saveCategories();
        await init();
        const enabledAccounts = debitAccounts.filter((a) => accountDrafts[a.id]?.enabled);
        setTxAccountId(enabledAccounts[0]?.id ?? 'main_card');
        const enabledCats = expenseCategories.filter((c) => categoryDrafts[c.id]?.enabled);
        setTxCategoryId(enabledCats[0]?.id ?? 'food');
        setStep('first-tx');
      } else if (step === 'first-tx') {
        const amount = parseMoney(txAmount);
        if (amount > 0) {
          const currentMonth =
            months.find((m) => m.yearMonth === new Date().toISOString().slice(0, 7)) ??
            months[months.length - 1];
          if (currentMonth) {
            await apiRepository.createTransaction({
              monthId: currentMonth.id,
              operationKind: 'regular',
              accountId: txAccountId,
              categoryId: txCategoryId,
              txDate: new Date().toISOString().slice(0, 10),
              paymentStatus: 'done',
              expenseName: txName.trim() || 'Первая трата',
              expenseAmount: amount,
            });
            await init();
            showToast('Первая операция добавлена');
          }
        }
        setStep('done');
      } else if (step === 'done') {
        finish();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка сохранения', 'error');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step === 'accounts') setStep('welcome');
    else if (step === 'credit') setStep('accounts');
    else if (step === 'categories') setStep(showCreditStep ? 'credit' : 'accounts');
    else if (step === 'first-tx') setStep('categories');
  };

  const skipAll = () => finish();

  const enabledAccountOptions = debitAccounts.filter((a) => accountDrafts[a.id]?.enabled);
  const enabledCategoryOptions = expenseCategories.filter((c) => categoryDrafts[c.id]?.enabled);

  return createPortal(
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-panel">
        <div className="onboarding-progress">
          {visibleSteps.map((s, i) => (
            <div
              key={s.id}
              className={`onboarding-progress-dot ${i <= visibleIndex ? 'onboarding-progress-dot--active' : ''}`}
              title={s.label}
            />
          ))}
        </div>

        {step === 'welcome' && (
          <div className="onboarding-step">
            <div className="onboarding-icon-wrap">
              <Sparkles size={28} />
            </div>
            <h2 id="onboarding-title" className="onboarding-title">
              Добро пожаловать в Личный бюджет
            </h2>
            <p className="onboarding-text">
              За пару минут настроим счета, категории и запишем первую операцию. Потом можно сразу
              пользоваться — журнал, аналитика и лимиты уже ждут.
            </p>
            <ul className="onboarding-list">
              <li>
                <Wallet size={16} /> Счета и текущие балансы
              </li>
              <li>
                <CreditCard size={16} /> Кредитка (если есть)
              </li>
              <li>
                <FolderOpen size={16} /> Категории расходов
              </li>
              <li>
                <CheckCircle2 size={16} /> Первая запись в журнале
              </li>
            </ul>
          </div>
        )}

        {step === 'accounts' && (
          <div className="onboarding-step">
            <h2 className="onboarding-title">Ваши карты и счета</h2>
            <p className="onboarding-text">
              Отметьте, чем пользуетесь, укажите названия и сколько сейчас на каждом счёте.
            </p>
            <div className="onboarding-scroll">
              {debitAccounts.map((acc) => {
                const draft = accountDrafts[acc.id];
                if (!draft) return null;
                return (
                  <div key={acc.id} className="onboarding-row">
                    <label className="onboarding-check">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) =>
                          setAccountDrafts((prev) => ({
                            ...prev,
                            [acc.id]: { ...draft, enabled: e.target.checked },
                          }))
                        }
                      />
                      <AccountIcon icon={acc.icon} accountColor={acc.color} size={18} />
                    </label>
                    <input
                      className="money-input onboarding-row-name"
                      value={draft.name}
                      disabled={!draft.enabled}
                      onChange={(e) =>
                        setAccountDrafts((prev) => ({
                          ...prev,
                          [acc.id]: { ...draft, name: e.target.value },
                        }))
                      }
                    />
                    <div className="onboarding-row-amount">
                      <MoneyInput
                        value={draft.balance}
                        disabled={!draft.enabled}
                        onChange={(v) =>
                          setAccountDrafts((prev) => ({
                            ...prev,
                            [acc.id]: { ...draft, balance: v },
                          }))
                        }
                        className="money-input"
                      />
                      <span className="onboarding-currency">₽</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'credit' && creditAccount && (
          <div className="onboarding-step">
            <h2 className="onboarding-title">Кредитная карта</h2>
            <p className="onboarding-text">
              Укажите лимит и сколько сейчас доступно — так приложение покажет долг и свободный
              остаток.
            </p>
            <div className="onboarding-fields">
              <label className="quick-entry-field">
                <span className="quick-entry-label">Лимит</span>
                <MoneyInput value={creditLimit} onChange={setCreditLimit} className="money-input" />
              </label>
              <label className="quick-entry-field">
                <span className="quick-entry-label">Доступно сейчас</span>
                <MoneyInput value={creditAvailable} onChange={setCreditAvailable} className="money-input" />
              </label>
            </div>
          </div>
        )}

        {step === 'categories' && (
          <div className="onboarding-step">
            <h2 className="onboarding-title">Категории расходов</h2>
            <p className="onboarding-text">
              Включите нужные категории. Лимит необязателен — можно задать позже в настройках.
            </p>
            <div className="onboarding-scroll">
              {expenseCategories.map((cat) => {
                const draft = categoryDrafts[cat.id];
                if (!draft) return null;
                return (
                  <div key={cat.id} className="onboarding-row onboarding-row--category">
                    <label className="onboarding-check">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) =>
                          setCategoryDrafts((prev) => ({
                            ...prev,
                            [cat.id]: { ...draft, enabled: e.target.checked },
                          }))
                        }
                      />
                      <CategoryIcon categoryId={cat.id} size={18} />
                      <span className="min-w-0 truncate">{cat.name}</span>
                    </label>
                    <input
                      className="money-input onboarding-row-limit"
                      placeholder="Лимит ₽"
                      disabled={!draft.enabled}
                      value={draft.limit}
                      onChange={(e) =>
                        setCategoryDrafts((prev) => ({
                          ...prev,
                          [cat.id]: { ...draft, limit: e.target.value },
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'first-tx' && (
          <div className="onboarding-step">
            <h2 className="onboarding-title">Первая операция</h2>
            <p className="onboarding-text">
              Попробуйте записать недавнюю трату — или пропустите и добавите позже в журнале.
            </p>
            <div className="onboarding-fields">
              <label className="quick-entry-field">
                <span className="quick-entry-label">Название</span>
                <input
                  className="money-input"
                  value={txName}
                  onChange={(e) => setTxName(e.target.value)}
                  placeholder="Пятёрочка, такси…"
                />
              </label>
              <label className="quick-entry-field">
                <span className="quick-entry-label">Сумма</span>
                <MoneyInput value={txAmount} onChange={setTxAmount} className="money-input" />
              </label>
              <label className="quick-entry-field">
                <span className="quick-entry-label">Счёт</span>
                <select
                  className="money-input"
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                >
                  {enabledAccountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountDrafts[a.id]?.name || a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="quick-entry-field">
                <span className="quick-entry-label">Категория</span>
                <select
                  className="money-input"
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                >
                  {enabledCategoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="onboarding-step onboarding-step--center">
            <div className="onboarding-icon-wrap onboarding-icon-wrap--success">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="onboarding-title">Всё готово!</h2>
            <p className="onboarding-text">
              Бюджет настроен. На главной — пульс финансов, быстрый ввод и категории за месяц.
            </p>
          </div>
        )}

        <div className="onboarding-actions">
          {step !== 'welcome' && step !== 'done' && (
            <button type="button" className="onboarding-btn-secondary" onClick={goBack} disabled={busy}>
              <ArrowLeft size={16} />
              Назад
            </button>
          )}
          <div className="onboarding-actions-right">
            {step !== 'done' && (
              step === 'welcome' ? (
                <Link to="/settings" onClick={skipAll} className="onboarding-btn-ghost">
                  У меня есть Excel — импорт
                </Link>
              ) : (
                <button type="button" className="onboarding-btn-ghost" onClick={skipAll} disabled={busy}>
                  Пропустить
                </button>
              )
            )}
            <button type="button" className="onboarding-btn-primary btn-primary" onClick={() => void goNext()} disabled={busy}>
              {step === 'done' ? (
                'На главную'
              ) : step === 'first-tx' ? (
                txAmount.trim() ? 'Сохранить и завершить' : 'Пропустить шаг'
              ) : (
                <>
                  Далее
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
