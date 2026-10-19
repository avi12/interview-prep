---
title: Schema design and constraints
lang: sql
minutes: 30
level: junior
roles: [backend, analyst]
files: [schema.sql]
sources:
  - https://www.postgresql.org/docs/current/ddl-constraints.html
  - https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description
---

## One big table lies

A spreadsheet-style table repeats facts on every row:

| student_name | student_email | course_title | course_credits | grade |
|---|---|---|---|---|
| Dana | dana@example.com | Databases | 4 | 90 |
| Dana | dana@example.com | Networks | 3 | 85 |
| Omer | omer@example.com | Databases | 4 | 70 |

Three bugs are waiting:

- **Update:** change Dana's email in one row, miss the other. Now there are two truths
- **Insert:** you cannot add a new course until someone enrolls
- **Delete:** remove Dana's only Networks row and the fact that Networks exists, with its 3 credits, is gone

```narrate
Here is a table that looks fine. Dana's email appears twice, and the credits of Databases appear twice. That causes three bugs. Change one copy and you get two truths. You cannot add a course nobody has taken. And deleting the last enrollment erases the course itself.
```

## Normal forms in three sentences

**Normalization** means storing each fact once. Three rules cover most real work:

1. **First normal form:** one value per cell, no repeating columns like `class1`, `class2`
2. **Second normal form:** every column depends on the **whole** key. Credits depend on the course, not on the pair student plus course
3. **Third normal form:** every column depends on the key and **nothing else**. An advisor's room depends on the advisor, not on the student

A memory line: the key, the whole key, and nothing but the key.

```svg The flat table splits into one table per kind of thing, plus a junction that links them
<svg viewBox="0 0 520 220" role="img" aria-label="Flat table split into students, courses and enrollments">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="flat">
      <rect x="20" y="60" width="130" height="96" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="82" fill="var(--fg)">registrations</text>
      <text x="30" y="104" fill="var(--fg-muted)">student_name</text>
      <text x="30" y="122" fill="var(--fg-muted)">student_email</text>
      <text x="30" y="140" fill="var(--fg-muted)">course_title ...</text>
    </g>
    <g data-cue="split">
      <path d="M150 90 L220 50 M150 108 L220 140" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="220" y="20" width="130" height="58" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="230" y="42" fill="var(--fg)">students</text>
      <text x="230" y="62" fill="var(--fg-muted)">id name email</text>
      <rect x="220" y="140" width="130" height="58" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="230" y="162" fill="var(--fg)">courses</text>
      <text x="230" y="182" fill="var(--fg-muted)">id title credits</text>
    </g>
    <g data-cue="junction">
      <path d="M350 49 L400 90 M350 169 L400 130" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="380" y="82" width="130" height="58" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="104" fill="var(--fg)">enrollments</text>
      <text x="390" y="124" fill="var(--fg-muted)">student course grade</text>
    </g>
  </g>
</svg>
```

```narrate
The fix is one table per kind of thing. [[flat]] We start from the flat registrations table. [[split]] Students go in their own table, and courses go in theirs, each fact stored once. [[junction]] A third table, enrollments, links one student to one course and holds what belongs to the pair, the grade.
```

## Keys

- **Primary key:** the column that identifies a row. Unique and never `NULL`. One per table
- **Foreign key:** a column that must match a row in another table. This is **referential integrity**: no enrollment for a student who does not exist

