# 07. Дизайн, UX и темы

## Брендинг

| Элемент | Значение |
|---------|----------|
| Название | Личный бюджет |
| Short name (PWA) | Бюджет |
| Шрифт | **Manrope** (Google Fonts) |
| Логотип | `public/logo-icon.png` — иконка кошелька |
| Favicon | logo-icon.png |
| Primary CTA | Amber/yellow `#f59e0b` / `#eab308` |
| Primary text on CTA | Dark `#1c1917` (--app-primary-fg) — fix contrast sprint 2 |

---

## Темы оформления

Переключение: Настройки → Вид → сохраняется в `app_settings.theme_id` + `localStorage`.

### cozy (default)

- Светло-розовый фон `#ffe4ef`
- **Hello Kitty repeating pattern** — `public/bg-hello-kitty.png` (512px tile)
- Карточки: полупрозрачный белый `rgba(255,255,255,0.93-0.97)`
- Акценты: amber primary, pink secondary
- Nav active: rose tones

**UX-проблема (известная):** серый muted-текст и заголовки без фона **сливаются** с пёстрым фоном между карточками. Частично решено:
- `surface-panel` для PageHeader
- Удалён заголовок «Карты и счета» (сливался)
- Карточки с backdrop-blur и strong opacity

### darkFantasy

- Тёмный фон `#090812` + CSS gradient stars
- Карточки: тёмно-фиолетовые полупрозрачные
- Primary: gold `#eab308`
- Secondary: violet `#a78bfa`
- Высокий контраст текста

---

## CSS-архитектура

Файл: `src/index.css` (~1300 строк)

### CSS Variables (--app-*)

```
--app-bg, --app-bg-soft, --app-card, --app-card-strong
--app-surface, --app-border
--app-text, --app-text-muted
--app-primary, --app-primary-fg, --app-primary-hover, --app-primary-soft
--app-secondary, --app-success, --app-danger, --app-warning
--app-shadow, --app-glow, --app-progress-track
--app-nav-active-bg, --app-nav-active-text
```

### Utility classes (custom)

| Class | Назначение |
|-------|------------|
| `.btn-primary` | Primary button |
| `.money-input` | Numeric input styling |
| `.surface-panel` | Header background panel |
| `.surface-chip` | Small action chips |
| `.ledger-top-grid` | 50/50 two-column layout |
| `.ledger-table-summary` | Centered totals bar |
| `.quick-entry-*` | Quick form layout |

### Tailwind

Tailwind 4 via `@import "tailwindcss"`. Компоненты используют mix: CSS vars + Tailwind utilities.

---

## Layout patterns

### 50/50 grids (`ledger-top-grid`)

Используется на:
- Dashboard: header + attention
- Dashboard: quick entry + categories
- Ledger: quick entry + filters

Mobile: stacks vertically (`grid-cols-1`).
Desktop: `grid-cols-2` equal width.

### Cards

`Card` component variants:
- `default` — white/surface
- `success` — green tint (AttentionBlock ok)
- `danger` — red tint (AttentionBlock alert)
- `neutral` — gray (messages)

### Empty states

`EmptyState` component:
- icon (Lucide)
- title + description
- optional CTA link
- `compact` prop for inline use

---

## Mobile UX

| Решение | Детали |
|---------|--------|
| Bottom navigation | 5 icons, 9px labels |
| FAB | Fixed bottom-right, above nav |
| Transaction cards | Replace table < md |
| Horizontal scroll | Settings tabs, filter chips |
| Touch targets | Buttons min ~44px |

### Scroll depth on Dashboard

Порядок блоков создаёт длинный scroll на mobile:
1. Header + Attention (~1 screen)
2. FinancialPulse (~1 screen)
3. AccountCards (~1 screen)
4. Quick entry + Categories (~2 screens)
5. Recent + Year

**Potential improvement:** collapse FinancialPulse on mobile, hide ok-state AttentionBlock.

---

## Иконки

- **Lucide React** — UI icons
- **AccountIcon** — maps account.icon string → Lucide
- **CategoryIcon** — maps category.id → predefined icon/color
- **IconPicker** — settings editor grid

---

## Charts (Analytics)

Recharts with CSS variable colors:
```javascript
CHART_COLORS = ['var(--app-primary)', 'var(--app-secondary)', ...]
```

ResponsiveContainer — full width cards.

---

## Auth screens

`AuthLayout`:
- Centered card on themed background
- Logo + tagline
- Form fields with validation messages
- Link login ↔ register

---

## Onboarding overlay

Full-screen portal (`createPortal` → document.body):
- Step indicator
- Back/Next navigation
- Cannot dismiss accidentally (no X on welcome)
- Completes → markOnboardingCompleted in localStorage

---

## Accessibility (current state)

| Area | Status |
|------|--------|
| Semantic HTML | Partial (buttons for accordion ok) |
| aria-labels | Minimal |
| Keyboard nav in table | Partial |
| Color contrast (cozy) | ⚠️ Issues on background |
| Color contrast (dark) | ✅ Good |
| Screen reader testing | ❌ Not done |

---

## Tone of voice (RU copy)

- Дружелюбный, неформальный: «за пару секунд», «Всё в порядке»
- Финансовые термины простые: «дельта», «расходы», «доступно»
- Ошибки прямые: «Не удалось подключиться к API»
