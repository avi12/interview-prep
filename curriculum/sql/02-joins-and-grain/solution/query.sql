WITH units_per_order AS (
  SELECT order_id, SUM(quantity) AS units
  FROM order_items
  GROUP BY order_id
)
SELECT
  customers.name,
  COALESCE(SUM(orders.total), 0) AS revenue,
  COALESCE(SUM(units_per_order.units), 0) AS units
FROM customers
LEFT JOIN orders ON orders.customer_id = customers.id
LEFT JOIN units_per_order ON units_per_order.order_id = orders.id
GROUP BY customers.id, customers.name
ORDER BY revenue DESC, customers.name;
