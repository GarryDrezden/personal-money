import { useRef, useState } from 'react';
import { Download, Palette, Upload, Wallet, Database, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ThemeId } from '../types';
import { useBudgetStore } from '../store/budgetStore';
import { apiRepository } from '../store/apiRepository';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import {
  AccountsEditor,
  CategoriesEditor,
  MaintenanceTools,
} from '../components/settings/SettingsEditors';

const THEMES: { id: ThemeId; label: string; description: string }[] = [
  { id: 'cozy', label: 'Уютная', description: 'Светлая тема с тёплыми акцентами' },
  { id: 'darkFantasy', label: 'Тёмная', description: 'Контрастная тёмная тема' },
];

type SettingsTab = 'budget' | 'data' | 'appearance';

const TABS: { id: SettingsTab; label: string; icon: typeof Wallet }[] = [
  { id: 'budget', label: 'Бюджет', icon: Wallet },
  { id: 'data', label: 'Данные', icon: Database },
  { id: 'appearance', label: 'Вид', icon: Palette },
];

export function SettingsPage() {
  const settings = useBudgetStore((s) => s.settings);
  const months = useBudgetStore((s) => s.months);
  const transactions = useBudgetStore((s) => s.transactions);
  const saveSettings = useBudgetStore((s) => s.saveSettings);
  const init = useBudgetStore((s) => s.init);

  const fileRef = useRef<HTMLInputElement>(null);
  const [openingBalance, setOpeningBalance] = useState(String(settings.initialOpeningBalance));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<SettingsTab>('budget');

  const handleSaveOpening = async () => {
    const value = Number(openingBalance.replace(',', '.'));
    if (!Number.isFinite(value)) return;
    setBusy(true);
    try {
      await saveSettings({ initialOpeningBalance: value });
      setMessage('Начальный баланс сохранён');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage('Выберите файл .xlsx');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (settings.importCompletedAt) {
        await apiRepository.resetImport();
      }
      const result = await apiRepository.importXlsx(file, Boolean(settings.importCompletedAt));
      setMessage(`Импорт завершён: ${result.months} мес., ${result.transactions} операций`);
      if (fileRef.current) fileRef.current.value = '';
      await init();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка импорта');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки"
        subtitle="Счета, категории, импорт и оформление"
        actions={
          <Link
            to="/faq"
            className="surface-chip inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
          >
            <HelpCircle size={16} />
            Справка
          </Link>
        }
      />

      <div className="surface-panel flex gap-1 overflow-x-auto p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-[var(--app-card-strong)] text-[var(--app-primary)] shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {message && (
        <Card variant="neutral">
          <p className="text-sm">{message}</p>
        </Card>
      )}

      {tab === 'budget' && (
        <>
          <AccountsEditor />
          <CategoriesEditor />
        </>
      )}

      {tab === 'data' && (
        <>
          <MaintenanceTools />

          <Card>
            <h2 className="font-semibold">Статус данных</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[var(--app-bg-soft)] p-3">
                <dt className="text-xs text-[var(--app-text-muted)]">Импорт</dt>
                <dd className="mt-1 text-sm font-medium">
                  {settings.importCompletedAt
                    ? new Date(settings.importCompletedAt).toLocaleString('ru-RU')
                    : 'не выполнен'}
                </dd>
              </div>
              <div className="rounded-xl bg-[var(--app-bg-soft)] p-3">
                <dt className="text-xs text-[var(--app-text-muted)]">Месяцев</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{months.length}</dd>
              </div>
              <div className="rounded-xl bg-[var(--app-bg-soft)] p-3">
                <dt className="text-xs text-[var(--app-text-muted)]">Операций</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{transactions.length}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold">Импорт Excel</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Загрузите Бюджет.xlsx. Повторный импорт перезапишет все данные.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="mt-3 block w-full rounded-lg border border-dashed border-[var(--app-border)] bg-[var(--app-bg-soft)] p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--app-primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--app-primary-fg)]"
            />
            <button
              type="button"
              disabled={busy}
              className="btn-primary mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              onClick={() => void handleImport()}
            >
              <Upload size={16} />
              {settings.importCompletedAt ? 'Импортировать заново' : 'Импортировать'}
            </button>
          </Card>

          <Card>
            <h2 className="font-semibold">Общий начальный баланс</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Базовая сумма для расчёта накоплений по месяцам (отдельно от балансов карт)
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--app-text-muted)]">Сумма, ₽</span>
                <input
                  className="money-input w-40"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm hover:bg-[var(--app-bg-soft)]"
                onClick={() => void handleSaveOpening()}
              >
                Сохранить
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold">Бэкап</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Скачивание SQLite-файла доступно только при локальной разработке. На хостинге данные
              хранятся в MySQL.
            </p>
            <a
              href={apiRepository.backupUrl()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm hover:bg-[var(--app-bg-soft)]"
            >
              <Download size={16} />
              Скачать бэкап
            </a>
          </Card>
        </>
      )}

      {tab === 'appearance' && (
        <Card>
          <h2 className="font-semibold">Тема оформления</h2>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            Выберите цветовую схему интерфейса
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {THEMES.map(({ id, label, description }) => (
              <button
                key={id}
                type="button"
                onClick={() => void saveSettings({ themeId: id })}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  settings.themeId === id
                    ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)]'
                    : 'border-[var(--app-border)] hover:border-[var(--app-primary)]'
                }`}
              >
                <p className="font-medium">{label}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">{description}</p>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
