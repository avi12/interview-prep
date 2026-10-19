SELECT agent, COUNT(*) AS tickets
FROM support_tickets
GROUP BY agent
ORDER BY agent;
