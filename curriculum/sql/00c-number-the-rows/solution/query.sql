WITH numbered AS (
  SELECT
    department,
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, name) AS place
  FROM employees
)
SELECT department, name, salary
FROM numbered
WHERE place = 1
ORDER BY department;
