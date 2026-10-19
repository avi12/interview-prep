WITH ranked AS (
  SELECT
    department,
    name,
    salary,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
  FROM employees
)
SELECT department, name, salary
FROM ranked
WHERE salary_rank <= 2
ORDER BY department, salary DESC, name;
