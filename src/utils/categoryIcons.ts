import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  BadgeRussianRuble,
  Banknote,
  Bus,
  Calendar,
  Car,
  CreditCard,
  Gamepad2,
  Gift,
  Heart,
  HeartPulse,
  Home,
  Landmark,
  MoreHorizontal,
  PartyPopper,
  PawPrint,
  PlusCircle,
  RotateCcw,
  Shirt,
  ShoppingBag,
  Tag,
  Utensils,
  Wallet,
  Wine,
  Wrench,
} from 'lucide-react';
import type { Category } from '../types';

/** Иконки по slug из seed-categories.json */
export const CATEGORY_ICON_COMPONENTS: Record<string, LucideIcon> = {
  utensils: Utensils,
  calendar: Calendar,
  landmark: Landmark,
  wine: Wine,
  'more-horizontal': MoreHorizontal,
  home: Home,
  car: Car,
  'heart-pulse': HeartPulse,
  'paw-print': PawPrint,
  'party-popper': PartyPopper,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  bus: Bus,
  shirt: Shirt,
  banknote: Banknote,
  wallet: Wallet,
  gift: Gift,
  'rotate-ccw': RotateCcw,
  heart: Heart,
  'plus-circle': PlusCircle,
  'arrow-left-right': ArrowLeftRight,
  wrench: Wrench,
  'credit-card': CreditCard,
  'badge-ruble': BadgeRussianRuble,
};

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

  if (slug && CATEGORY_ICON_COMPONENTS[slug]) {
    return CATEGORY_ICON_COMPONENTS[slug];
  }

  return Tag;
}
