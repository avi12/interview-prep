---
title: REST resources and status codes
lang: ts
minutes: 20
level: junior
roles: [backend]
files: [api.ts]
sources:
  - https://www.rfc-editor.org/rfc/rfc9110.html
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
  - https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/201
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
---

## Nouns, not verbs

A REST API exposes **resources**: things with a name, like tasks or orders. The URL is the noun. The HTTP method is the verb.

- `GET /tasks/7` reads task 7
- `POST /tasks` creates a task
- `DELETE /tasks/7` removes it

> **Why:** a client that knows the pattern can guess the rest of your API. One URL per thing, and the method says what to do with it.

> **Not this:** `POST /deleteTask?id=7`. Every team invents its own verbs, caches and proxies cannot tell a read from a write, and nobody can guess the next URL.

```svg Verbs in the URL (left) force the client to learn every name. Nouns plus a method (right) follow one pattern
<svg viewBox="0 0 520 210" role="img" aria-label="Verb URLs compared with noun URLs">
  <g data-cue="bad" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="28" fill="var(--fg-muted)">verbs in the URL</text>
    <rect x="20" y="40" width="230" height="34" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
    <text x="32" y="62" fill="var(--fg)">POST /createTask</text>
    <rect x="20" y="82" width="230" height="34" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
    <text x="32" y="104" fill="var(--fg)">GET /getTask?id=7</text>
    <rect x="20" y="124" width="230" height="34" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
    <text x="32" y="146" fill="var(--fg)">POST /deleteTask?id=7</text>
  </g>
  <g data-cue="good" font-family="var(--font-mono)" font-size="13">
    <text x="270" y="28" fill="var(--fg-muted)">noun + method</text>
    <rect x="270" y="40" width="230" height="34" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="282" y="62" fill="var(--fg)">POST /tasks</text>
    <rect x="270" y="82" width="230" height="34" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="282" y="104" fill="var(--fg)">GET /tasks/7</text>
    <rect x="270" y="124" width="230" height="34" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="282" y="146" fill="var(--fg)">DELETE /tasks/7</text>
  </g>
</svg>
```

```narrate
Look at the two columns. [[bad]] On the left, every action gets its own URL with a verb inside it. Nobody can guess the next one. [[good]] On the right, the URL names the thing and the method says what to do with it. Learn that pattern once and you can guess most of an API.
```

## Methods make promises

| Method | Safe | Idempotent | Use it to |
|---|---|---|---|
| `GET` | yes | yes | read |
| `PUT` | no | yes | replace the whole thing |
| `DELETE` | no | yes | remove |
| `POST` | no | no | create, or run an action |
| `PATCH` | no | not guaranteed | change a few fields |

**Safe**: the client expects no change. **Idempotent**: ten identical requests leave the same state as one.

Why care? When the network fails, the client cannot know if the server got the request. An idempotent request is safe to resend. A `POST` may create a duplicate.

> **Trap:** idempotent describes the **state left behind**, not the response. The second `DELETE` gets 404 and `DELETE` is still idempotent.

```narrate
Two words to say out loud in an interview. Safe means a read, nothing changes. Idempotent means that repeating the request ten times leaves the same state as sending it once. This matters because networks fail, and the client often does not know whether the server received the request. Idempotent requests can be resent freely. A post request might create a duplicate.
```

```quiz
q: A client sends DELETE /tasks/7 twice. The first answer is 204 and the second is 404. Is DELETE idempotent?
options:
  - No, because the two answers differ
  - Yes, because the state after one call and after two calls is the same
  - Only if the second answer is also 204
answer: 1
why: Idempotent is about the state the server ends up in. The task is gone after the first call and still gone after the second.
```

## Status codes tell the client what to do

Read the code by its first digit. It answers one question: **who has to change something?**

- **2xx**: nobody, it worked
- **4xx**: the client. Fix the request first, because resending it unchanged fails the same way (except `429`: the request is fine, you are too fast)
- **5xx**: the server. The same request may work later

