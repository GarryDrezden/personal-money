#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

mid = c.execute(
    "SELECT id FROM budget_months WHERE year_month='2026-06'"
).fetchone()["id"]

print("=== JUNE all txs touching credit or named credit ===")
for tx in c.execute(
    """
    SELECT tx_date, expense_name, income_source, expense_amount, income_amount,
           account_id, target_account_id, operation_kind, category_id
    FROM transactions WHERE month_id=? AND payment_status!='ignored'
      AND (
        account_id='credit_card' OR target_account_id='credit_card'
        OR expense_name LIKE '%кредит%' OR expense_name LIKE '%Кредит%'
        OR income_source LIKE '%кредит%' OR income_source LIKE '%Кредит%'
      )
    ORDER BY sort_order
    """,
    (mid,),
):
    print(
        tx["tx_date"],
        tx["operation_kind"],
        (tx["expense_name"] or tx["income_source"] or "")[:40],
        tx["expense_amount"],
        tx["income_amount"],
        "from", tx["account_id"],
        "to", tx["target_account_id"],
        tx["category_id"],
    )

print("\n=== Transfers >= 5000 (any account) in June ===")
for tx in c.execute(
    """
    SELECT tx_date, expense_name, expense_amount, account_id, target_account_id, operation_kind
    FROM transactions WHERE month_id=? AND payment_status!='ignored'
      AND operation_kind IN ('transfer','credit_card_payment')
      AND expense_amount >= 5000
    ORDER BY expense_amount DESC
    """,
    (mid,),
):
    print(dict(tx))

print("\n=== May credit txs ===")
mid5 = c.execute("SELECT id FROM budget_months WHERE year_month='2026-05'").fetchone()["id"]
spend5 = pay5 = 0
for tx in c.execute(
    """
    SELECT * FROM transactions WHERE month_id=? AND payment_status!='ignored'
      AND (account_id='credit_card' OR target_account_id='credit_card')
    ORDER BY sort_order
    """,
    (mid5,),
):
    ea = tx["expense_amount"] or 0
    if tx["target_account_id"] == "credit_card" and tx["operation_kind"] in ("transfer", "credit_card_payment"):
        pay5 += ea
        print("PAY", ea, tx["expense_name"], tx["tx_date"])
    elif tx["account_id"] == "credit_card" and tx["operation_kind"] == "regular" and ea > 0:
        spend5 += ea
        print("SPEND", ea, tx["expense_name"], tx["tx_date"])
print(f"May spend={spend5} pay={pay5}")

print("\n=== Sum June credit spend by category ===")
for row in c.execute(
    """
    SELECT category_id, SUM(expense_amount) s, COUNT(*) n
    FROM transactions WHERE month_id=? AND account_id='credit_card'
      AND operation_kind='regular' AND payment_status!='ignored'
    GROUP BY category_id ORDER BY s DESC
    """,
    (mid,),
):
    print(dict(row))
