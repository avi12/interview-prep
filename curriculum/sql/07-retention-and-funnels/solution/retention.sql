WITH cohorts AS (
  SELECT id AS user_id, DATE_TRUNC('week', signed_up_at)::date AS cohort_week
  FROM users
)
SELECT
  cohorts.cohort_week,
  COUNT(DISTINCT cohorts.user_id) AS users,
  COUNT(DISTINCT events.user_id) AS retained_week_1,
  ROUND(100.0 * COUNT(DISTINCT events.user_id) / COUNT(DISTINCT cohorts.user_id), 1) AS retention_pct
FROM cohorts
LEFT JOIN events
  ON events.user_id = cohorts.user_id
 AND DATE_TRUNC('week', events.event_date)::date = cohorts.cohort_week + 7
GROUP BY cohorts.cohort_week
ORDER BY cohorts.cohort_week;
