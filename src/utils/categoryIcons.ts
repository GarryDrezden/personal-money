import type { LucideIcon } from 'lucide-react';
import type { Category } from '../types';
import { ICON_COMPONENTS, resolveIconComponent } from './icons';

/** @deprecated use ICON_COMPONENTS */
export const CATEGORY_ICON_COMPONENTS = ICON_COMPONENTS;

/** Fallback, если в БД icon = null */
export const CATEGORY_ICON_BY_ID: Record<string, string> = {
  food: 'utensils',
  monthly: 'calendar',
  credits: 'landmark',
  alcohol: 'wine',
  other: 'more-horizontal',
  home: 'home',
  car: 'car',
  health: 'heart-pulse',
  pets: 'paw-print',
  entertainment: 'party-popper',
  games: 'gamepad-2',
  marketplace: 'shopping-bag',
  transport: 'bus',
  clothes: 'shirt',
  salary: 'banknote',
  advance: 'wallet',
  bonus: 'gift',
  refund: 'rotate-ccw',
  stanusha: 'heart',
  other_income: 'plus-circle',
  transfer: 'arrow-left-right',
  correction: 'wrench',
  credit_card_payment: 'credit-card',
};

const LEGACY_EXCEL_ICON: Record<string, string> = {
  'Основная карта': 'credit-card',
  'На кредиты': 'landmark',
  'Общая карта': 'wallet',
  Еда: 'utensils',
  Ежемесячные: 'calendar',
  Стануша: 'heart',
  Кредиты: 'landmark',
  Остальное: 'more-horizontal',
  Кредитка: 'badge-ruble',
  Алкоголь: 'wine',
};

export function resolveCategoryIconComponent(
  categories: Category[],
  categoryId?: string | null,
  legacyName?: string | null,
): LucideIcon {
  const cat = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const slug =
    cat?.icon ??
    (categoryId ? CATEGORY_ICON_BY_ID[categoryId] : undefined) ??
    (legacyName ? LEGACY_EXCEL_ICON[legacyName] : undefined) ??
    (legacyName && CATEGORY_ICON_BY_ID[legacyName] ? CATEGORY_ICON_BY_ID[legacyName] : undefined);

  return resolveIconComponent(slug);
}
