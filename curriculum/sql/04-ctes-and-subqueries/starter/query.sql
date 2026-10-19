SELECT customer, SUM(amount) AS total
FROM payments
GROUP BY customer
HAVING SUM(amount) > (SELECT AVG(amount) FROM payments)
ORDER BY total DESC, customer;
