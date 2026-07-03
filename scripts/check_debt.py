#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
LIMIT = 380_000
TARGET = 24_132
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

CREDIT_PAYMENT_CATS = {"transfer", "credit_card_payment"}


def is_internal_transfer(row):
    if row["payment_status"] == "ignored":
        return False
    kind = row["operation_kind"]
    if kind in ("transfer", "credit_card_payment"):
        return True
    if row["category_id"] in CREDIT_PAYMENT_CATS:
        return True
    if row["target_account_id"] and (row["expense_amount"] or 0) > 0:
        return True
    return False


def is_payment(row, cid="credit_card"):
    if row["payment_status"] == "ignored":
        return False
    amt = abs(row["expense_amount"] or 0) or abs(row["income_amount"] or 0)
    if amt <= 0:
        return False
    if row["target_account_id"] == cid and row["operation_kind"] in ("transfer", "credit_card_payment"):
        return True
    if (
        row["account_id"] == cid
        and row["operation_kind"] == "regular"
        and (row["expense_amount"] or 0) > 0
        and row["category_id"] in CREDIT_PAYMENT_CATS
    ):
        return True
    return False


def is_refund(row, cid="credit_card"):
    if row["payment_status"] == "ignored":
        return False
    return (
        row["account_id"] == cid
        and row["operation_kind"] == "regular"
        and (row["income_amount"] or 0) > 0
        and not (row["expense_amount"] or 0)
    )


def is_spending(row, cid="credit_card"):
    if is_payment(row, cid):
        return False
    if is_refund(row, cid):
        return False
    return (
        row["account_id"] == cid
        and row["operation_kind"] == "regular"
        and (row["expense_amount"] or 0) > 0
    )


months = c.execute("SELECT id, year_month FROM budget_months ORDER BY sort_order").fetchall()
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
        amt = abs(tx["expense_amount"] or 0) or abs(tx["income_amount"] or 0)
        if is_payment(tx):
            dc -= amt
            print(f"  PAY -{amt:.0f} {tx['expense_name']} {tx['operation_kind']} {tx['tx_date']}")
        elif tx["account_id"] == "credit_card" and tx["operation_kind"] == "correction":
            if tx["income_amount"]:
                dc -= tx["income_amount"]
            elif tx["expense_amount"]:
                dc += tx["expense_amount"]
        elif is_spending(tx):
            dc += tx["expense_amount"]
        elif is_refund(tx):
            dc -= tx["income_amount"]
            print(f"  REF -{tx['income_amount']:.0f} {tx['income_source'] or tx['expense_name']} {tx['tx_date']}")
    running -= dc
    debt = LIMIT - running
    if m["year_month"] == "2026-06":
        print(f"{m['year_month']}: debt={debt:.0f}")

print(f"\nFINAL debt={LIMIT - running:.0f} target={TARGET} gap={LIMIT - running - TARGET:.0f}")

print("\n--- 12000 txs ---")
for tx in c.execute(
    """
    SELECT tx_date, expense_name, income_source, expense_amount, income_amount,
           account_id, target_account_id, operation_kind, category_id
    FROM transactions
    WHERE (expense_amount BETWEEN 11900 AND 12100 OR income_amount BETWEEN 11900 AND 12100)
      AND (account_id='credit_card' OR target_account_id='credit_card'
           OR expense_name LIKE '%редит%' OR income_source LIKE '%редит%')
    ORDER BY tx_date
    """
):
    print(dict(tx), "payment?", is_payment(tx), "internal?", is_internal_transfer(tx))
