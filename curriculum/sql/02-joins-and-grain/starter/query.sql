SELECT customers.name, SUM(orders.total) AS revenue, SUM(order_items.quantity) AS units
FROM customers
JOIN orders ON orders.customer_id = customers.id
JOIN order_items ON order_items.order_id = orders.id
GROUP BY customers.id, customers.name
ORDER BY revenue DESC, customers.name;
