#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "personal-budget.sqlite"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

for tx in c.execute(
    """
    SELECT id, tx_date, expense_name, income_source, expense_amount, income_amount,
           operation_kind, category_id, account_id, target_account_id
    FROM transactions
    WHERE account_id='credit_card' AND income_amount IS NOT NULL
    """
):
    print(dict(tx))

for tx in c.execute(
    """
    SELECT id, tx_date, expense_name, expense_amount, operation_kind, account_id, target_account_id
    FROM transactions
    WHERE target_account_id='credit_card' OR (expense_name LIKE '%упибилет%' OR expense_name LIKE '%Купибилет%')
    """
):
    print("PAY", dict(tx))
