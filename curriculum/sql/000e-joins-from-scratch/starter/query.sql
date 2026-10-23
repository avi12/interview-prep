SELECT
  e.name AS employee,
  d.name AS department
FROM employees e
INNER JOIN departments d ON d.id = e.department_id
ORDER BY e.id;