Let the database hand out ids: `id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.

A foreign key also decides what a delete does:

- `ON DELETE CASCADE`: delete the children too
- `ON DELETE RESTRICT`: refuse while children exist

> **Why:** pick the action from the meaning. Deleting a student should remove their enrollments. Deleting a course people still attend should be refused.

```narrate
A primary key identifies a row. A foreign key says this value must exist in another table. Together they stop orphans, like an enrollment for a student who was never created. A foreign key also chooses what a delete does. Cascade deletes the children. Restrict refuses while children exist. Choose by meaning.
```

## Constraints: let the database say no

| Constraint | Blocks | Example |
|---|---|---|
| `NOT NULL` | a missing value | every student has a name |
| `UNIQUE` | a duplicate | two students with one email |
| `CHECK` | a value outside a rule | credits of 0 or 11 |
| `PRIMARY KEY` | a duplicate or missing id | the same pair enrolled twice |
| `FOREIGN KEY` | a link to nothing | a grade for a course that is not there |

> **Why:** your app is not the only writer. Scripts, other services and people in a SQL console all skip your validation. A constraint guards the data for **every** writer, and checks without races.

> **Not this:** validate only in app code. Two requests can both pass a "does this email exist?" check, then both insert.

> **Trap:** `CHECK` passes when the value is `NULL`, and `UNIQUE` allows many `NULL`s. Add `NOT NULL` when the value is required.

```narrate
Constraints let the database refuse bad data. Not null blocks missing values. Unique blocks duplicates. Check enforces a rule. Your app is not the only writer, so only the database can guard every path. And remember, a check passes on null, so add not null when the value is required.
```

```quiz
q: A column has CHECK (credits BETWEEN 1 AND 10) and no NOT NULL. Can you insert a row with credits NULL?
options:
  - No, the check fails
  - Yes, a CHECK passes when the value is NULL
  - Only if the table has a primary key
answer: 1
why: A check is satisfied when its expression is true or NULL. Add NOT NULL to forbid missing values.
```

## Many-to-many needs a junction table

A student takes many courses. A course has many students. You cannot hold that in one column of either table.

Add a **junction table** with one row per pair. Its primary key is the **pair**, so the same pair cannot appear twice. Facts about the pair, like `grade`, live here.

```svg A junction table turns one many-to-many link into two one-to-many links
<svg viewBox="0 0 520 190" role="img" aria-label="Students and courses linked through enrollments">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="students">
      <rect x="20" y="30" width="130" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="56" fill="var(--fg)">students</text>
      <text x="30" y="76" fill="var(--fg-muted)">id (PK)</text>
    </g>
    <g data-cue="pair">
      <path d="M150 60 L200 60" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M330 60 L380 60" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="200" y="20" width="130" height="100" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="44" fill="var(--fg)">enrollments</text>
      <text x="210" y="68" fill="var(--fg-muted)">student_id (FK)</text>
      <text x="210" y="88" fill="var(--fg-muted)">course_id (FK)</text>
      <text x="210" y="108" fill="var(--fg-muted)">grade</text>
    </g>
    <g data-cue="courses">
      <rect x="380" y="30" width="130" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="56" fill="var(--fg)">courses</text>
      <text x="390" y="76" fill="var(--fg-muted)">id (PK)</text>
    </g>
    <text x="20" y="160" fill="var(--fg)">PRIMARY KEY (student_id, course_id)</text>
  </g>
</svg>
```

```narrate
Students on the left, courses on the right, and in the middle the junction table. [[students]] Each student has one id. [[courses]] Each course has one id. [[pair]] Each enrollment row holds one student id and one course id, and the pair is the primary key. So the same student cannot join the same course twice, and the grade lives on the pair.
```

> **Not this:** a column holding `'1,4,7'` or an array of course ids. You cannot enforce a foreign key on it, and joining it is painful.

```quiz
q: Where should a student's grade in one course be stored?
options:
  - In students
  - In courses
  - In the junction table, on the (student, course) row
answer: 2
why: A grade belongs to the pair. Only the junction row identifies exactly one student in exactly one course.
```

## Your turn

`schema.sql` starts with the flat `registrations` table. Replace it with three tables. The tests run your file, then try `INSERT` and `DELETE` statements and expect the database to refuse the bad ones.

- `students(id, name, email)`: name and email required, email unique
- `courses(id, title, credits)`: title required, credits required and from 1 to 10
- `enrollments(student_id, course_id, grade)`: both ids point to real rows, one row per pair, grade from 0 to 100 or `NULL` while ungraded
- `id` columns are generated by the database
- Deleting a student deletes their enrollments. Deleting a course that has enrollments is refused

```hint
Start with students and courses, each with id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY.
```

```hint
CHECK (credits BETWEEN 1 AND 10) and NOT NULL go on the same column. The grade needs a CHECK but no NOT NULL.
```

```hint
enrollments needs PRIMARY KEY (student_id, course_id) and two REFERENCES clauses. Add ON DELETE CASCADE on the student side and ON DELETE RESTRICT on the course side.
```
