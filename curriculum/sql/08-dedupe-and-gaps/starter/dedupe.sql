SELECT id, email, created_at,
       ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS copy_number
FROM contacts;
