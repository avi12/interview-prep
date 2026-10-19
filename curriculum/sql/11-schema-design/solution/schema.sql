CREATE TABLE students (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE
);

CREATE TABLE courses (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  credits int NOT NULL CHECK (credits BETWEEN 1 AND 10)
);

CREATE TABLE enrollments (
  student_id int NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  course_id int NOT NULL REFERENCES courses (id) ON DELETE RESTRICT,
  grade int CHECK (grade BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
