import { parseMoneyInput } from '../../utils/budget';

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function MoneyInput({
  value,
  onChange,
  onParsed,
  placeholder = '0',
  className = 'money-input',
  onKeyDown,
}: MoneyInputProps) {
  return (
    <input
      className={className}
      value={value}
      placeholder={placeholder}
      inputMode="decimal"
      onChange={(e) => {
        onChange(e.target.value);
        onParsed?.(parseMoneyInput(e.target.value));
      }}
      onKeyDown={onKeyDown}
    />
  );
}
