SELECT customers.id, customers.name
FROM customers
WHERE NOT EXISTS (
  SELECT 1
  FROM orders
  WHERE orders.customer_id = customers.id
    AND orders.status = 'paid'
)
ORDER BY customers.id;
