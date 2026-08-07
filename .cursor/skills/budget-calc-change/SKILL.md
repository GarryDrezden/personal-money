---
name: budget-calc-change
description: >-
  Change Personal Budget calculation or business rules safely. Use when editing
  balances, credit cards, categories, operations math, or related tests.
---

# Budget calculation change

## Steps

1. Read `docs/05-business-rules.md` (required).
2. Read `docs/11-testing-plan.md` and existing tests under `src/test/` if present.
3. Locate current logic in `src/` (utils/store) and/or `api/` — change both if the rule spans client and server.
4. Add or update Vitest coverage for the formula edge cases described in the testing plan.
5. If the product rule changed for users/devs, update `docs/05-business-rules.md` (and `docs/06-features-inventory.md` if a feature surface changed).

Do not invent new money semantics without documenting them in `05`.
