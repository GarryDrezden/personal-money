#!/usr/bin/env python3
"""Диагностика долга по кредитке."""
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
LIMIT = 380_000
TARGET_DEBT = 36_132

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

acc = dict(c.execute("SELECT * FROM accounts WHERE id='credit_card'").fetchone())
months = c.execute("SELECT id, year_month FROM budget_months ORDER BY sort_order").fetchall()
running = float(acc["initial_balance"])


def tx_amount(row):
    return abs(row["expense_amount"] or 0) or abs(row["income_amount"] or 0)


def is_credit_payment(row, credit_id="credit_card"):
    if row["payment_status"] == "ignored":
        return False
    if tx_amount(row) <= 0:
        return False
    if row["target_account_id"] == credit_id and row["operation_kind"] in (
        "transfer",
        "credit_card_payment",
    ):
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


def process_tx(tx, debt_change):
    label = tx["expense_name"] or tx["income_source"] or ""
    if is_credit_payment(tx):
        amt = tx_amount(tx)
        debt_change -= amt
        return debt_change, f"PAY -{amt:.0f} {label} ({tx['operation_kind']})"
    if tx["account_id"] == "credit_card" and tx["operation_kind"] == "correction":
        if (tx["income_amount"] or 0) > 0:
            debt_change -= tx["income_amount"]
            return debt_change, f"CORR- -{tx['income_amount']:.0f} {label}"
        if (tx["expense_amount"] or 0) > 0:
            debt_change += tx["expense_amount"]
            return debt_change, f"CORR+ +{tx['expense_amount']:.0f} {label}"
    if is_credit_spending(tx):
        debt_change += tx["expense_amount"]
        return debt_change, f"SPEND +{tx['expense_amount']:.0f} {label} cat={tx['category_id']}"
    if tx["target_account_id"] == "credit_card" or tx["account_id"] == "credit_card":
        return debt_change, f"SKIP {label} kind={tx['operation_kind']} from={tx['account_id']} to={tx['target_account_id']}"
    return debt_change, None


total_spend = 0
total_pay = 0
total_corr = 0

for m in months:
    dc = 0
    txs = c.execute(
        """
        SELECT * FROM transactions WHERE month_id=? AND payment_status!='ignored'
          AND (account_id='credit_card' OR target_account_id='credit_card')
        ORDER BY sort_order
        """,
        (m["id"],),
    ).fetchall()
    for tx in txs:
        before = dc
        dc, note = process_tx(tx, dc)
        if note and note.startswith("SPEND"):
            total_spend += tx["expense_amount"] or 0
        elif note and note.startswith("PAY"):
            total_pay += tx_amount(tx)
        elif note and note.startswith("CORR"):
            if (tx["expense_amount"] or 0) > 0:
                total_corr += tx["expense_amount"]
            else:
                total_corr -= tx["income_amount"] or 0
    running -= dc
    debt = LIMIT - running
    print(f"{m['year_month']}: debt={debt:.0f} (month dc={dc:.0f})")

print(f"\nFINAL: avail={running:.0f} debt={debt:.0f}")
print(f"TARGET debt={TARGET_DEBT}, gap={debt - TARGET_DEBT:.0f} (app shows MORE debt)")
print(f"totals: spend={total_spend:.0f} pay={total_pay:.0f} net_corr={total_corr:.0f}")

print("\n--- Payments to credit ---")
for tx in c.execute(
    """
    SELECT tx_date, expense_name, expense_amount, account_id, target_account_id, operation_kind, category_id, payment_status
    FROM transactions WHERE payment_status!='ignored'
      AND (target_account_id='credit_card' OR (account_id='credit_card' AND category_id IN ('transfer','credit_card_payment')))
    ORDER BY tx_date, sort_order
    """
):
    if is_credit_payment(tx):
        print(dict(tx), "amt", tx_amount(tx))

print("\n--- Possible missed payments (на кредитк in name, not to credit) ---")
for tx in c.execute(
    """
    SELECT tx_date, expense_name, expense_amount, account_id, target_account_id, operation_kind, category_id
    FROM transactions WHERE payment_status!='ignored'
      AND expense_name LIKE '%кредитк%'
      AND target_account_id IS NOT 'credit_card'
    ORDER BY tx_date
    """
):
    print(dict(tx))

print("\n--- Corrections on credit ---")
for tx in c.execute(
    """
    SELECT tx_date, expense_name, income_source, expense_amount, income_amount, note
    FROM transactions WHERE account_id='credit_card' AND operation_kind='correction'
    ORDER BY tx_date
    """
):
    print(dict(tx))

print("\n--- Large spending on credit (>3000) ---")
for tx in c.execute(
    """
    SELECT tx_date, expense_name, expense_amount, category_id, operation_kind
    FROM transactions WHERE account_id='credit_card' AND operation_kind='regular'
      AND expense_amount > 3000 AND payment_status!='ignored'
    ORDER BY expense_amount DESC
    """
):
    print(dict(tx))
