SELECT user_id, MIN(logged_in_at)::date AS streak_start, MAX(logged_in_at)::date AS streak_end, COUNT(*) AS days
FROM logins
GROUP BY user_id
ORDER BY user_id;
