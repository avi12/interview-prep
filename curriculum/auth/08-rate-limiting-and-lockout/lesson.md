---
title: Rate limiting and lockout
lang: ts
minutes: 25
level: junior
roles: [backend]
files: [limiter.ts]
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
  - https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
---

## What attackers try on a login

| Attack | Shape |
|---|---|
| **Brute force** | Many passwords against one account |
| **Credential stuffing** | Username and password pairs leaked from another site, tried against yours |
| **Code and reset abuse** | Guessing one-time codes, or flooding a victim with reset messages |

All of them need **many attempts**. A rate limit makes each attempt cost time.

It also protects you. A password hash is slow on purpose, so an unlimited login endpoint is a cheap way to burn your CPU.

```narrate
Three attacks hit a login. Brute force tries many passwords on one account. Credential stuffing tries pairs of names and passwords leaked from other sites. Code and reset abuse guesses one-time codes or floods a victim with reset messages. All of them need many attempts, so a rate limit turns every attempt into a cost. It also protects your server, because hashing passwords is deliberately expensive work.
```

## Token bucket

Each key (an account, an IP) gets a **bucket** of tokens. A request takes one. Tokens drip back at a fixed rate, up to the bucket's capacity.

```svg A full bucket allows a short burst; an empty bucket blocks until a token drips back
<svg viewBox="0 0 560 190" role="img" aria-label="A token bucket: tokens refill, each request takes one, an empty bucket answers 429">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="refill">
      <text x="10" y="20" fill="var(--fg)">+1 token every second</text>
      <path d="M120 28 L120 52" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <polygon points="120,60 116,52 124,52" fill="var(--accent-2)"/>
    </g>
    <g data-cue="bucket">
      <rect x="30" y="66" width="180" height="90" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <circle cx="58" cy="108" r="12" fill="var(--primary)"/>
      <circle cx="90" cy="108" r="12" fill="var(--primary)"/>
      <circle cx="122" cy="108" r="12" fill="var(--primary)"/>
      <circle cx="154" cy="108" r="12" fill="none" stroke="var(--border)" stroke-width="2"/>
      <circle cx="186" cy="108" r="12" fill="none" stroke="var(--border)" stroke-width="2"/>
      <text x="120" y="178" text-anchor="middle" fill="var(--fg-muted)" font-size="11">capacity 5, holds at most 5</text>
    </g>
    <g data-cue="take">
      <path d="M210 88 L289 88" stroke="var(--ok)" stroke-width="2" fill="none"/>
      <polygon points="296,88 289,84 289,92" fill="var(--ok)"/>
      <rect x="296" y="70" width="254" height="36" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="308" y="92" fill="var(--fg)">takes 1 token: allowed</text>
    </g>
    <g data-cue="empty">
      <path d="M210 144 L289 144" stroke="var(--danger)" stroke-width="2" fill="none"/>
      <polygon points="296,144 289,140 289,148" fill="var(--danger)"/>
      <rect x="296" y="118" width="254" height="52" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="308" y="141" fill="var(--fg)">no token left: 429</text>
      <text x="308" y="159" fill="var(--fg-muted)">Retry-After: 3</text>
    </g>
  </g>
</svg>
```

```narrate
Each key gets a bucket. [[refill]] Tokens drip in at a fixed rate. [[bucket]] The bucket holds at most its capacity, here five, so a user who was away cannot save up a huge burst. [[take]] Every request takes one token and is allowed. [[empty]] With the bucket empty, the server answers four twenty-nine, too many requests, and a retry after header says how many seconds to wait.
```

> **Why:** a real user who mistypes twice still gets in, because of the burst. An attacker is held to the refill rate, forever.

## Why not a fixed window?

A fixed window counts requests per clock minute and resets at the edge. The edge is the flaw.

```svg A limit of 5 per minute can let 10 through in two seconds
<svg viewBox="0 0 560 170" role="img" aria-label="Five requests at the end of one minute and five at the start of the next">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="windows">
      <rect x="10" y="30" width="270" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="50" fill="var(--fg-muted)">minute 1: limit 5</text>
      <rect x="280" y="30" width="270" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="290" y="50" fill="var(--fg-muted)">minute 2: limit 5</text>
    </g>
    <g data-cue="burst">
      <rect x="220" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="230" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="240" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="250" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="260" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="292" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="302" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="312" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="322" y="56" width="6" height="20" fill="var(--danger)"/>
      <rect x="332" y="56" width="6" height="20" fill="var(--danger)"/>
      <path d="M216 92 L216 100 L340 100 L340 92" stroke="var(--danger)" stroke-width="2" fill="none"/>
      <text x="278" y="120" text-anchor="middle" fill="var(--danger)">10 requests in about 2 seconds</text>
    </g>
    <g data-cue="smooth">
      <text x="10" y="156" fill="var(--ok)">token bucket: never more than its capacity at once</text>
    </g>
  </g>
</svg>
```

