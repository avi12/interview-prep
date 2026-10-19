WITH step_counts AS (
  SELECT
    funnel_steps.position,
    funnel_steps.name AS step,
    COUNT(DISTINCT funnel_events.user_id) AS users
  FROM funnel_steps
  LEFT JOIN funnel_events ON funnel_events.step = funnel_steps.name
  GROUP BY funnel_steps.position, funnel_steps.name
)
SELECT
  step,
  users,
  ROUND(100.0 * users / NULLIF(LAG(users) OVER (ORDER BY position), 0), 1) AS pct_of_previous
FROM step_counts
ORDER BY position;
