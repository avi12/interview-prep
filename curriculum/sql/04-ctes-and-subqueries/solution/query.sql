WITH customer_totals AS (
  SELECT customer, SUM(amount) AS total
  FROM payments
  GROUP BY customer
),
average_total AS (
  SELECT AVG(total) AS average
  FROM customer_totals
)
SELECT customer_totals.customer, customer_totals.total
FROM customer_totals
CROSS JOIN average_total
WHERE customer_totals.total > average_total.average
ORDER BY customer_totals.total DESC, customer_totals.customer;
