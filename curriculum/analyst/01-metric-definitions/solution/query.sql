SELECT
  v.channel,
  COUNT(DISTINCT v.visitor_id) AS visitor_count,
  COUNT(DISTINCT o.visitor_id) AS buyer_count,
  ROUND(COUNT(DISTINCT o.visitor_id)::numeric / COUNT(DISTINCT v.visitor_id), 3) AS conversion_rate
FROM visitors AS v
LEFT JOIN orders AS o ON o.visitor_id = v.visitor_id
GROUP BY v.channel
ORDER BY v.channel;
