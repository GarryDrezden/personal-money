#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
LIMIT = 380_000
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()
months = c.execute("SELECT id, year_month FROM budget_months ORDER BY sort_order").fetchall()
running = 380_000.0


def amt(r):
    return abs(r["expense_amount"] or 0) or abs(r["income_amount"] or 0)


def pay(r):
    if r["payment_status"] == "ignored":
        return False
    if r["target_account_id"] == "credit_card" and r["operation_kind"] in (
        "transfer",
        "credit_card_payment",
    ):
        return True
    if (
        r["account_id"] == "credit_card"
        and r["operation_kind"] == "regular"
        and (r["expense_amount"] or 0) > 0
        and r["category_id"] in ("transfer", "credit_card_payment")
    ):
        return True
    return False


def pay_extended(r):
    """Also regular with target=credit_card (legacy import rows)."""
    if pay(r):
        return True
    return (
        r["target_account_id"] == "credit_card"
        and r["operation_kind"] == "regular"
        and (r["expense_amount"] or 0) > 0
    )


ignored_pay = []

for m in months:
    dc = 0
    for tx in c.execute(
        """
        SELECT * FROM transactions WHERE month_id=? AND payment_status!='ignored'
          AND (account_id='credit_card' OR target_account_id='credit_card')
        ORDER BY sort_order
        """,
        (m["id"],),
    ):
        if pay(tx):
            dc -= amt(tx)
        elif pay_extended(tx) and not pay(tx):
            ignored_pay.append((m["year_month"], amt(tx), tx["expense_name"], tx["operation_kind"]))
        elif tx["account_id"] == "credit_card" and tx["operation_kind"] == "correction":
            if tx["income_amount"]:
                dc -= tx["income_amount"]
            elif tx["expense_amount"]:
                dc += tx["expense_amount"]
        elif (
            tx["account_id"] == "credit_card"
            and tx["operation_kind"] == "regular"
            and (tx["expense_amount"] or 0) > 0
        ):
            dc += tx["expense_amount"]
    running -= dc
    print(f"{m['year_month']}: debt={LIMIT - running:.0f}")

print(f"\nFINAL debt (current logic): {LIMIT - running:.0f}")
print(f"\nLegacy payments NOT counted ({len(ignored_pay)} txs):")
total_ignored = 0
for row in ignored_pay:
    total_ignored += row[1]
    print(row)
print(f"total ignored payments: {total_ignored:.0f}")

# with extended
running = 380_000.0
for m in months:
    dc = 0
    for tx in c.execute(
        """
        SELECT * FROM transactions WHERE month_id=? AND payment_status!='ignored'
          AND (account_id='credit_card' OR target_account_id='credit_card')
        ORDER BY sort_order
        """,
        (m["id"],),
    ):
        if pay_extended(tx):
            dc -= amt(tx)
        elif tx["account_id"] == "credit_card" and tx["operation_kind"] == "correction":
            if tx["income_amount"]:
                dc -= tx["income_amount"]
            elif tx["expense_amount"]:
                dc += tx["expense_amount"]
        elif (
            tx["account_id"] == "credit_card"
            and tx["operation_kind"] == "regular"
            and (tx["expense_amount"] or 0) > 0
        ):
            dc += tx["expense_amount"]
    running -= dc
print(f"\nFINAL with legacy regular->credit payments: {LIMIT - running:.0f}")
