import { useMemo, useState } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { parseMoneyInput } from '../../utils/budget';
import {
  formatReceiptAmount,
  parseReceiptText,
  serializeReceipt,
  type ReceiptItem,
  type ReceiptParseResult,
} from '../../utils/receiptParse';
import { Modal } from '../ui/Modal';

function applyItems(parsed: ReceiptParseResult, items: ReceiptItem[]): string {
  return serializeReceipt({ ...parsed, items });
}

function ReceiptEditor({
  value,
  onChange,
  onParsed,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (parsed: ReceiptParseResult) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const parsed = useMemo(() => parseReceiptText(draft), [draft]);

  const commit = (next: string) => {
    onChange(next);
    onParsed?.(parseReceiptText(next));
  };

  const patchParsed = (patch: Partial<ReceiptParseResult>) => {
    setDraft(serializeReceipt({ ...parsed, ...patch }));
  };

  const patchItem = (index: number, patch: Partial<ReceiptItem>) => {
    const items = parsed.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    setDraft(applyItems(parsed, items));
  };

  const removeItem = (index: number) => {
    setDraft(applyItems(parsed, parsed.items.filter((_, i) => i !== index)));
  };

  const addItem = () => {
    setDraft(
      applyItems(parsed, [...parsed.items, { name: 'Новая позиция', amount: 1, count: 1 }]),
    );
  };

  const save = () => {
    commit(draft.trim());
    onClose();
  };

  const clear = () => {
    commit('');
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Магазин
          <input
            className="money-input"
            defaultValue={parsed.store ?? ''}
            key={`store-${parsed.store ?? ''}`}
            onBlur={(e) => patchParsed({ store: e.target.value.trim() || null })}
            placeholder="Глобус"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Дата
          <input
            type="date"
            className="money-input"
            value={parsed.date ?? ''}
            onChange={(e) => patchParsed({ date: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Итого
          <input
            className="money-input"
            inputMode="decimal"
            defaultValue={parsed.total != null ? formatReceiptAmount(parsed.total) : ''}
            key={`total-${parsed.total ?? ''}`}
            onBlur={(e) => {
              const n = parseMoneyInput(e.target.value);
              patchParsed({ total: n != null && n > 0 ? n : null });
            }}
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Позиции</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-[var(--app-primary)] hover:underline"
            onClick={addItem}
          >
            <Plus size={14} />
            Добавить
          </button>
        </div>
        {parsed.items.length ? (
          <ul className="max-h-52 space-y-1.5 overflow-y-auto">
            {parsed.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center gap-2">
                <input
                  className="money-input min-w-0 flex-1 text-sm"
                  defaultValue={item.name}
                  key={`name-${index}-${item.name}`}
                  onBlur={(e) => patchItem(index, { name: e.target.value })}
                />
                <input
                  className="money-input w-24 text-right text-sm"
                  inputMode="decimal"
                  defaultValue={formatReceiptAmount(item.amount)}
                  key={`amt-${index}-${item.amount}`}
                  onBlur={(e) => {
                    const n = parseMoneyInput(e.target.value);
                    if (n != null && n > 0) patchItem(index, { amount: n, count: 1 });
                  }}
                />
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10"
                  aria-label="Удалить позицию"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--app-text-muted)]">Позиций пока нет — вставьте текст или добавьте вручную</p>
        )}
      </div>

      <label className="flex w-full flex-col gap-1">
        <span className="text-sm font-medium">Исходный текст</span>
        <textarea
          className="money-input min-h-[8rem] resize-y font-mono text-xs leading-5"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={'Глобус\n04.10.2026\nМолоко — 106,15\nИтого 12 129,00'}
          spellCheck={false}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 disabled:opacity-40"
          disabled={!draft.trim() && !value.trim()}
          onClick={clear}
        >
          Очистить
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-[var(--app-text-muted)] hover:bg-[var(--app-bg-soft)]"
            onClick={onClose}
          >
            Отмена
          </button>
          <button type="button" className="btn-primary rounded-lg px-4 py-2 text-sm" onClick={save}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReceiptEditorButton({
  value,
  onChange,
  onParsed,
  size = 14,
}: {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (parsed: ReceiptParseResult) => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasText = Boolean(value.trim());

  return (
    <>
      <button
        type="button"
        className={`rounded-lg p-1 hover:bg-[var(--app-bg-soft)] ${
          hasText ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-muted)]'
        }`}
        aria-label={hasText ? 'Текст чека' : 'Добавить чек'}
        title={hasText ? 'Чек: открыть, поправить или очистить' : 'Текст чека'}
        onClick={() => setOpen(true)}
      >
        <Receipt size={size} />
      </button>
      {open && (
        <Modal title="Чек" onClose={() => setOpen(false)}>
          <ReceiptEditor
            value={value}
            onChange={onChange}
            onParsed={onParsed}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
