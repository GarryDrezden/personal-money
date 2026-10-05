import { useMemo, useState } from 'react';
import { parseReceiptText, receiptPreviewLabel } from '../../utils/receiptParse';

export function ReceiptTextField({
  value,
  onChange,
  onParsed,
  defaultOpen = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (parsed: ReturnType<typeof parseReceiptText>) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || Boolean(value));
  const parsed = useMemo(() => parseReceiptText(value), [value]);
  const preview = receiptPreviewLabel(parsed);

  if (!open && !value) {
    return (
      <button type="button" className="quick-entry-note-toggle" onClick={() => setOpen(true)}>
        + Текст чека
      </button>
    );
  }

  return (
    <label className="flex w-full flex-col gap-1">
      <span className="quick-entry-label">Текст чека</span>
      <textarea
        className="money-input min-h-[8rem] resize-y font-mono text-xs leading-5"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          onParsed?.(parseReceiptText(next));
        }}
        placeholder="Вставьте текст чека из GPT или PDF: Глобус, Перекрёсток, список позиций…"
        spellCheck={false}
      />
      {preview && (
        <span className="text-xs text-[var(--app-text-muted)]">Распознано: {preview}</span>
      )}
      {value && parsed.items.length === 0 && (
        <span className="text-xs text-[var(--app-warning)]">
          Позиции не найдены — сохраним текст как есть, разбор можно поправить позже
        </span>
      )}
    </label>
  );
}
