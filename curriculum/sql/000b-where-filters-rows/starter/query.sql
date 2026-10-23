SELECT name, department, salary
FROM employees
WHERE department = 'engineering' OR department = 'data' AND salary >= 6000
ORDER BY id;
