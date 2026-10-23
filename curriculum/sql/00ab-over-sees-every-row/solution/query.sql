SELECT
  name,
  salary,
  SUM(salary) OVER () AS company_total,
  ROUND(salary * 100.0 / SUM(salary) OVER (), 1) AS percent_of_total
FROM employees
ORDER BY id;
