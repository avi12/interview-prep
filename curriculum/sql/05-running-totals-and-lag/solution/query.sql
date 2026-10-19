SELECT
  id,
  paid_on,
  amount,
  SUM(amount) OVER (ledger ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
  amount - LAG(amount) OVER ledger AS change
FROM payments
WINDOW ledger AS (ORDER BY paid_on, id)
ORDER BY paid_on, id;