```narrate
[[windows]] A fixed window counts requests inside each clock minute and starts again at zero on the boundary. [[burst]] An attacker waits for the edge. They spend the whole allowance just before the reset and again just after it. That is ten requests in about two seconds against a limit of five per minute. [[smooth]] A token bucket never holds more than its capacity, so there is no edge to exploit.
```

> **Not this:** a fixed-window counter for logins. The reset gives attackers a double allowance every minute.

```quiz
q: A fixed window allows 5 requests per clock minute. What is the most that can pass in 2 seconds around the boundary?
options:
  - 5
  - 10
  - 2
answer: 1
why: Five at the end of the first minute, then the counter resets and five more pass at the start of the second.
```

## A lockout can lock out the victim

**Hard lockout:** after 5 wrong passwords, lock the account for a day. The attacker simply fails 5 times on **your** account, and the real owner is out. OWASP warns that lockout can be abused for denial of service.

Safer:

- **Slow down, don't lock.** A bucket per account: wait seconds or minutes, then try again
- **Limit two ways:** per account (slows any attacker, even a spread-out one) and per IP (one machine cannot try many accounts)
- Let **password reset** still work for a throttled account
- Block known-breached passwords. Offer MFA (multi-factor authentication)

> **Not this:** an unlimited login, or a permanent lockout. One helps the guesser, the other helps the troll.

```narrate
A hard lockout hands attackers a weapon. They fail five times on your account and the real owner is locked out. OWASP calls this a denial of service risk. Slow down instead of locking. Keep a bucket per account, so any attacker is slowed, and another per I P address, so one machine cannot spray many accounts. Keep password reset working for throttled accounts, and block passwords that already appeared in breaches.
```

## Say the same thing, in the same time

If the login says "no such user" for one case and "wrong password" for another, attackers learn which emails have accounts. This is **user enumeration**.

- Same message: `Login failed; invalid user ID or password.`
- Same status code and same body shape
- Same **time**: for an unknown user, still hash a dummy password, so a fast answer does not give them away
- Same for password reset: "If that address is in our database, we will email you a link."

> **Trap:** the registration form that says "this email is already taken". Use a neutral message and email the owner.

```narrate
If the login says no such user in one case and wrong password in another, attackers learn which emails have accounts. That is user enumeration. Give one message for both. Keep the status code and the response shape the same. Keep the time the same too: for an unknown user, still hash a dummy password, so a quick answer does not give the game away. Password reset and sign up need the same treatment.
```

```quiz
q: Which login failure message is safest?
options:
  - No account with that email
  - Wrong password
  - Invalid email or password
answer: 2
why: It is identical whether the email exists or not, so it tells the attacker nothing about which accounts exist.
```

## Your turn

Open `limiter.ts` in your copy. Write `createTokenBucketLimiter({ capacity, refillPerSecond, now })`. It returns `{ tryConsume(key) }`, which returns `{ isAllowed, retryAfterSeconds }`.

- A new key starts **full**
- Refill from elapsed time: `tokens = min(capacity, tokens + seconds * refillPerSecond)`. No timers
- Allowed: take one token, `retryAfterSeconds` is `0`
- Blocked: take nothing. `retryAfterSeconds` is the whole seconds until one full token exists, **rounded up**
- `now()` returns milliseconds. The tests inject a fake clock

Run the tests from the Run button, or `pnpm lesson test auth/08-rate-limiting-and-lockout`.

```hint
Keep a Map from key to `{ tokens, updatedAt }`. On each call, read `now()`, compute the refilled token count, then decide.
```

```hint
Save the new `tokens` and `updatedAt` on blocked calls too, and keep the fractional tokens. If you throw the fraction away, a caller who retries often never gets a token.
```

```hint
When blocked: `Math.ceil((1 - tokens) / refillPerSecond)`. When allowed, store `tokens - 1`.
```
