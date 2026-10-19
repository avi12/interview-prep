---
title: JWT by hand
lang: ts
minutes: 30
level: junior
roles: [backend]
files: [jwt.ts]
sources:
  - https://www.rfc-editor.org/rfc/rfc7519
  - https://www.rfc-editor.org/rfc/rfc8725
  - https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  - https://nodejs.org/docs/latest-v24.x/api/crypto.html
---

## Three parts, and none is secret

A JWT (JSON Web Token) is three base64url pieces joined by dots: `header.payload.signature`.

```svg The first two parts are readable by anyone; only the signature needs the secret
<svg viewBox="0 0 560 210" role="img" aria-label="A JWT split into header, payload and signature">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="header">
      <rect x="10" y="20" width="160" height="44" fill="var(--surface-2)" stroke="var(--cat-1)" stroke-width="2"/>
      <text x="90" y="38" text-anchor="middle" fill="var(--fg)">header</text>
      <text x="90" y="55" text-anchor="middle" fill="var(--fg-muted)" font-size="11">algorithm + type</text>
      <text x="10" y="92" fill="var(--fg)" font-size="11">{"alg":"HS256",</text>
      <text x="10" y="108" fill="var(--fg)" font-size="11">"typ":"JWT"}</text>
    </g>
    <text x="175" y="46" fill="var(--fg-muted)" font-size="18">.</text>
    <g data-cue="payload">
      <rect x="190" y="20" width="160" height="44" fill="var(--surface-2)" stroke="var(--cat-2)" stroke-width="2"/>
      <text x="270" y="38" text-anchor="middle" fill="var(--fg)">payload</text>
      <text x="270" y="55" text-anchor="middle" fill="var(--fg-muted)" font-size="11">the claims</text>
      <text x="190" y="92" fill="var(--fg)" font-size="11">{"sub":"user-1",</text>
      <text x="190" y="108" fill="var(--fg)" font-size="11">"iss":"auth.example",</text>
      <text x="190" y="124" fill="var(--fg)" font-size="11">"exp":1900000600}</text>
    </g>
    <text x="355" y="46" fill="var(--fg-muted)" font-size="18">.</text>
    <g data-cue="signature">
      <rect x="370" y="20" width="160" height="44" fill="var(--surface-2)" stroke="var(--cat-3)" stroke-width="2"/>
      <text x="450" y="38" text-anchor="middle" fill="var(--fg)">signature</text>
      <text x="450" y="55" text-anchor="middle" fill="var(--fg-muted)" font-size="11">the seal</text>
      <text x="370" y="92" fill="var(--fg)" font-size="11">HMAC-SHA256(</text>
      <text x="370" y="108" fill="var(--fg)" font-size="11">  secret,</text>
      <text x="370" y="124" fill="var(--fg)" font-size="11">  header.payload)</text>
    </g>
    <text x="10" y="176" fill="var(--fg-muted)" font-size="11">Anyone can decode the first two parts. Only the seal needs the secret.</text>
  </g>
</svg>
```

```narrate
A JWT is three pieces joined by dots. [[header]] The header says which algorithm sealed it. [[payload]] The payload holds the claims, such as who the user is and when the token expires. Anyone can decode it. [[signature]] The signature is a keyed hash of the first two parts. It proves nobody changed them, and only someone with the secret could have made it.
```

> **Trap:** base64url is an encoding, not encryption. Never put a password or private data in the payload.

## Sealing with HS256

HS256 means **HMAC** (a keyed hash) with SHA-256. Sign, then verify by doing the same math again:

```ts
const signingInput = `${base64url(header)}.${base64url(payload)}`;
const signature = createHmac("sha256", secret).update(signingInput).digest("base64url");
```

Verify: recompute the signature, compare it in constant time (`timingSafeEqual`), and only then read the payload.

> **Why:** any server holding the secret can verify a token with no database lookup. That is why JWTs are popular for APIs.

> **Trap:** a weak secret. Use random bytes, at least 32 for HS256. A human password can be brute-forced offline from one captured token, and RFC 8725 says a password must not be used as the key.

```narrate
Sealing is a few lines. Join the encoded header and payload with a dot. Run that string through a keyed hash with your secret. Encode the result and append it. To verify, redo the same math on the incoming token and compare in constant time. Only after the match do you trust the payload. And the secret must be random and long, never a human password.
```

