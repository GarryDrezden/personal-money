#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
LIMIT = 380_000
TARGET_AVAIL = 355_806
TARGET_DEBT = 24_193

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

acc = dict(c.execute("SELECT * FROM accounts WHERE id='credit_card'").fetchone())
print("credit_card account:", {k: acc[k] for k in ("initial_balance", "credit_limit")})

months = c.execute("SELECT id, year_month FROM budget_months ORDER BY sort_order").fetchall()
mid = months[-1]["id"]
ym = months[-1]["year_month"]
print(f"last month: {ym} ({mid})")

# Simulate TS credit logic
running = float(acc["initial_balance"])


def tx_amount(row):
    ea = row["expense_amount"] or 0
    ia = row["income_amount"] or 0
    return abs(ea) or abs(ia)


def is_credit_payment(row, credit_id="credit_card"):
    if row["payment_status"] == "ignored":
        return False
    amt = tx_amount(row)
    if amt <= 0:
        return False
    if row["target_account_id"] == credit_id and row["operation_kind"] in ("transfer", "credit_card_payment"):
        return True
    if (
        row["account_id"] == credit_id
        and row["operation_kind"] == "regular"
        and (row["expense_amount"] or 0) > 0
        and row["category_id"] in ("transfer", "credit_card_payment")
    ):
        return True
    return False


def is_credit_spending(row, credit_id="credit_card"):
    if row["payment_status"] == "ignored":
        return False
    if is_credit_payment(row, credit_id):
        return False
    return (
        row["account_id"] == credit_id
        and row["operation_kind"] == "regular"
        and (row["expense_amount"] or 0) > 0
    )


for m in months:
    mid_i = m["id"]
    txs = c.execute(
        """SELECT * FROM transactions WHERE month_id=? AND payment_status!='ignored'
           AND (account_id='credit_card' OR target_account_id='credit_card')
           ORDER BY sort_order""",
        (mid_i,),
    ).fetchall()
    debt_change = 0
    for tx in txs:
        if is_credit_payment(tx):
            debt_change -= tx_amount(tx)
        elif tx["account_id"] == "credit_card" and tx["operation_kind"] == "correction":
            if (tx["income_amount"] or 0) > 0:
                debt_change -= tx["income_amount"]
            elif (tx["expense_amount"] or 0) > 0:
                debt_change += tx["expense_amount"]
        elif is_credit_spending(tx):
            debt_change += tx["expense_amount"] or 0
    running -= debt_change

closing_avail = running
closing_balance = closing_avail - LIMIT
print(f"after {m['year_month']}: avail={closing_avail:.0f} debt={-closing_balance:.0f} balance={closing_balance:.0f}")

print(f"\ntarget: avail={TARGET_AVAIL} debt={TARGET_DEBT}")
print(f"gap: avail {TARGET_AVAIL - closing_avail:.0f}, debt {TARGET_DEBT - (-closing_balance):.0f}")

print("\nlast month credit txs:")
for tx in txs:
    print(
        tx["tx_date"],
        tx["operation_kind"],
        tx["expense_name"] or tx["income_source"],
        tx["expense_amount"],
        tx["income_amount"],
        "from", tx["account_id"],
        "to", tx["target_account_id"],
        tx["category_id"],
    )
