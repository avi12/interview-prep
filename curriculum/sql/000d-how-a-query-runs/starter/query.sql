SELECT
  name,
  salary * 12 AS yearly_salary
FROM employees
WHERE yearly_salary > 90000
ORDER BY yearly_salary DESC, name;