## Checks after the signature

A good signature says only that **someone with the secret** made the token. It does not say the token is for you, or still valid.

| Claim | Check | Rule |
|---|---|---|
| `exp` | Expiry | Reject when now is **at or after** exp. Require it |
| `nbf` | Not before | Reject when now is before nbf. At nbf it is fine |
| `iss` | Issuer | Must equal exactly the issuer you trust |
| `aud` | Audience | Your API's name must be in it |

> **Trap:** JWT times are **seconds**. `Date.now()` is milliseconds. Divide by 1000 before comparing.

```narrate
After the signature, check what the token claims. Expiry: reject when the current time is at or after it, and insist that it exists, or the token lives forever. Not before: reject early use. Issuer: it must be exactly the one you trust. Audience: your own service name must be listed, or a token made for another service could be replayed on yours. And remember, token times count seconds, not milliseconds.
```

```quiz
q: A token has exp = 1000 and your clock says exactly 1000 seconds. What do you do?
options:
  - Accept it, the time has not passed yet
  - Reject it, the token expires at that second
  - Accept it if the signature is valid
answer: 1
why: RFC 7519 says the current time must be before exp. At the exact second it is already expired.
```

## Two famous attacks

Both work when the **token** decides how it is verified.

- **alg none:** the header says "no signature". Some old libraries obeyed and skipped the check
- **Algorithm confusion:** the server verifies RS256 with a public key. The attacker sets `HS256` and signs with that public key as the HMAC secret. A library that trusts the header accepts it

```svg The token must never choose the algorithm; your code decides
<svg viewBox="0 0 560 220" role="img" aria-label="Verification that trusts the token header versus verification with a fixed algorithm">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="bad">
      <text x="10" y="24" fill="var(--danger)">BAD: the token picks the algorithm</text>
      <rect x="10" y="38" width="260" height="52" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="22" y="60" fill="var(--fg)">alg: none</text>
      <text x="22" y="78" fill="var(--fg-muted)">server skips the check</text>
      <rect x="10" y="100" width="260" height="52" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="22" y="122" fill="var(--fg)">alg: HS256, signed with</text>
      <text x="22" y="140" fill="var(--fg-muted)">the public key as the secret</text>
      <text x="10" y="184" fill="var(--danger)">forged admin token accepted</text>
    </g>
    <g data-cue="good">
      <text x="290" y="24" fill="var(--ok)">GOOD: the server picks it</text>
      <rect x="290" y="38" width="260" height="52" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="302" y="60" fill="var(--fg)">code says: only HS256</text>
      <text x="302" y="78" fill="var(--fg-muted)">header.alg must equal it</text>
      <rect x="290" y="100" width="260" height="52" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="302" y="122" fill="var(--fg)">anything else</text>
      <text x="302" y="140" fill="var(--fg-muted)">rejected before any math</text>
      <text x="290" y="184" fill="var(--ok)">forged tokens rejected</text>
    </g>
  </g>
</svg>
```

```narrate
Look at the left side. [[bad]] If the token chooses the algorithm, an attacker writes none and the server skips the check. Or they pick the keyed hash and sign it with your public key, which everyone knows. Either way a forged admin token gets in. [[good]] On the right your code names the one algorithm it accepts. Anything else is rejected before any math happens.
```

> **Not this:** read `alg` from the header and pick the verifier from it. RFC 8725 says to fix the allowed algorithms in code.

## You cannot take a JWT back

A JWT is valid until `exp`. There is no server record to delete. A stolen or fired-user token keeps working.

The common fix: a **short access token** (about 10 minutes) plus a **refresh token** that the server stores, rotates on each use, and can revoke.

