---
title: SQL injection and parameters
lang: ts
minutes: 25
level: junior
roles: [backend, analyst]
files: [users.ts]
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
  - https://node-postgres.com/features/queries
  - https://www.postgresql.org/docs/current/protocol-flow.html
  - https://pglite.dev/docs/api
---

## How the attack works

This function glues the user's text into the query:

```ts
const sql = `SELECT id, username, role FROM users WHERE username = '${username}'`;
```

With `dana`, the query is fine. With `' OR '1'='1` as the "name", the text becomes:

```sql
SELECT id, username, role FROM users WHERE username = '' OR '1'='1'
```

`'1'='1'` is always true, so **every** user matches and the code returns the first one, probably the admin. The input stopped being **data** and became **code**.

```svg The quote in the input closes the string early, and the rest of the input is parsed as SQL
<svg viewBox="0 0 520 190" role="img" aria-label="Fixed query text with attacker input spliced in">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="fixed">
      <rect x="20" y="30" width="270" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="52" fill="var(--fg)">... WHERE username = '</text>
      <rect x="290" y="30" width="190" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="300" y="52" fill="var(--fg-muted)">user input goes here</text>
    </g>
    <g data-cue="input">
      <path d="M385 64 L385 96" stroke="var(--danger)" stroke-width="2"/>
      <rect x="290" y="96" width="190" height="34" fill="var(--danger)" stroke="var(--border)" stroke-width="2"/>
      <text x="300" y="118" fill="var(--fg)">' OR '1'='1</text>
    </g>
    <g data-cue="result">
      <text x="20" y="168" fill="var(--fg)">the quote ends the string, OR '1'='1' is now code</text>
    </g>
  </g>
</svg>
```

```narrate
Here is how it happens. [[fixed]] The query text has a fixed part, and a slot where the user's input is pasted in. [[input]] The attacker types a quote, then or one equals one. The quote closes the string early, and everything after it is read as SQL. [[result]] The condition is now always true, and the query returns every user.
```

> **Why:** this is a top interview security question, and the answer is short: never build SQL from strings. Send the values separately.

## The fix: parameters

Put a numbered placeholder `$1` in the text. Pass the value in a separate array.

```ts
db.query("SELECT id, username, role FROM users WHERE username = $1", [username]);
```

The database parses the **text** first and fixes its shape. The value arrives afterwards and is only ever data. The attack string is now just a strange username that nobody has.

It also fixes a normal bug: `O'Brien` no longer breaks the query.

```svg Query text and values travel separately, so a value can never change the shape of the query
<svg viewBox="0 0 520 200" role="img" aria-label="Two lanes: query text parsed first, values bound later">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="text">
      <rect x="20" y="30" width="250" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="52" fill="var(--fg)">... WHERE username = $1</text>
      <path d="M270 47 L330 47" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="330" y="30" width="170" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="52" fill="var(--fg)">parsed: fixed shape</text>
    </g>
    <g data-cue="values">
      <rect x="20" y="100" width="250" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="122" fill="var(--fg)">[ "' OR '1'='1" ]</text>
      <path d="M270 117 L330 117" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="330" y="100" width="170" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="122" fill="var(--fg)">plain value only</text>
    </g>
    <g data-cue="safe">
      <text x="20" y="176" fill="var(--ok)">no user with that exact name: 0 rows</text>
    </g>
  </g>
</svg>
```

```narrate
Two separate lanes. [[text]] The query text, with a placeholder, goes to the database first and is parsed into a fixed shape. [[values]] The value travels on its own lane, and is slotted in later as plain data. It is never read as SQL. [[safe]] So the attack string is just a name that nobody has, and the query returns no rows.
```

> **Not this:** strip or escape quotes by hand. It is easy to miss one case, and it breaks real names like `O'Brien`. Parameters need no cleaning at all.

## Identifiers cannot be parameters

A placeholder stands for a **value**. A column name, a table name or `ASC`/`DESC` is part of the query's shape, so `ORDER BY $1` does not work.

For these, use an **allow-list**: a fixed set of names you wrote. Check the input against it and refuse everything else.

```ts
const SORTABLE_COLUMNS = new Set(["id", "username", "role"]);

if (!SORTABLE_COLUMNS.has(sortBy)) throw new Error(`cannot sort by "${sortBy}"`);
```

Only after the check is the name put into the text. It now comes from your list, not from the user.

> **Not this:** a blocklist of bad words like `DROP`. Attackers find the word you forgot. The allow-list lists what is **good**.

> **Trap:** a plain object lookup like `columns[sortBy]` accepts `"constructor"`. Use a `Set` or `Object.hasOwn`.

```narrate
Placeholders only stand for values. A column name or a sort direction is part of the query shape, so it cannot be a parameter. For those, keep an allow list: a fixed set of names you wrote yourself. Check the input against it, and refuse anything else. A blocklist of bad words always misses one.
```

```quiz
q: A page lets users sort a table by a column they pick from a dropdown. How do you build the ORDER BY safely?
options:
  - Pass the column name as a $1 parameter
  - Remove quote characters from the column name
  - Accept it only if it is in a fixed allow-list of column names
answer: 2
why: Identifiers cannot be parameters, and cleaning input is fragile. A closed list of names you wrote leaves the attacker nothing to choose.
```

## What interviewers also want to hear

Parameters are the main defense, with a few more layers:

- **Least privilege:** the app's database user cannot `DROP` or read tables it does not need
- **Validate type and length:** an id must be an integer. This is extra, not a replacement
- **Quiet errors:** return a generic message, never the raw SQL error
- **ORMs and raw queries:** an ORM is safe until you paste a string into its raw-query method

```narrate
Parameters are the main defense, but say you also use layers. Give the app's database user the least privilege it needs. Validate types and lengths. Show users a generic error, never the raw sql message. And remember that an orm is only safe until you paste a string into its raw query escape hatch.
```

```quiz
q: Which one is safe against injection?
options:
  - Build the text with a template string, after removing quote characters from the input
  - Pass the input as a $1 parameter in a values array
  - Wrap the input in single quotes inside the query text
answer: 1
why: Only separate parameters keep the input out of the SQL text. The other two still put user input into the query string.
```

## Your turn

`users.ts` exports two vulnerable functions over `users(id, username, role, password_hash)`. Fix both.

- `findUser({ db, username })` returns the user (`id`, `username`, `role`) or `null`
- `listUsers({ db, sortBy })` returns all users sorted by `id`, `username` or `role`. Anything else must **throw**, even a real column like `password_hash`

The tests throw classic payloads at both: a login bypass, a comment trick, `UNION SELECT`, a stacked `DROP TABLE`, and the name `O'Brien`.

```hint
findUser: replace the template string with $1 and pass [username] as the second argument to db.query.
```

```hint
listUsers: a parameter cannot hold a column name. Make a Set of the three allowed names and throw when sortBy is not in it.
```

```hint
After the check, it is safe to put sortBy into the ORDER BY text, because it can only be one of your three words.
```
