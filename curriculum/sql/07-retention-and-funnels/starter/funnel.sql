SELECT step, COUNT(*) AS users
FROM funnel_events
GROUP BY step;
