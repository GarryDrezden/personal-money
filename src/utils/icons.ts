import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  BadgeRussianRuble,
  Banknote,
  BookOpen,
  Bus,
  Calendar,
  Car,
  Cloud,
  CreditCard,
  Gamepad2,
  Gift,
  Hammer,
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
  ShoppingCart,
  Tag,
  Utensils,
  Wallet,
  Wine,
  Wrench,
  Zap,
} from 'lucide-react';

/** Иконки по slug из seed-categories.json */
export const ICON_COMPONENTS: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  calendar: Calendar,
  landmark: Landmark,
  wine: Wine,
  'more-horizontal': MoreHorizontal,
  home: Home,
  hammer: Hammer,
  car: Car,
  zap: Zap,
  cloud: Cloud,
  'heart-pulse': HeartPulse,
  'paw-print': PawPrint,
  'party-popper': PartyPopper,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  'book-open': BookOpen,
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

export const ICON_SLUGS = Object.keys(ICON_COMPONENTS);

export const COLOR_OPTIONS: { id: string; label: string; hex: string }[] = [
  { id: 'orange', label: 'Оранжевый', hex: '#f59e0b' },
  { id: 'blue', label: 'Синий', hex: '#3b82f6' },
  { id: 'green', label: 'Зелёный', hex: '#10b981' },
  { id: 'red', label: 'Красный', hex: '#ef4444' },
  { id: 'purple', label: 'Фиолетовый', hex: '#8b5cf6' },
  { id: 'teal', label: 'Бирюзовый', hex: '#14b8a6' },
  { id: 'pink', label: 'Розовый', hex: '#ec4899' },
  { id: 'slate', label: 'Серый', hex: '#64748b' },
];

export function colorHex(colorId: string | null | undefined): string {
  return COLOR_OPTIONS.find((c) => c.id === colorId)?.hex ?? 'var(--app-primary)';
}

export function resolveIconComponent(slug: string | null | undefined): LucideIcon {
  if (slug && ICON_COMPONENTS[slug]) return ICON_COMPONENTS[slug];
  return Tag;
}
