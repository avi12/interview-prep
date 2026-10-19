CREATE INDEX users_email_lower_idx ON users (lower(email));
CREATE INDEX orders_customer_created_idx ON orders (customer_id, created_at);
