---
title: Validate at the boundary
lang: ts
minutes: 20
level: junior
roles: [backend, ai]
files: [createUser.ts]
sources:
  - https://zod.dev/api
  - https://zod.dev/error-formatting
  - https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
  - https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
  - https://www.rfc-editor.org/rfc/rfc9110.html
---

## Every input is hostile until parsed

Anything that comes from outside your process is **untrusted**: the body, query string, headers, path params, even a message from another service.

The client can send a string where you expect a number, a missing field, or an extra `isAdmin: true`. Check it **once, at the edge**. After that, the rest of the code holds typed data it can trust.

> **Why:** OWASP says to validate on the server, at every trust boundary. Browser checks are only a courtesy for the user.

> **Not this:** `const user = req.body as CreateUser`. The `as` is erased when the code runs. It checks nothing, and the compiler now believes a lie.

```svg Untrusted input crosses one gate. Only parsed data goes inside, and the rest is rejected there
<svg viewBox="0 0 520 190" role="img" aria-label="Input passes a schema gate before reaching the handler">
  <g data-cue="outside" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="40" width="130" height="70" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="85" y="70" text-anchor="middle" fill="var(--fg)">outside</text>
    <text x="85" y="92" text-anchor="middle" fill="var(--fg-muted)">unknown</text>
  </g>
  <g data-cue="gate" font-family="var(--font-mono)" font-size="14">
    <path d="M150 75 L200 75" stroke="var(--fg)" stroke-width="2"/>
    <rect x="200" y="30" width="110" height="90" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="3"/>
    <text x="255" y="70" text-anchor="middle" fill="var(--fg)">schema</text>
    <text x="255" y="92" text-anchor="middle" fill="var(--fg)">safeParse</text>
    <path d="M255 120 L255 160" stroke="var(--danger)" stroke-width="2"/>
    <text x="268" y="158" fill="var(--danger)">reject: 422</text>
  </g>
  <g data-cue="inside" font-family="var(--font-mono)" font-size="14">
    <path d="M310 75 L360 75" stroke="var(--ok)" stroke-width="2"/>
    <rect x="360" y="40" width="140" height="70" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
    <text x="430" y="70" text-anchor="middle" fill="var(--fg)">inside</text>
    <text x="430" y="92" text-anchor="middle" fill="var(--fg-muted)">typed, trusted</text>
  </g>
</svg>
```

```narrate
Follow the data from the left. [[outside]] Everything out here is unknown, whatever the client felt like sending. [[gate]] It meets one gate, a schema. If the data breaks the rules, it is rejected right there. [[inside]] If it passes, the handler gets typed, trusted data and never has to check again.
```

## Parse, don't validate

A **validator** answers yes or no and forgets what it learned. A **parser** hands back a value of a more precise type. Zod parses:

```ts
const result = createUserSchema.safeParse(body);
if (!result.success) return unprocessable(result.error);
const user = result.data;
```

`result.data` is typed, trimmed, lowercased, and holds **only** the fields in the schema. Keep one source for the shape, and get the type from it with `z.infer`.

> **Why:** an unknown key is dropped, so `isAdmin: true` never reaches your database. That closes the mass-assignment hole by default.

> **Not this:** `if (typeof body.age === "number")` scattered through handlers. Checks get forgotten, and nothing records that they happened.

```narrate
There are two ways to check input. A validator says yes or no and throws away what it found out. A parser returns a new value with a better type. Zod is a parser. What comes back is typed, cleaned up, and contains only the fields you named, so a sneaky extra field never reaches your database.
```

```quiz
q: What does `req.body as CreateUser` do when the code runs?
options:
  - It checks the shape and throws on a mismatch
  - Nothing, it exists only for the compiler
  - It removes fields that are not in the type
answer: 1
why: Type assertions are erased at runtime. Only a parser such as a zod schema inspects the real value.
```

## 400 or 422?

