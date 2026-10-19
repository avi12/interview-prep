---
title: Authorization and IDOR
lang: ts
minutes: 25
level: junior
roles: [backend]
files: [invoices.ts]
sources:
  - https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/
  - https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
  - https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403
---

## Logged in is not allowed

The most common real-world authorization bug: the server checks **who you are**, but not **whose data** you asked for.

```svg The only difference between the bug and the fix is one ownership check
<svg viewBox="0 0 560 215" role="img" aria-label="Alice changes an invoice id in the URL and sees Bob's invoice until the server checks ownership">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="own">
      <rect x="10" y="18" width="250" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="40" fill="var(--fg)">alice: GET /invoices/42</text>
      <path d="M260 36 L293 36" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="300,36 293,32 293,40" fill="var(--primary)"/>
      <rect x="300" y="18" width="250" height="36" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="312" y="40" fill="var(--fg)">200 OK: her own invoice</text>
    </g>
    <g data-cue="swap">
      <text x="10" y="84" fill="var(--fg-muted)">the bug: alice changes 42 to 43</text>
      <rect x="10" y="94" width="250" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="116" fill="var(--fg)">alice: GET /invoices/43</text>
      <path d="M260 112 L293 112" stroke="var(--danger)" stroke-width="2" fill="none"/>
      <polygon points="300,112 293,108 293,116" fill="var(--danger)"/>
      <rect x="300" y="94" width="250" height="36" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="312" y="116" fill="var(--fg)">200 OK: bob's invoice!</text>
    </g>
    <g data-cue="fixed">
      <text x="10" y="160" fill="var(--fg-muted)">the fix: check who owns it</text>
      <rect x="10" y="170" width="250" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="192" fill="var(--fg)">alice: GET /invoices/43</text>
      <path d="M260 188 L293 188" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="300,188 293,184 293,192" fill="var(--primary)"/>
      <rect x="300" y="170" width="250" height="36" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="312" y="192" fill="var(--fg)">404: same as missing</text>
    </g>
  </g>
</svg>
```

```narrate
[[own]] Alice asks for her own invoice, number forty-two, and gets it. That part is fine. [[swap]] Now she edits the number in the address to forty-three. A vulnerable server only asks whether she is logged in, so it hands her Bob's invoice. [[fixed]] The fixed server also asks whose invoice this is. It is not hers, so the answer is the same as for an invoice that does not exist.
```

> **Why:** this bug has a name: IDOR (insecure direct object reference), also called BOLA (broken object level authorization). It is number one in the OWASP API Security Top 10, and broken access control is number one in the OWASP Top 10 for 2025.

## Two checks, not one

| Check | Question | Example |
|---|---|---|
| **Role** (RBAC) | May this kind of user do this action? | Only an admin deletes |
| **Ownership** | May this user touch **this** object? | `invoice.ownerId === user.id` |

A role cannot say "only your own". Ownership alone cannot say "auditors may read everything". The role grants the **action**, the relationship grants the **object**.

OWASP also notes that pure RBAC handles object-level rules poorly and grows into a pile of roles.

> **Not this:** `if (user.role === "user") return invoice`. Every user is a `user`, so every user reads every invoice.

```narrate
There are two questions, and you need both. The role question: may this kind of user do this action, for example delete? The ownership question: may this user touch this particular object? A role cannot express only your own. Ownership alone cannot say auditors may read everything. So the role grants the action, and the relationship grants the object.
```

## The IDOR recipe

1. Take the user from the **session or token**, never from the request
2. Check access to **each object** on **every** request: read, update, delete, export
3. Put the rules in **one policy function** that every handler calls
4. Test it: log in as user A, ask for user B's ids

> **Trap:** "the ids are random UUIDs, nobody can guess them". Unpredictable ids slow guessing. They are not a permission check. Leaked links and logs expose them.

> **Not this:** hide the link in the UI. The attacker types the URL.

```narrate
Here is the recipe to say aloud. Take the user from the session, never from something the client sent. Check access to each object, on every request, for reads and for writes. Put the rules in one policy function that every handler calls. And write a test that logs in as one user and asks for another user's ids. Random identifiers help, but they are never a replacement for the check.
```

```quiz
q: An API uses random UUIDs for invoices. Is it safe from IDOR?
options:
  - Yes, nobody can guess a UUID
  - No, you still need an ownership check on every request
  - Yes, as long as the UI hides other people's links
answer: 1
why: UUIDs only make guessing hard. IDs leak through links, logs and shared screens, and the server must still decide.
```

## Deny by default

Start from "no" and add exceptions. An unknown role gets nothing. A new endpoint gets nothing until someone writes its rule.

| Situation | Answer |
|---|---|
| Nobody is logged in | **401** |
| Role is unknown | **403** |
| Object is missing **or** not yours | **404**, same body in both cases |
| You may see it, but not do this to it | **403** |

> **Why:** a 403 for invoice 43 tells the attacker that invoice 43 exists. MDN notes servers may answer 404 instead of 403 when admitting existence is undesirable.

```narrate
Deny by default means start from no and add exceptions. A role the code does not know gets nothing. For objects, answer not found when the object is missing and also when it belongs to someone else, with the same body. A forbidden answer for number forty-three would confirm that number forty-three exists. Forbidden is for when the person may see the thing but not do this action to it.
```

```quiz
q: Alice requests Bob's invoice. Which response leaks the least?
options:
  - 403 with "this invoice belongs to someone else"
  - 404, identical to the response for an id that does not exist
  - 200 with an empty body
answer: 1
why: The 404 gives Alice no way to tell a missing invoice from one she cannot see.
```

## Your turn

Open `invoices.ts` in your copy. It has three **vulnerable** handlers: `getInvoice`, `listInvoices` and `deleteInvoice`. Fix them so the tests pass.

| Case | Status |
|---|---|
| No user | 401 |
| Role not user, auditor or admin | 403 |
| Missing invoice, or not one you may read | 404, same body for both |
| Read allowed | 200 |
| Delete: owner or admin | 204 |
| Delete: auditor (can read, cannot delete) | 403 |

Users read their own. Auditors and admins read all. Only admins delete someone else's. `listInvoices` returns only what the caller may read.

Run the tests from the Run button, or `pnpm lesson test auth/06-authorization-and-idor`.

```hint
Put the rules in data, not in `if` chains: a table from role to `{ canReadAny, canDeleteAny }`. A role missing from the table is your "unknown role" case.
```

```hint
Write two small pure helpers, `canRead` and `canDelete`, that take the user, the invoice and the permissions. Ownership is one comparison. All three handlers start with the same two early returns: no user, no permissions.
```

```hint
In `deleteInvoice` check read access first and return 404, then check delete access and return 403, then delete. For the list, filter with `canRead` instead of returning everything.
```
