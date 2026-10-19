---
title: OAuth code flow with PKCE
lang: ts
minutes: 30
level: junior
roles: [backend]
files: [oauth.ts]
sources:
  - https://www.rfc-editor.org/rfc/rfc6749
  - https://www.rfc-editor.org/rfc/rfc7636
  - https://www.rfc-editor.org/rfc/rfc9700
  - https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html
  - https://nodejs.org/docs/latest-v24.x/api/crypto.html
---

## Log in with Google, without sharing your password

OAuth 2.0 lets an app act on your behalf **without ever seeing your password**. It is an *authorization* framework: the app gets a token with limited scope. (OpenID Connect adds "who is this user" on top.)

| Role | Example |
|---|---|
| Resource owner | You, the user |
| Client | The app that wants access |
| Authorization server | The login page and token issuer (Google) |
| Resource server | The API that accepts the token |

Today's recommended recipe, for browser, mobile and server apps: **authorization code flow + PKCE**.

```narrate
OAuth lets an app act for you without ever seeing your password. There are four roles. You, the resource owner. The app, called the client. The authorization server, such as Google, which shows the login page and issues tokens. And the resource server, the interface that accepts those tokens. The recipe to remember is the authorization code flow with PKCE.
```

> **Not this:** the old implicit flow or the password grant. RFC 9700 says the password grant must not be used and discourages implicit.

## The flow, in order

```svg The browser carries only a one-time code; the token comes back on a direct request
<svg viewBox="0 0 560 350" role="img" aria-label="Authorization code flow with PKCE between the app and the authorization server">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="30" y="8" width="140" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="100" y="27" text-anchor="middle" fill="var(--fg)">Your app</text>
    <rect x="390" y="8" width="140" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="460" y="27" text-anchor="middle" fill="var(--fg)">Auth server</text>
    <path d="M100 36 L100 330 M460 36 L460 330" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" fill="none"/>
    <g data-cue="prepare">
      <rect x="20" y="48" width="160" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="100" y="65" text-anchor="middle" fill="var(--fg)" font-size="11">save state + verifier</text>
    </g>
    <g data-cue="authorize">
      <text x="280" y="98" text-anchor="middle" fill="var(--fg)">1 /authorize?state&amp;challenge</text>
      <path d="M100 106 L446 106" stroke="var(--primary)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
      <polygon points="453,106 446,102 446,110" fill="var(--primary)"/>
    </g>
    <g data-cue="consent">
      <rect x="380" y="120" width="160" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="460" y="137" text-anchor="middle" fill="var(--fg)" font-size="11">user logs in, agrees</text>
    </g>
    <g data-cue="callback">
      <text x="280" y="170" text-anchor="middle" fill="var(--fg)">2 redirect: code + state</text>
      <path d="M460 178 L114 178" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
      <polygon points="107,178 114,174 114,182" fill="var(--accent-2)"/>
    </g>
    <g data-cue="checkstate">
      <rect x="20" y="192" width="160" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="100" y="209" text-anchor="middle" fill="var(--fg)" font-size="11">3 state matches?</text>
    </g>
    <g data-cue="exchange">
      <text x="280" y="242" text-anchor="middle" fill="var(--fg)">4 POST code + verifier</text>
      <path d="M100 250 L446 250" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="453,250 446,246 446,254" fill="var(--primary)"/>
      <rect x="380" y="262" width="160" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="460" y="279" text-anchor="middle" fill="var(--fg)" font-size="11">sha256(verifier) = challenge?</text>
    </g>
    <g data-cue="token">
      <text x="280" y="306" text-anchor="middle" fill="var(--fg)">5 access token</text>
      <path d="M460 314 L114 314" stroke="var(--ok)" stroke-width="2" fill="none"/>
      <polygon points="107,314 114,310 114,318" fill="var(--ok)"/>
    </g>
    <text x="10" y="346" fill="var(--fg-muted)" font-size="11">dashed: through the browser. solid: direct request.</text>
  </g>
</svg>
```

```narrate
Start on the app. [[prepare]] It makes a random state value and a secret called the verifier, and saves both. [[authorize]] Step one: it sends the browser to the authorization server with the state and only a hash of the verifier. [[consent]] The user logs in and agrees. [[callback]] Step two: the browser comes back with a one-time code and the same state. [[checkstate]] Step three: the app checks the state. [[exchange]] Step four: it sends the code and the verifier straight to the server, not through the browser's address bar, and the server hashes and compares. [[token]] A match gets the token.
```

> **Why:** the browser only ever carries a short-lived, single-use **code**. The valuable token comes back on a direct request from the app, never through the browser redirect. Per RFC 6749, a code must expire shortly and work once.

## state: refuse forged callbacks

An attacker starts their own login, gets a code for **their** account, and tricks your browser into opening the callback URL with it. Your app would link the attacker's account to you.

The defense: before redirecting, save a random `state` in the user's session. At the callback, accept only if the returned `state` **equals** the saved one.

> **Why:** RFC 6749 section 10.12 says the client must protect its redirect URI against CSRF. RFC 9700 prefers a one-time `state`, but lets a client rely on PKCE instead if it knows the server checks PKCE. Doing both costs nothing.

> **Trap:** `undefined === undefined`. If the app saved no state and the callback has none, a naive compare passes. Treat an empty expected state as a failure.

