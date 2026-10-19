SELECT DATE_TRUNC('week', signed_up_at)::date AS cohort_week,
       COUNT(*) AS users
FROM users
GROUP BY 1
ORDER BY 1;
