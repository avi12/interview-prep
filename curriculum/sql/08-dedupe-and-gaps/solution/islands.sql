WITH login_days AS (
  SELECT DISTINCT user_id, logged_in_at::date AS login_day
  FROM logins
),
numbered AS (
  SELECT
    user_id,
    login_day,
    login_day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_day))::int AS island_key
  FROM login_days
)
SELECT
  user_id,
  MIN(login_day) AS streak_start,
  MAX(login_day) AS streak_end,
  COUNT(*) AS days
FROM numbered
GROUP BY user_id, island_key
ORDER BY user_id, streak_start;
