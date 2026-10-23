SELECT
  name,
  salary * 12 AS yearly_salary
FROM employees
WHERE salary * 12 > 90000
ORDER BY yearly_salary DESC, name;
