---
title: Errors as a contract
lang: py
minutes: 20
level: junior
roles: [backend]
files: [app.py]
sources:
  - https://www.rfc-editor.org/rfc/rfc9457.html
  - https://fastapi.tiangolo.com/tutorial/handling-errors/
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
  - https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
---

## Errors are part of the API

Clients write code against your **errors**, not only your successes. A FastAPI app with no extra work already answers three ways:

- unknown route: `{"detail": "Not Found"}`
- bad body: `{"detail": [{"loc": ..., "input": ...}]}`
- crash: the plain text `Internal Server Error`

Three shapes means three parsers in every client.

> **Why:** one predictable error shape is a **contract**. The client reads `status`, then `type`, and never guesses.

> **Not this:** `{"error": "oops"}` invented per endpoint. Each one needs its own client code, and none can be told apart by a machine.

```svg Three accidental error shapes become one shape every client can read
<svg viewBox="0 0 520 210" role="img" aria-label="Many error shapes compared with one">
  <g data-cue="mess" font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="20" width="200" height="38" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="30" y="43" fill="var(--fg)">{"detail":"Not Found"}</text>
    <rect x="20" y="74" width="200" height="38" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="30" y="97" fill="var(--fg)">{"detail":[{"loc":..}]}</text>
    <rect x="20" y="128" width="200" height="38" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="30" y="151" fill="var(--fg)">Internal Server Error</text>
  </g>
  <g data-cue="one" font-family="var(--font-mono)" font-size="12">
    <path d="M225 93 L285 93" stroke="var(--primary)" stroke-width="3"/>
    <rect x="290" y="20" width="210" height="146" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="302" y="46" fill="var(--fg)">type</text>
    <text x="302" y="70" fill="var(--fg)">title</text>
    <text x="302" y="94" fill="var(--fg)">status</text>
    <text x="302" y="118" fill="var(--fg)">detail</text>
    <text x="302" y="142" fill="var(--fg)">instance</text>
  </g>
</svg>
```

```narrate
Start on the left. [[mess]] Out of the box, an app answers errors in three different ways: a small object, a long list, and plain text. Every client has to handle each one. [[one]] On the right is the goal, one fixed set of members for every error, so a client writes a single parser.
```

## One shape: problem details

**RFC 9457** defines it. Serve it as `application/problem+json`.

| Member | Meaning |
|---|---|
| `type` | URI naming the kind of problem. Default `about:blank` |
| `title` | short, the same for every occurrence |
| `status` | the HTTP status, repeated in the body |
| `detail` | explains **this** occurrence, for people |
| `instance` | identifies this occurrence (a URI; we use the request path) |

You may add **extension members**, like an `errors` list for validation. Clients must ignore the ones they do not know.

```json
{ "type": "https://api.example.com/problems/item-not-found", "title": "Item not found", "status": 404, "detail": "No item with id 99", "instance": "/items/99" }
```

> **Trap:** do not make clients parse `detail`. It is prose. Branch on `status` and `type`.

```narrate
There is a standard for this, called problem details. Five members. Type names the kind of problem. Title is a short label. Status repeats the HTTP code. Detail explains this one case in words for a person. Instance says which occurrence it was. You can add extra members, like a list of invalid fields. Clients branch on status and type, never on the prose.
```

## Never leak internals

An unhandled crash often carries a stack trace, a file path, a SQL fragment, or a connection string with a password. FastAPI's default 422 even echoes the submitted `input` back.

The rule: **log the details, tell the client almost nothing.**

> **Why:** OWASP lists verbose errors as a leak that helps attackers map your system. The full story belongs in your logs, where only your team reads it. Even there, keep passwords and tokens out.

> **Not this:** `detail=str(exc)`. It puts whatever the exception happens to say on the wire.

