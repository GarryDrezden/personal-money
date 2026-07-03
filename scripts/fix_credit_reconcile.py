#!/usr/bin/env python3
"""Исправить «Сверку кредитки» и выставить доступно 355806 / долг ~24193."""
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
TARGET_AVAIL = 355_806
LIMIT = 380_000

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Удалить неверную сверку +5027 к долгу
deleted = c.execute(
    """
    DELETE FROM transactions
    WHERE operation_kind = 'correction'
      AND account_id = 'credit_card'
      AND expense_name = 'Сверка кредитки'
      AND expense_amount = 5027
    """
).rowcount
print(f"deleted wrong corrections: {deleted}")

# Пересчёт после удаления
running = 380_000.0
months = c.execute("SELECT id FROM budget_months ORDER BY sort_order").fetchall()


def amt(row):
    return abs(row["expense_amount"] or 0) or abs(row["income_amount"] or 0)


def pay(row):
    if row["target_account_id"] == "credit_card" and row["operation_kind"] in (
        "transfer",
        "credit_card_payment",
    ):
        return True
    if (
        row["account_id"] == "credit_card"
        and row["operation_kind"] == "regular"
        and (row["expense_amount"] or 0) > 0
        and row["category_id"] in ("transfer", "credit_card_payment")
    ):
        return True
    return False


for m in months:
    dc = 0
    for tx in c.execute(
        """
        SELECT * FROM transactions
        WHERE month_id = ? AND payment_status != 'ignored'
          AND (account_id = 'credit_card' OR target_account_id = 'credit_card')
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

diff = TARGET_AVAIL - running
print(f"current avail: {running:.0f}, target: {TARGET_AVAIL}, correction expense: {-diff:.0f}")

if abs(diff) >= 1:
    mid = months[-1]["id"]
    max_so = c.execute(
        "SELECT COALESCE(MAX(sort_order), 0) FROM transactions WHERE month_id = ?",
        (mid,),
    ).fetchone()[0]
    import uuid

    tx_id = str(uuid.uuid4())
    if diff > 0:
        c.execute(
            """
            INSERT INTO transactions
            (id, month_id, sort_order, tx_date, income_source, income_amount,
             account_id, category_id, operation_kind, payment_status, note)
            VALUES (?, ?, ?, '2026-06-30', 'Сверка кредитки', ?, 'credit_card',
                    'correction', 'correction', 'done', 'сверка с банком')
            """,
            (tx_id, mid, max_so + 1, diff),
        )
    else:
        c.execute(
            """
            INSERT INTO transactions
            (id, month_id, sort_order, tx_date, expense_name, expense_amount,
             account_id, category_id, operation_kind, payment_status, note)
            VALUES (?, ?, ?, '2026-06-30', 'Сверка кредитки', ?, 'credit_card',
                    'correction', 'correction', 'done', 'сверка с банком')
            """,
            (tx_id, mid, max_so + 1, -diff),
        )
    print(f"added correction id={tx_id}")

conn.commit()

# verify
running = 380_000.0
for m in months:
    dc = 0
    for tx in c.execute(
        """
        SELECT * FROM transactions
        WHERE month_id = ? AND payment_status != 'ignored'
          AND (account_id = 'credit_card' OR target_account_id = 'credit_card')
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

debt = LIMIT - running
print(f"result: avail={running:.0f} debt={debt:.0f}")
