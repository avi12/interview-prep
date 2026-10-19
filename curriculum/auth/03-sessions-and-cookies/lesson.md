---
title: Sessions and cookies
lang: ts
minutes: 25
level: junior
roles: [backend]
files: [sessions.ts]
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
  - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
---

## The server remembers, the cookie points

After a successful login the server creates a **session**: a record in its own store, found by a long random **session id**. The browser only holds the id, in a cookie. Every later request carries it back.

The cookie is a **pointer**. The data stays on the server.

```svg Login creates the record and hands out the id; every later request shows the id and the server looks it up
<svg viewBox="0 0 560 250" role="img" aria-label="Login, Set-Cookie, then a request with the cookie and a lookup in the session store">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="10" y="8" width="100" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="60" y="27" text-anchor="middle" fill="var(--fg)">Browser</text>
    <rect x="210" y="8" width="100" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="260" y="27" text-anchor="middle" fill="var(--fg)">Server</text>
    <rect x="410" y="8" width="100" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="460" y="27" text-anchor="middle" fill="var(--fg)">Session store</text>
    <path d="M60 36 L60 238 M260 36 L260 238 M460 36 L460 238" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" fill="none"/>
    <g data-cue="login">
      <text x="160" y="62" text-anchor="middle" fill="var(--fg)">POST /login + password</text>
      <path d="M60 70 L246 70" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="253,70 246,66 246,74" fill="var(--primary)"/>
      <text x="360" y="92" text-anchor="middle" fill="var(--fg)">save: id -> user 7</text>
      <path d="M260 100 L446 100" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="453,100 446,96 446,104" fill="var(--primary)"/>
    </g>
    <g data-cue="cookie">
      <text x="160" y="122" text-anchor="middle" fill="var(--fg)">Set-Cookie: sid=id</text>
      <path d="M260 130 L74 130" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <polygon points="67,130 74,126 74,134" fill="var(--accent-2)"/>
    </g>
    <g data-cue="request">
      <text x="160" y="162" text-anchor="middle" fill="var(--fg)">GET /orders + Cookie</text>
      <path d="M60 170 L246 170" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="253,170 246,166 246,174" fill="var(--primary)"/>
    </g>
    <g data-cue="lookup">
      <text x="360" y="192" text-anchor="middle" fill="var(--fg)">find id -> user 7</text>
      <path d="M260 200 L446 200" stroke="var(--ok)" stroke-width="2" fill="none"/>
      <polygon points="453,200 446,196 446,204" fill="var(--ok)"/>
    </g>
  </g>
</svg>
```

```narrate
Read it from the top. [[login]] The browser posts a password. The server saves a record in its session store, under a fresh random id. [[cookie]] It answers with a Set-Cookie header that holds only that id. [[request]] On the next request the browser sends the cookie back on its own. [[lookup]] The server finds the record by id, and now it knows who is asking.
```

> **Why:** the data lives on the server, so logout, a ban or a role change takes effect on the next request. A signed token in the browser cannot do that (next lessons).

## Cookie flags

A cookie is just a header. The flags decide who may read it and when it is sent.

```http
Set-Cookie: __Host-sid=<id>; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Lax
```

| Flag | It stops |
|---|---|
| `HttpOnly` | Page scripts reading the cookie. This is **XSS** theft: an attacker's script running on your page |
| `Secure` | The cookie travelling over plain HTTP |
| `SameSite=Lax` or `Strict` | The cookie riding along on cross-site requests. This is **CSRF**: another site making your browser act as you. `Lax` still sends it on top-level link clicks (GET), so treat this as one layer, not the whole fix |
| `__Host-` prefix | Another subdomain overwriting it. Needs `Secure`, `Path=/`, no `Domain` |
| `Max-Age=3600` | Living forever. Seconds. Wins over `Expires`. `0` deletes it |

```narrate
A cookie is just a header, and the flags decide who can read it. Http only keeps page scripts away from it. Secure keeps it off plain http. Same site stops it riding along on requests started by other sites. The double underscore host prefix locks the scope down. And max age is a lifetime in seconds, where zero deletes the cookie.
```

> **Not this:** keep the session id in `localStorage`. Any script on the page can read it, and OWASP says to keep session ids and tokens out of it.

```quiz
q: Which flag stops a script injected through XSS from reading the session cookie?
options:
  - Secure
  - HttpOnly
  - SameSite
answer: 1
why: HttpOnly hides the cookie from document.cookie. It still gets sent with requests, so it does not prevent CSRF.
```

