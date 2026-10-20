SELECT
  name,
  department,
  salary,
  salary - ROUND(AVG(salary) OVER (PARTITION BY department)) AS gap
FROM employees
ORDER BY department, name;
