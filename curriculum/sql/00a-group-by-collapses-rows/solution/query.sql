SELECT
  department,
  COUNT(*) AS headcount,
  ROUND(AVG(salary)) AS average_salary
FROM employees
GROUP BY department
HAVING COUNT(*) >= 2
ORDER BY department;
