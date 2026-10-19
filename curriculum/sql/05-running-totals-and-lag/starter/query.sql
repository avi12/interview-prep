SELECT id, paid_on, amount, SUM(amount) OVER (ORDER BY paid_on) AS running_total
FROM payments
ORDER BY paid_on, id;
