import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { ThemeId } from '../types';
import { useBudgetStore } from '../store/budgetStore';
import { apiRepository } from '../store/apiRepository';
import { Card } from '../components/ui/Card';
import {
  AccountsEditor,
  CategoriesEditor,
  MaintenanceTools,
} from '../components/settings/SettingsEditors';

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'darkFantasy', label: 'Dark Fantasy' },
];

export function SettingsPage() {
  const settings = useBudgetStore((s) => s.settings);
  const months = useBudgetStore((s) => s.months);
  const transactions = useBudgetStore((s) => s.transactions);
  const saveSettings = useBudgetStore((s) => s.saveSettings);
  const importFile = useBudgetStore((s) => s.importFile);
  const init = useBudgetStore((s) => s.init);

  const fileRef = useRef<HTMLInputElement>(null);
  const [openingBalance, setOpeningBalance] = useState(String(settings.initialOpeningBalance));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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
      await importFile(file, Boolean(settings.importCompletedAt));
      setMessage(`Импорт завершён: ${months.length} месяцев`);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка импорта');
    } finally {
      setBusy(false);
      await init();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-[var(--app-text-muted)]">Счета, категории, импорт</p>
      </div>

      {message && (
        <Card variant="neutral">
          <p className="text-sm">{message}</p>
        </Card>
      )}

      <AccountsEditor />
      <CategoriesEditor />
      <MaintenanceTools />

      <Card>
        <h2 className="font-semibold">Статус данных</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--app-text-muted)]">Импорт</dt>
            <dd>{settings.importCompletedAt ? new Date(settings.importCompletedAt).toLocaleString('ru-RU') : 'не выполнен'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--app-text-muted)]">Месяцев</dt>
            <dd>{months.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--app-text-muted)]">Операций</dt>
            <dd>{transactions.length}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold">Импорт Excel</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          Загрузите Бюджет.xlsx. Повторный импорт перезапишет все данные.
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="mt-3 block w-full text-sm" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void handleImport()}
          >
            <Upload size={16} />
            {settings.importCompletedAt ? 'Импортировать заново' : 'Импортировать'}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Начальный баланс</h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Сумма
            <input
              className="money-input w-40"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm"
            onClick={() => void handleSaveOpening()}
          >
            Сохранить
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Тема</h2>
        <div className="mt-3 flex gap-2">
          {THEMES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm ${
                settings.themeId === id
                  ? 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
                  : 'border border-[var(--app-border)]'
              }`}
              onClick={() => void saveSettings({ themeId: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Бэкап</h2>
        <a
          href={apiRepository.backupUrl()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm hover:bg-[var(--app-bg-soft)]"
        >
          <Download size={16} />
          Скачать personal-budget.sqlite
        </a>
      </Card>
    </div>
  );
}