```svg The same exception goes two places: full detail to the log, a generic problem to the client
<svg viewBox="0 0 520 190" role="img" aria-label="An exception split into a log entry and a client response">
  <g data-cue="boom" font-family="var(--font-mono)" font-size="14">
    <rect x="180" y="20" width="160" height="44" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="260" y="48" text-anchor="middle" fill="var(--fg)">exception</text>
    <path d="M220 64 L110 110" stroke="var(--fg)" stroke-width="2"/>
    <path d="M300 64 L410 110" stroke="var(--fg)" stroke-width="2"/>
  </g>
  <g data-cue="logs" font-family="var(--font-mono)" font-size="13">
    <rect x="20" y="110" width="190" height="62" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="115" y="136" text-anchor="middle" fill="var(--fg)">log</text>
    <text x="115" y="156" text-anchor="middle" fill="var(--fg-muted)">full trace, for us</text>
  </g>
  <g data-cue="client" font-family="var(--font-mono)" font-size="13">
    <rect x="310" y="110" width="190" height="62" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="405" y="136" text-anchor="middle" fill="var(--fg)">500 problem</text>
    <text x="405" y="156" text-anchor="middle" fill="var(--fg-muted)">generic, for them</text>
  </g>
</svg>
```

```narrate
When something breaks, [[boom]] the exception splits in two. [[logs]] One copy goes to your log with the full stack trace, so your team can debug. [[client]] The other copy goes to the client as a plain, generic problem that reveals nothing. Hide it from the client, never from your logs.
```

## Exception handlers

Routes **raise**. One place **translates**. Register a handler per kind of failure:

```python
@app.exception_handler(ItemNotFound)
async def handle_item_not_found(request: Request, exc: ItemNotFound):
    return problem_response(status=404, title="Item not found", detail=f"No item with id {exc.item_id}", instance=request.url.path)
```

You need four: your own domain exception, `RequestValidationError` (the 422), Starlette's `HTTPException`, and plain `Exception` (the 500).

> **Trap:** register the handler for **Starlette's** `HTTPException`, not FastAPI's. Unknown routes and 405s raise the Starlette one, and FastAPI's subclass would miss them.

In tests, use `TestClient(app, raise_server_exceptions=False)`, or the crash is re-raised into the test.

```narrate
Your routes raise exceptions, and one place turns them into responses. You need four handlers: one for your own domain exception, one for validation errors, one for the framework's HTTP exceptions, and one catch-all for anything unexpected. Register the HTTP handler on the Starlette class, so unknown routes are caught too.
```

```quiz
q: An unknown URL returns the framework's default 404 instead of your problem body. What is the most likely cause?
options:
  - The handler is registered for FastAPI's HTTPException, not Starlette's
  - The route is missing a status code
  - The exception was logged
answer: 0
why: Routing failures raise Starlette's HTTPException. A handler registered only on the FastAPI subclass never sees them.
```

## Your turn

Open `app.py`. The routes already exist. Add `problem_response` and the exception handlers so every error follows RFC 9457.

- Media type `application/problem+json`, members `type`, `title`, `status`, `detail`, `instance` (the request path)
- `ItemNotFound`: 404, `type` is `PROBLEM_BASE_URL/item-not-found`
- Validation: 422, `type` is `PROBLEM_BASE_URL/validation-error`, plus `errors`: a list of `{ field, message }`. Field is the name without `body` or `path`. Never echo the input
- Other HTTP errors: the status and its standard phrase as `title`, `type` is `about:blank`. Keep headers such as `Allow`
- Anything else: 500, a generic `detail`, **logged** with `logger.exception`

```hint
`problem_response` returns a `JSONResponse` with `media_type=PROBLEM_MEDIA_TYPE`. Put the five members in a dict and add any extras with `**extensions`.
```

```hint
`exc.errors()` gives dicts with `loc` and `msg`. For `("body", "price")` the field is `"price"`: join `loc[1:]` with dots.
```

```hint
`http.HTTPStatus(code).phrase` gives "Not Found". Pass `headers=exc.headers` through, or the `Allow` header on a 405 disappears.
```

```hint
Register the 500 handler with `@app.exception_handler(Exception)`. Call `logger.exception(...)` inside it, and keep `str(exc)` out of the response.
```
