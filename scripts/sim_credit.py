#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
LIMIT = 380_000
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()
running = 380_000.0
months = c.execute("SELECT id, year_month FROM budget_months ORDER BY sort_order").fetchall()


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


def refund(r):
    return (
        r["account_id"] == "credit_card"
        and r["operation_kind"] == "regular"
        and (r["income_amount"] or 0) > 0
        and not (r["expense_amount"] or 0)
    )


def simulate(count_refunds: bool):
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
            if pay(tx):
                dc -= amt(tx)
            elif count_refunds and refund(tx):
                dc -= tx["income_amount"]
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
    return LIMIT - running


print("without refunds:", simulate(False))
print("with refunds:", simulate(True))
print("target:", 36132)

# exclude Kupibilet payment
running = 380_000.0
for m in months:
    dc = 0
    for tx in c.execute(
        """
        SELECT * FROM transactions WHERE month_id=? AND payment_status!='ignored'
          AND (account_id='credit_card' OR target_account_id='credit_card')
          AND NOT (expense_name='Купибилет' AND operation_kind='credit_card_payment')
        ORDER BY sort_order
        """,
        (m["id"],),
    ):
        if pay(tx):
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
print("without kupibilet payment:", LIMIT - running)