```svg Access tokens die on their own; refresh tokens can be killed at the server
<svg viewBox="0 0 560 190" role="img" aria-label="Short access token, stored refresh token, and revocation">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="access">
      <rect x="10" y="20" width="150" height="84" fill="var(--surface-2)" stroke="var(--cat-1)" stroke-width="2"/>
      <text x="85" y="44" text-anchor="middle" fill="var(--fg)">Access token</text>
      <text x="85" y="66" text-anchor="middle" fill="var(--fg-muted)" font-size="11">about 10 minutes</text>
      <text x="85" y="84" text-anchor="middle" fill="var(--fg-muted)" font-size="11">no database lookup</text>
      <path d="M160 62 L193 62" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="200,62 193,58 193,66" fill="var(--primary)"/>
    </g>
    <g data-cue="refresh">
      <rect x="205" y="20" width="150" height="84" fill="var(--surface-2)" stroke="var(--cat-2)" stroke-width="2"/>
      <text x="280" y="44" text-anchor="middle" fill="var(--fg)">Refresh token</text>
      <text x="280" y="66" text-anchor="middle" fill="var(--fg-muted)" font-size="11">lives for days</text>
      <text x="280" y="84" text-anchor="middle" fill="var(--fg-muted)" font-size="11">stored, rotated</text>
      <path d="M355 62 L388 62" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="395,62 388,58 388,66" fill="var(--primary)"/>
    </g>
    <g data-cue="revoke">
      <rect x="400" y="20" width="150" height="84" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="475" y="44" text-anchor="middle" fill="var(--fg)">Revoke</text>
      <text x="475" y="66" text-anchor="middle" fill="var(--fg-muted)" font-size="11">delete the stored</text>
      <text x="475" y="84" text-anchor="middle" fill="var(--fg-muted)" font-size="11">refresh token</text>
    </g>
    <text x="10" y="150" fill="var(--fg)">Revoked: no new access tokens. The last one dies within minutes.</text>
  </g>
</svg>
```

```narrate
This is the usual compromise. [[access]] The access token is short lived, around ten minutes, and checked by signature alone, so there is no lookup. [[refresh]] When it expires, the client trades a refresh token for a new one. The server stores the refresh token and replaces it on every use. [[revoke]] To revoke someone, delete the stored refresh token. They get no new access tokens, and the last one dies within minutes.
```

```quiz
q: A user is fired. Their access token has 8 minutes left. What does a short-token plus refresh-token design give you?
options:
  - The token stops working instantly
  - No new access tokens after you revoke the refresh token, and the old one dies within minutes
  - Nothing, you must wait for the refresh token to expire
answer: 1
why: Revoking the stored refresh token blocks renewal. The short access token is the only window left.
```

## JWT or session?

| | Server session | JWT |
|---|---|---|
| State lives | On the server | In the token |
| Revoke now | Delete the record | Hard (wait for exp) |
| Many servers | Shared store | Share the key |
| Best for | One web app and its browser | Several services, APIs, mobile |

> **Not this:** "JWT because it is modern". For a plain web app with a browser, a session cookie is simpler and safer.

> **Trap:** storing a JWT in `localStorage`. XSS reads it. Prefer an `HttpOnly; Secure; SameSite` cookie.

```narrate
When an interviewer asks JWT or sessions, say where the state lives. A session keeps it on the server, so you can revoke instantly, but servers need a shared store. A JWT keeps it in the token, so any service holding the key can verify it, but you cannot take it back. For a normal website with a browser, a session cookie is simpler. And never keep either in local storage.
```

## Your turn

Open `jwt.ts` in your copy. Write the two functions with strict checks.

- `signJwt({ claims, secret })`: header exactly `{"alg":"HS256","typ":"JWT"}`, JSON, base64url without padding, HMAC-SHA256 over `header.payload`
- `verifyJwt({ token, secret, issuer, audience, now })` returns the claims, or **throws**. `now()` is in milliseconds, like `Date.now`
- Checks: three segments, `alg` is exactly `HS256`, signature matches (`timingSafeEqual`), `exp` present and not reached, `nbf`, `iss`, and `aud` (string or list)
- Both functions throw for a secret under 32 bytes

The tests forge tokens by hand: tampered, expired, `alg: none`, and an HS512 token with a perfectly valid signature.

Run the tests from the Run button, or `pnpm lesson test auth/04-jwt-by-hand`.

```hint
Write small helpers first: encode a value to a base64url JSON segment, decode a segment back, and compute the signature of a signing input. Both sign and verify use them.
```

```hint
In verify, go in order: split into three, decode the header and check `alg`, recompute the signature and compare, only then decode the payload. Make one tiny `reject(reason)` that throws, to keep each check a single line.
```

```hint
Compare the signature as text: put both strings in Buffers, check that the lengths match, then call `timingSafeEqual`. For the audience, `[claims.aud].flat().includes(audience)` handles both a string and a list. Divide `now()` by 1000.
```
