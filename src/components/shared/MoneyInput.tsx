import { forwardRef } from 'react';
import { parseMoneyInput } from '../../utils/budget';

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    onChange,
    onParsed,
    placeholder = '0',
    className = 'money-input',
    onKeyDown,
    disabled,
  },
  ref,
) {
  return (
    <input
      ref={ref}
      className={className}
      value={value}
      placeholder={placeholder}
      inputMode="decimal"
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        onParsed?.(parseMoneyInput(e.target.value));
      }}
      onKeyDown={onKeyDown}
    />
  );
});