```svg The first digit tells the client what to do next
<svg viewBox="0 0 520 200" role="img" aria-label="Status code classes and the client reaction">
  <g data-cue="ok" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="20" width="120" height="44" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="80" y="48" text-anchor="middle" fill="var(--fg)">2xx worked</text>
    <path d="M140 42 L200 42" stroke="var(--ok)" stroke-width="2"/>
    <text x="210" y="47" fill="var(--fg)">use the result</text>
  </g>
  <g data-cue="client" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="78" width="120" height="44" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="80" y="106" text-anchor="middle" fill="var(--fg)">4xx you erred</text>
    <path d="M140 100 L200 100" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="210" y="105" fill="var(--fg)">fix the request, then send</text>
  </g>
  <g data-cue="server" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="136" width="120" height="44" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="80" y="164" text-anchor="middle" fill="var(--fg)">5xx we erred</text>
    <path d="M140 158 L200 158" stroke="var(--danger)" stroke-width="2"/>
    <text x="210" y="163" fill="var(--fg)">wait, then retry</text>
  </g>
</svg>
```

```narrate
Three lanes. [[ok]] Two hundred range means it worked, so use the result. [[client]] Four hundred range means the client made a mistake. Sending the same request again fails the same way, so fix it first. [[server]] Five hundred range means the server failed. The very same request may work a moment later, so a delayed retry is reasonable.
```

## The codes you must know

| Code | Say it when | Client should |
|---|---|---|
| `200 OK` | read or update worked, body included | use the body |
| `201 Created` | `POST` made a new resource, send a `Location` header | follow `Location` |
| `204 No Content` | worked, nothing to send back | move on |
| `400 Bad Request` | the request cannot be read: broken JSON, wrong shape | fix the request |
| `401 Unauthorized` | not logged in (it really means unauthenticated; RFC 9110 wants a `WWW-Authenticate` header) | log in |
| `403 Forbidden` | logged in, not allowed | stop |
| `404 Not Found` | no such resource | check the id |
| `405 Method Not Allowed` | URL exists, method does not, send `Allow` | use an allowed method |
| `409 Conflict` | clashes with current state: duplicate, stale version | re-read, then decide |
| `422 Unprocessable Content` | readable, but a field breaks the rules (many APIs use `400` here too; lesson 2) | fix the fields |
| `429 Too Many Requests` | rate limited, send `Retry-After` | wait |
| `500 Internal Server Error` | our bug | retry later |

> **Trap:** `200` with `{"error": "..."}` in the body. Clients, caches and monitoring trust the status line, so a failure that says 200 is invisible to all of them.

```narrate
Twelve codes cover almost every answer, and you should say each with its reason. Created means a new thing exists, and the location header says where. Unauthorized really means not logged in. Forbidden means logged in but not allowed. Bad request means unreadable. Unprocessable means readable but wrong. Conflict means the request clashes with the current state. And never return a two hundred that carries an error.
```

```quiz
q: A logged-in user tries to delete another user's account. Which status do you return?
options:
  - 401, the user is not authenticated
  - 403, the user is known but not allowed
  - 404, because the account is hidden
answer: 1
why: The server knows who the caller is and refuses. 401 would mean no valid identity. 404 is a deliberate choice only when you must hide that the account exists.
```

## Your turn

Open `api.ts` and implement `createApi()`. It returns `{ handle }`, a function from request to response. No HTTP server: just the routing logic.

- `GET /tasks` is 200 with `{ items }`
- `POST /tasks` with `{ title }` is 201, a `location` header and the task. Body not an object: 400. Bad title: 422. Same title again: 409
- `GET`, `PUT` and `DELETE` on `/tasks/:id`: 200, 200, 204. Missing id: 404
- `PUT` takes `{ title, done }` and replaces the task (a `PUT` may create when clients pick ids, but ours do not)
- Unknown path: 404. Known path, wrong method: 405 with an `allow` header
- Ids start at 1, never repeat, and the client cannot set them. Two `createApi()` calls share nothing

```hint
Keep a `Map` from id to task inside `createApi`, plus a `nextId` counter. Both live in the closure, so each call gets fresh state.
```

```hint
Make two small maps of handlers: one for `/tasks` (GET, POST) and one for `/tasks/:id` (GET, PUT, DELETE). Match the path first (the id is digits only), then look up the method.
```

```hint
Path matches but the method is not in the handler map: that is 405, and the `allow` header is the map's keys joined with a comma.
```
