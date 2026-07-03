import { useBudgetStore } from '../../store/budgetStore';

interface AccountSelectProps {
  value: string;
  onChange: (id: string) => void;
  includeCredit?: boolean;
  className?: string;
  allowEmpty?: boolean;
}

export function AccountSelect({
  value,
  onChange,
  includeCredit = true,
  className = 'money-input',
  allowEmpty = false,
}: AccountSelectProps) {
  const accounts = useBudgetStore((s) => s.accounts);
  const filtered = accounts
    .filter((a) => a.status === 'active' && (includeCredit || a.type !== 'credit'))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">—</option>}
      {filtered.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
