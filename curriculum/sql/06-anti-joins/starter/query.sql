SELECT id, name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE status = 'paid')
ORDER BY id;