Both are defended. RFC 9110: **400** is a request the server cannot process because of a client error, such as bad syntax. **422** means the syntax is right but the content cannot be processed.

Stripe answers 400 for everything invalid. FastAPI and Rails answer 422.

Our rule, easy to say in an interview:

- Cannot be read (not JSON, not an object): **400**
- Read fine, a field breaks a rule: **422**

> **Trap:** the status matters less than being **consistent**. Pick one rule, document it, and never mix them across endpoints.

```svg Two checks in order. Each failure has its own code
<svg viewBox="0 0 520 210" role="img" aria-label="Validation decision flow">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="shape">
      <rect x="20" y="20" width="200" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="120" y="48" text-anchor="middle" fill="var(--fg)">a JSON object?</text>
      <path d="M220 42 L300 42" stroke="var(--danger)" stroke-width="2"/>
      <text x="310" y="47" fill="var(--fg)">no: 400</text>
    </g>
    <g data-cue="fields">
      <path d="M120 64 L120 96" stroke="var(--fg)" stroke-width="2"/>
      <rect x="20" y="96" width="200" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="120" y="124" text-anchor="middle" fill="var(--fg)">fields follow rules?</text>
      <path d="M220 118 L300 118" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="310" y="123" fill="var(--fg)">no: 422</text>
    </g>
    <g data-cue="done">
      <path d="M120 140 L120 160" stroke="var(--fg)" stroke-width="2"/>
      <rect x="20" y="160" width="200" height="40" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="120" y="185" text-anchor="middle" fill="var(--fg)">yes: 201</text>
    </g>
  </g>
</svg>
```

```narrate
Two questions, in order. [[shape]] First, is the body a JSON object at all? If not, the server cannot read it, so answer four hundred. [[fields]] Second, do the fields follow the rules? If not, the request was understood but refused, so answer four twenty two. [[done]] If both pass, the user is created. Whichever rule you pick, apply it everywhere.
```

## Field-level errors

Tell the client **which fields** failed and **why**, all at once. One error per round trip is slow and annoying.

```ts
z.flattenError(result.error).fieldErrors
```

```json
{ "errors": { "email": ["email must be a valid address"], "age": ["Invalid input: expected number, received string"] } }
```

The keys let a form highlight the exact input. The messages are for humans. Only bad fields appear.

> **Why:** the client can fix everything in one go, and your error body stays small and predictable.

```narrate
When validation fails, say which fields failed and why, and report all of them together. The client gets a small object whose keys are field names and whose values are lists of messages. A form can light up exactly the right inputs. The next lesson standardizes this shape for the whole API.
```

```quiz
q: A valid JSON body arrives with age set to the text "29". Under our rule, what do you return?
options:
  - 400, the request is unreadable
  - 422, with an error listed under age
  - 201, because "29" can be converted to a number
answer: 1
why: The body is readable JSON, but age breaks the rule that it must be a number. Do not quietly convert types you never agreed to accept.
```

## Your turn

Open `createUser.ts`.

`createUserSchema`:
- `name`: a string, 1 to 50 characters after trimming
- `email`: trimmed, lowercased, and a valid address
- `age`: a whole number from 13 to 120. The text `"29"` must fail

`handleCreateUser(body)` returns `{ status, body }`:
- Not a JSON object: `400` with `{ error }`
- Bad fields: `422` with `{ errors: { field: [messages] } }`, bad fields only
- Valid: `201` with `{ user }`, the **parsed** user

```hint
Build the schema with `z.object({ name, email, age })`. Start `name` with `z.string().trim()` and add `.min` and `.max`.
```

```hint
For the email, normalize first and check after: `z.string().trim().toLowerCase().pipe(z.email())`. For age, `z.number().int().min(13).max(120)`.
```

```hint
In the handler, return early on a non-object. Then `safeParse`. On failure return `z.flattenError(result.error).fieldErrors`. On success return `result.data`, not the raw body.
```
