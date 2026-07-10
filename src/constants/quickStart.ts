import { BarChart3, BookOpen, Home, Plus, Settings, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface QuickStartStep {
  icon: LucideIcon;
  title: string;
  body: string;
  link?: { to: string; label: string };
}

export const QUICK_START_STEPS: QuickStartStep[] = [
  {
    icon: Settings,
    title: '1. Настройте счета и категории',
    body: 'Откройте Настройки → Бюджет: укажите карты, кредитку и лимиты по категориям. Это основа для корректных цифр.',
    link: { to: '/settings', label: 'Открыть настройки' },
  },
  {
    icon: Plus,
    title: '2. Запишите первую операцию',
    body: 'Кнопка + внизу справа или «Быстрый ввод» на главной и в журнале. Сумма, название, Enter — готово за несколько секунд.',
    link: { to: '/ledger', label: 'Открыть журнал' },
  },
  {
    icon: Home,
    title: '3. Следите за главной',
    body: 'Блок «Всё в порядке» / «Требует внимания» подскажет, что разобрать. Ниже — балансы карт, категории и последние траты.',
    link: { to: '/', label: 'На главную' },
  },
  {
    icon: BookOpen,
    title: '4. Журнал — вся история',
    body: 'Фильтры, редактирование, массовое назначение категории. Операции без категории или счёта — через блок внимания на главной.',
    link: { to: '/ledger', label: 'Журнал' },
  },
  {
    icon: BarChart3,
    title: '5. Аналитика и тренды',
    body: 'Сравнение месяцев, прогноз расходов, превышения лимитов. Заглядывайте раз в неделю.',
    link: { to: '/analytics', label: 'Аналитика' },
  },
  {
    icon: Sparkles,
    title: '6. Импорт из Excel (по желанию)',
    body: 'Если вели бюджет в таблице — Настройки → Данные → импорт .xlsx. Счета и категории при этом сохраняются.',
    link: { to: '/settings', label: 'Импорт данных' },
  },
];

export const QUICK_START_INTRO =
  'Краткая шпаргалка: как начать вести бюджет в «Личный бюджет» с нуля или после входа.';
