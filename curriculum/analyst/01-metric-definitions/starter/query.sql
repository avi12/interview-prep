SELECT channel, COUNT(*) AS visitor_count
FROM visitors
GROUP BY channel
ORDER BY channel;