## Session fixation

If the session id **stays the same** after login, an attacker who knew the id before login owns the session afterwards.

```svg The attacker plants a known id before login; the fix is a brand new id at login
<svg viewBox="0 0 560 210" role="img" aria-label="Session fixation attack in four steps and the fix">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="attack">
      <rect x="10" y="20" width="124" height="64" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="72" y="46" text-anchor="middle" fill="var(--fg)">1 attacker opens</text>
      <text x="72" y="66" text-anchor="middle" fill="var(--fg)">site, gets id A</text>
      <rect x="144" y="20" width="124" height="64" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="206" y="46" text-anchor="middle" fill="var(--fg)">2 victim is made</text>
      <text x="206" y="66" text-anchor="middle" fill="var(--fg)">to use id A</text>
      <rect x="278" y="20" width="124" height="64" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="340" y="46" text-anchor="middle" fill="var(--fg)">3 victim logs in,</text>
      <text x="340" y="66" text-anchor="middle" fill="var(--fg)">server keeps A</text>
      <rect x="412" y="20" width="124" height="64" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="474" y="46" text-anchor="middle" fill="var(--fg)">4 attacker uses</text>
      <text x="474" y="66" text-anchor="middle" fill="var(--fg)">A: logged in</text>
    </g>
    <g data-cue="fix">
      <rect x="10" y="116" width="526" height="64" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="273" y="142" text-anchor="middle" fill="var(--fg)">Fix at step 3: login issues a NEW id B and destroys A.</text>
      <text x="273" y="164" text-anchor="middle" fill="var(--fg)">The id the attacker knows is now worthless.</text>
    </g>
  </g>
</svg>
```

```narrate
Here is the attack. [[attack]] First the attacker opens the site and gets a session id, call it A. Next the victim is tricked into using A. Then the victim logs in, and a careless server keeps A and marks it logged in. Now the attacker, who knows A, is logged in too. [[fix]] The fix is one rule: at login, issue a brand new id and destroy the old one.
```

> **Why:** OWASP says to renew the session id after any privilege change: login, password change, role change. Accept only ids the server issued itself.

> **Not this:** reuse the pre-login session and just set `userId` on it. That is the bug.

```quiz
q: A visitor arrives with an unknown session id and logs in successfully. What should the server do?
options:
  - Keep that id and attach the user to it
  - Issue a new id from its own generator and ignore the one it was given
  - Reject the login
answer: 1
why: The id came from the client, so it may have been planted. The server only trusts ids it generated itself.
```

## Expiry and logout

Cookie expiry is a hint to the browser. The **server** enforces the real limits.

| Timeout | Meaning | OWASP example |
|---|---|---|
| Idle | Time since the last request | 15 to 30 minutes for low-risk apps |
| Absolute | Time since login, whatever you do | 4 to 8 hours for an office app |

```narrate
Cookie expiry is only a hint to the browser. The server enforces the real limits. An idle timeout ends a session after a quiet period. An absolute timeout ends it a fixed time after login, however busy the user is. On logout, destroy the record on the server. Deleting the cookie in the browser is not enough.
```

> **Trap:** on logout, only clearing the cookie. A copied cookie keeps working until the server record is gone. Destroy it server side.

## Your turn

Open `sessions.ts` in your copy. It exports three things.

- `generateSessionId()`: at least 128 bits from `randomBytes`, URL-safe text
- `sessionCookie({ sessionId, maxAgeSeconds })`: the `Set-Cookie` value. Use the `__Host-sid` name, `Max-Age`, `Path=/`, `HttpOnly`, `Secure` and `SameSite=Lax`
- `createSessionManager({ now, generateId, ttlMs })` with `start`, `get`, `login` and `destroy`

`login` must give a **new** id and kill the old one. `get` returns nothing once `now() >= expiresAt`. The clock is injected, so tests never wait.

Run the tests from the Run button, or `pnpm lesson test auth/03-sessions-and-cookies`.

```hint
Keep the fixed attributes in a constant list. Build the value from `name=id`, then `Max-Age=n`, then that list, joined with "; ".
```

```hint
Write one private helper that creates a session with `generateId()` and `now() + ttlMs`, stores it in the Map and returns it. `start` and `login` both use it.
```

```hint
login = destroy the old id, then open a new session for the user. get = look up, return undefined if missing, and if `now() >= expiresAt` delete it and return undefined.
```