```narrate
Without state, an attacker can start their own login, get a code for their own account, and trick your browser into opening the callback with it. Your app then links their account to you. So before redirecting, save a random state in the session. At the callback, accept only if the returned state equals the saved one. If no state was saved, fail. Two missing values must never count as equal.
```

```quiz
q: The callback arrives with a valid-looking code but a state that does not match the saved one. What do you do?
options:
  - Reject it, it may be a forged request
  - Exchange the code anyway, the code is the important part
  - Ask the user to log in again and keep the new state
answer: 0
why: A mismatch means this browser did not start that login. Exchanging the code could link an attacker's account.
```

## PKCE: a stolen code is useless

**PKCE** (RFC 7636, say "pixie") stops someone who steals the code from using it.

1. Make a random **verifier** (32 random bytes, base64url, 43 characters)
2. Send only its SHA-256 hash, the **challenge**, in step 1
3. Send the verifier itself only in step 4. The server hashes it and compares

```svg The attacker can steal the code from the redirect, but not the verifier
<svg viewBox="0 0 560 200" role="img" aria-label="Verifier, challenge and why a stolen code fails">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="verifier">
      <rect x="10" y="20" width="170" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="95" y="46" text-anchor="middle" fill="var(--fg)">verifier</text>
      <text x="95" y="66" text-anchor="middle" fill="var(--fg-muted)" font-size="11">random, kept secret</text>
      <path d="M180 52 L226 52" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="233,52 226,48 226,56" fill="var(--primary)"/>
      <text x="206" y="42" text-anchor="middle" fill="var(--fg-muted)" font-size="11">sha256</text>
    </g>
    <g data-cue="challenge">
      <rect x="240" y="20" width="170" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="325" y="46" text-anchor="middle" fill="var(--fg)">challenge</text>
      <text x="325" y="66" text-anchor="middle" fill="var(--fg-muted)" font-size="11">sent in step 1</text>
    </g>
    <g data-cue="stolen">
      <rect x="10" y="116" width="400" height="64" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="210" y="142" text-anchor="middle" fill="var(--fg)">attacker steals the code from the redirect</text>
      <text x="210" y="164" text-anchor="middle" fill="var(--danger)">but has no verifier: token refused</text>
    </g>
  </g>
</svg>
```

```narrate
[[verifier]] The app makes a random verifier and keeps it secret. [[challenge]] It sends only the hash of the verifier, called the challenge, when it starts the login. [[stolen]] Now suppose an attacker grabs the code out of the redirect. At the token endpoint the server asks for the verifier, hashes it, and compares. The attacker does not have it, so the token is refused.
```

> **Not this:** the `plain` method. It sends the verifier itself in step 1, so there is nothing secret left. Use `S256`: RFC 9700 says to use a method that does not expose the verifier, and S256 is the only one. It also says public clients (apps that cannot keep a secret, like mobile and single-page apps) must use PKCE.

## Redirect URIs match exactly

The app registers its callback, say `https://app.example.com/callback`. The server compares every request against it as a plain **string**.

| Request `redirect_uri` | Result |
|---|---|
| `https://app.example.com/callback` | accept |
| `https://app.example.com/callback/` | reject |
| `https://app.example.com.evil.com/callback` | reject |
| `https://app.example.com/other` | reject |

> **Why:** a loose match lets an attacker steer the code to a page they control. RFC 9700 says authorization servers must use exact string matching.

> **Not this:** prefix checks or wildcards such as `https://app.example.com/*`. They turn any open redirect on your site into a stolen code.

```narrate
The app registers its callback address once, and the server compares every request against it as a plain string. A trailing slash is different. A lookalike domain is different. A different path is different. If matching is loose, an attacker can steer the code to a page they control. So no prefix checks, and no wildcards.
```

```quiz
q: Registered redirect URI is https://app.example.com/callback. A request uses https://app.example.com/callback/ with a trailing slash. What happens?
options:
  - Accepted, it is the same page
  - Rejected, exact string match fails
  - Accepted if the client id is right
answer: 1
why: RFC 9700 requires exact string matching. Similar is not equal, and "similar" is where attacks live.
```

## Your turn

Open `oauth.ts` in your copy. Two functions:

- `createPkcePair({ getRandomBytes? })` returns `{ codeVerifier, codeChallenge, method }`. The verifier is 32 random bytes in base64url. The challenge is the base64url SHA-256 of the verifier. The method is `"S256"`
- `validateCallback({ callbackUrl, expectedState })` returns `{ isValid: true, code }` or `{ isValid: false, reason }`. Check in this order: state (`"state_mismatch"`, also when no state was saved), then an `error` parameter (`"provider_error"`), then a missing code (`"missing_code"`)

One test replays the example in RFC 7636 Appendix B.

Run the tests from the Run button, or `pnpm lesson test auth/05-oauth-code-flow-pkce`.

```hint
`createHash("sha256").update(codeVerifier).digest("base64url")` gives the challenge. The random bytes come from `getRandomBytes(VERIFIER_BYTES)`, encoded with `.toString("base64url")`.
```

```hint
`new URL(callbackUrl).searchParams` gives `.get("state")`, `.has("error")` and `.get("code")`. Check them in the order of the spec, returning early on each failure.
```

```hint
For the state, return a failure when either value is empty. Then put both in Buffers, check the lengths match, and use `timingSafeEqual`. Keep a small `failure(reason)` helper so each early return is one line.
```
