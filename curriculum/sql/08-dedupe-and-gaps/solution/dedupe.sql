WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at DESC, id DESC) AS copy_number
  FROM contacts
)
DELETE FROM contacts
WHERE id IN (SELECT id FROM numbered WHERE copy_number > 1)
RETURNING id;
