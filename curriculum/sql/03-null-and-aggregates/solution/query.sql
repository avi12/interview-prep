SELECT
  agent,
  COUNT(*) AS tickets,
  COUNT(rating) AS rated,
  ROUND(AVG(rating), 1) AS avg_rating,
  COALESCE(SUM(minutes_to_resolve), 0) AS total_minutes
FROM support_tickets
WHERE status = 'closed'
  AND escalated_to IS DISTINCT FROM 'legal'
GROUP BY agent
HAVING COUNT(*) >= 2
ORDER BY agent;
