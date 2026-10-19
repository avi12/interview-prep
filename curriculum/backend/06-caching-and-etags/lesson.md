---
title: Caching and ETags
lang: ts
minutes: 15
level: junior
roles: [backend]
files: [conditional.ts]
sources:
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304
  - https://www.rfc-editor.org/rfc/rfc9110.html
---

## Two ideas: fresh, and still good?

HTTP caching has two separate ideas.

- **Freshness**: the response says "reuse me for 60 seconds". During that time the client does not even ask the server
- **Validation**: after that, the client asks cheaply "has it changed?". If not, the server answers with no body, and the stored copy is fresh again

Both save time and bandwidth, and take load off your server.

> **Why:** the fastest request is the one never sent. The second fastest is one whose answer is three lines of headers.

```svg Fresh copy: no request at all. Stale copy: a conditional request and an empty 304
<svg viewBox="0 0 520 215" role="img" aria-label="Cache timeline: first fetch, fresh reuse, revalidation">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="60" y="18" text-anchor="middle" fill="var(--fg)">cache</text>
    <text x="260" y="18" text-anchor="middle" fill="var(--fg)">server</text>
    <path d="M60 28 L60 205" stroke="var(--border)" stroke-width="2"/>
    <path d="M260 28 L260 205" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="first">
      <path d="M60 50 L256 50" stroke="var(--primary)" stroke-width="2"/>
      <text x="70" y="43" fill="var(--fg)">GET /profile</text>
      <path d="M256 80 L64 80" stroke="var(--ok)" stroke-width="2"/>
      <text x="70" y="73" fill="var(--fg)">200 + body, ETag "v1", max-age=60</text>
    </g>
    <g data-cue="fresh">
      <rect x="70" y="100" width="300" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="80" y="120" fill="var(--fg)">30 s later: served locally, no request</text>
    </g>
    <g data-cue="again">
      <path d="M60 158 L256 158" stroke="var(--primary)" stroke-width="2"/>
      <text x="70" y="151" fill="var(--fg)">stale: GET + If-None-Match "v1"</text>
      <path d="M256 188 L64 188" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="70" y="181" fill="var(--fg)">304 Not Modified, no body</text>
    </g>
  </g>
</svg>
```

```narrate
Follow the cache on the left. [[first]] The first request gets a full answer with a body, a version tag called an ETag, and a promise that it stays fresh for sixty seconds. [[fresh]] Thirty seconds later the cache answers by itself, and nothing crosses the network. [[again]] After the minute is up, the copy is stale. The cache asks, is version one still current? The server says not modified, with no body, and the old copy is good again.
```

## Cache-Control

The server tells every cache what it may do with the response.

| Directive | Meaning |
|---|---|
| `max-age=N` | fresh for N seconds, reuse without asking |
| `no-cache` | may be stored, but **revalidate** before every reuse |
| `no-store` | do not store at all |
| `private` | only the user's own browser may store it |
| `public` | shared caches such as a CDN may store it |
| `immutable` | will never change, so skip revalidation |

> **Trap:** `no-cache` does **not** mean "do not cache". It means "check with me first". The directive for "never keep this" is `no-store`.

> **Trap:** a personalized response without `private` can be kept by a shared cache and served to the wrong user.

```narrate
Cache-Control is the instruction sheet for every cache between you and the user. Max-age sets how long a copy stays fresh. No-cache means keep it, but ask before using it. No-store means do not keep it at all. And private keeps personal data out of shared caches, so one user never sees another's page.
```

```quiz
q: A response contains an account balance. Which Cache-Control should it carry?
options:
  - public, max-age=3600
  - no-cache
  - no-store
answer: 2
why: no-store keeps the response out of every cache. no-cache would still store it and only revalidate before reuse.
```

## ETag and If-None-Match

An **ETag** names one version of a resource. It is opaque: a hash of the body, a version number, anything that changes when the content does.

```http
HTTP/1.1 200 OK
ETag: "33a64df5"
Cache-Control: private, max-age=60
```

```http
GET /profile
If-None-Match: "33a64df5"
```

Same version: `304 Not Modified`, no body, but still the `ETag` and `Cache-Control` headers. Different version: `200` with the full body.

> **Why:** the match saves bandwidth. Hash the body and you still build it; a `version` column as the ETag saves the work too.

> **Not this:** `Last-Modified` alone. It has one-second resolution and depends on clocks. When both are sent, `If-None-Match` wins.

```narrate
An ETag is a name for one version of a resource. The server sends it with the response. Later the client sends it back in an if none match header. If the version is still the same, the server answers three hundred four with no body. If not, it sends the new body with a new tag. The match is weak, so a weak copy of the same tag also counts, and the header can list several tags.
```

## What to send for what

| Response | Headers |
|---|---|
| Hashed file such as `app.3f9c.js` | `public, max-age=31536000, immutable` |
| Per-user data such as `/me` | `private, no-cache` and an `ETag` |
| Public list that can be a minute old | `public, max-age=60` and an `ETag` |
| Tokens, anything secret | `no-store` |

ETags also protect **writes**. A `PUT` with `If-Match: "v1"` fails with `412 Precondition Failed` if someone changed the resource first. That is optimistic locking, covered in lesson 7.

```narrate
Match the headers to the data. A file whose name contains a hash never changes, so cache it for a year. Personal data gets private and no cache, with an ETag, so it is stored but always checked. Secrets get no store. And the same ETag idea protects writes: send it back in if match, and the server refuses the update if someone else got there first.
```

## Your turn

Open `conditional.ts`.

`etagFor(resource)` returns a **strong** ETag: a quoted hash of the JSON text (use `node:crypto`).

`conditionalResponse({ resource, ifNoneMatch, maxAgeSeconds })` returns `{ status, headers, body }`:
- Always `etag` and `cache-control` headers. Max age above 0: `private, max-age=N`. Zero: `private, no-cache`
- `ifNoneMatch` matches the current ETag: `304`, headers, **no body**
- Otherwise `200` with the body
- The header may hold a list (`"a", "b"`), the wildcard `*`, and weak tags (`W/"a"`). Weak comparison ignores the `W/`

```hint
Build the ETag first: `"` + sha256 hex of `JSON.stringify(resource)` + `"`. Compute it once and reuse it for the header and the comparison.
```

```hint
Split `ifNoneMatch` on commas and trim each piece. If any piece is `*`, it matches.
```

```hint
For each piece, strip a leading `W/`, then compare the whole string with the current ETag. Do not use `includes`: that would match tags that merely contain it.
```
