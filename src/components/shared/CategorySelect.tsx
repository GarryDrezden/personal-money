import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useBudgetStore } from '../../store/budgetStore';
import { CategoryIcon } from './CategoryIcon';

interface CategorySelectProps {
  value: string;
  onChange: (id: string) => void;
  type?: 'expense' | 'income' | 'all';
  className?: string;
  allowEmpty?: boolean;
}

function useDropdownPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

  return pos;
}

export function CategorySelect({
  value,
  onChange,
  type = 'expense',
  className = 'money-input',
  allowEmpty = true,
}: CategorySelectProps) {
  const categories = useBudgetStore((s) => s.categories);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pos = useDropdownPosition(open, buttonRef);

  const filtered = categories
    .filter((c) => c.isActive && (type === 'all' || c.type === type))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const selected = filtered.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const dropdown = open
    ? createPortal(
        <ul
          ref={listRef}
          className="fixed z-[200] max-h-56 overflow-y-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-card-strong)] py-1 shadow-lg"
          style={{
            top: pos.top,
            left: pos.left,
            width: Math.max(pos.width, 160),
          }}
        >
          {allowEmpty && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-[var(--app-bg-soft)]"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                —
              </button>
            </li>
          )}
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-[var(--app-bg-soft)] ${
                  c.id === value ? 'bg-[var(--app-primary-soft)]' : ''
                }`}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
              >
                <CategoryIcon categoryId={c.id} size={14} />
                <span className="truncate">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        className={`${className} flex w-full min-w-0 items-center justify-between gap-1.5 text-left`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {selected ? (
            <>
              <CategoryIcon categoryId={selected.id} size={14} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-[var(--app-text-muted)]">—</span>
          )}
        </span>
        <ChevronDown size={14} className="shrink-0 opacity-60" />
      </button>
      {dropdown}
    </div>
  );
}
