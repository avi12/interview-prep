---
title: Password storage
lang: ts
minutes: 25
level: junior
roles: [backend]
files: [password.ts]
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  - https://nodejs.org/docs/latest-v24.x/api/crypto.html
---

## Never store the password

Assume your database will leak one day. Store passwords so that a leak is not a disaster.

| Way of storing | After a leak |
|---|---|
| Plain text | Every password is exposed |
| **Encrypted** | Reversible. Whoever finds the key gets every password |
| **Hashed** | One-way. The attacker can only guess and check |

You never need the original password. You only need to check a guess. A one-way function is exactly that.

> **Not this:** encryption. It is built to be undone, and you never need to undo it.

```narrate
Assume your database will leak one day. Plain text gives away every password at once. Encryption can be reversed, so whoever finds the key gets everything. A hash only goes one way. You never need the original password, only a way to check a guess, and that is what a hash gives you.
```

## Salt: same password, different hash

Many people pick the same password. Without a **salt**, they all get the same hash, and one cracked hash opens every account that shares it. Precomputed tables of common passwords work too.

A salt is random bytes, new for **each user**, mixed in before hashing. It is stored next to the hash and is **not secret**.

```svg Without a salt equal passwords look equal in the database; with a salt every row is different
<svg viewBox="0 0 520 210" role="img" aria-label="Two users with the same password, without and with a salt">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="same">
      <text x="10" y="26" fill="var(--fg-muted)">no salt</text>
      <rect x="10" y="40" width="240" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="20" y="61" fill="var(--fg)">alice</text>
      <text x="76" y="61" fill="var(--fg)">hunter2</text>
      <text x="190" y="61" fill="var(--fg)">-> X</text>
      <rect x="10" y="80" width="240" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="20" y="101" fill="var(--fg)">bob</text>
      <text x="76" y="101" fill="var(--fg)">hunter2</text>
      <text x="190" y="101" fill="var(--fg)">-> X</text>
      <text x="10" y="140" fill="var(--fg)">same digest: crack one, get both</text>
    </g>
    <g data-cue="salted">
      <text x="270" y="26" fill="var(--fg-muted)">random salt per user</text>
      <rect x="270" y="40" width="240" height="32" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="280" y="61" fill="var(--fg)">alice</text>
      <text x="330" y="61" fill="var(--fg)">salt-A + hunter2</text>
      <text x="468" y="61" fill="var(--fg)">-> Y</text>
      <rect x="270" y="80" width="240" height="32" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="280" y="101" fill="var(--fg)">bob</text>
      <text x="330" y="101" fill="var(--fg)">salt-B + hunter2</text>
      <text x="468" y="101" fill="var(--fg)">-> Z</text>
      <text x="270" y="140" fill="var(--fg)">different digests: one at a time</text>
    </g>
    <g data-cue="open">
      <text x="10" y="186" fill="var(--fg-muted)">The salt sits next to the hash. It is not a secret.</text>
    </g>
  </g>
</svg>
```

```narrate
Two users, same password. [[same]] On the left there is no salt, so both rows show the same digest. Crack one and you have both, and precomputed tables work. [[salted]] On the right every user gets a random salt, so the digests all differ, and each one must be attacked on its own. [[open]] The salt is stored in the open, right next to the hash. It only has to be unique.
```

> **Why:** a salt does not make one guess harder. It makes the attacker pay for every user separately.

```quiz
q: Two users pick the same password and the system uses a random salt per user. What does the database show?
options:
  - Two identical hashes
  - Two different hashes
  - One hash shared by both
answer: 1
why: The salt differs per user, so the same password produces a different hash for each of them.
```

## Slow on purpose

A fast hash like SHA-256 is built to be quick. A graphics card tries billions of guesses per second. A password hash is built to be **slow and memory hungry**: you pay once per login, the attacker pays per guess.

| Algorithm | OWASP minimum | Use it when |
|---|---|---|
| **Argon2id** | 19 MiB memory, 2 passes, 1 lane | First choice |
| scrypt | N = 2^17 (128 MiB), r = 8, p = 1 | Argon2id unavailable |
| bcrypt | work factor 10 or more, 72 byte limit | Legacy systems |
| PBKDF2-SHA256 | 600,000 iterations | FIPS compliance |

Node 24.7 and newer also has `crypto.argon2`. This lesson uses scrypt: same shape, older Node has it too.

> **Not this:** `sha256(password + salt)`. Salted, but still fast.

> **Trap:** Node's scrypt default is N = 2^14 with a 32 MiB `maxmem`. OWASP's N = 2^17 needs 128 MiB, so Node throws "memory limit exceeded" until you raise `maxmem`.

```narrate
A fast hash is the wrong tool. A graphics card can try billions of guesses per second against sha two fifty-six. A password hash is slow and hungry for memory on purpose. Your user waits a fraction of a second once. An attacker pays that price for every single guess. OWASP names Argon two I D first, then scrypt, then bcrypt for legacy systems.
```

```quiz
q: Why is a SLOW hash good for passwords?
options:
  - It makes the stored value shorter
  - Every guess costs the attacker time, so cracking a leaked database takes far longer
  - It lets the server skip the salt
answer: 1
why: A login pays the cost once. An attacker making billions of guesses pays it billions of times.
```

## The stored string, and a safe compare

Keep the settings **inside** the stored string. Later you can raise the cost, and old hashes still verify with their own settings.

```svg One string carries everything verify needs, except the password
<svg viewBox="0 0 560 190" role="img" aria-label="The parts of a stored password string">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="algorithm">
      <rect x="10" y="30" width="80" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="50" y="55" text-anchor="middle" fill="var(--fg)">scrypt</text>
      <text x="50" y="92" text-anchor="middle" fill="var(--fg-muted)" font-size="11">algorithm</text>
    </g>
    <g data-cue="settings">
      <text x="98" y="55" fill="var(--fg-muted)">$</text>
      <rect x="112" y="30" width="120" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="172" y="55" text-anchor="middle" fill="var(--fg)">16384$8$1</text>
      <text x="172" y="92" text-anchor="middle" fill="var(--fg-muted)" font-size="11">cost settings</text>
    </g>
    <g data-cue="salt">
      <text x="240" y="55" fill="var(--fg-muted)">$</text>
      <rect x="254" y="30" width="120" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="314" y="55" text-anchor="middle" fill="var(--fg)">salt</text>
      <text x="314" y="92" text-anchor="middle" fill="var(--fg-muted)" font-size="11">random, not secret</text>
    </g>
    <g data-cue="hash">
      <text x="382" y="55" fill="var(--fg-muted)">$</text>
      <rect x="396" y="30" width="150" height="40" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="471" y="55" text-anchor="middle" fill="var(--fg)">hash</text>
      <text x="471" y="92" text-anchor="middle" fill="var(--fg-muted)" font-size="11">the proof</text>
    </g>
    <text x="10" y="150" fill="var(--fg)">verify = derive again, then compare</text>
  </g>
</svg>
```

```narrate
This is the whole stored value. [[algorithm]] First the algorithm name. [[settings]] Then the cost settings it used. [[salt]] Then the random salt. [[hash]] And last the hash itself, the only part that proves anything. To verify, read the settings, derive the key again from the guess, and compare. Use timing safe equal, because a normal comparison stops at the first wrong byte and leaks timing.
```

> **Why:** `timingSafeEqual` takes the same time wherever the bytes differ. It throws if the lengths differ, so derive the key at the stored hash's length.

> **Trap:** bcrypt only reads the first 72 bytes of a password. Do not silently truncate passwords yourself either.

## Your turn

Open `password.ts` in your copy. It exports two async functions.

- `hashPassword({ password, salt?, params? })` returns `scrypt$cost$blockSize$parallelization$salt$hash`. Salt and hash are standard base64, the key is 32 bytes, and a missing salt means 16 random bytes
- `verifyPassword({ password, stored })` reads the settings **from the string**, derives again, and compares with `timingSafeEqual`
- Anything that is not a valid stored string returns `false`. It never throws

Run the tests from the Run button, or `pnpm lesson test auth/02-password-storage`.

```hint
`deriveKey(password, salt, KEY_BYTES, options)` returns a Buffer. The option names are `cost`, `blockSize`, `parallelization` and `maxmem`.
```

```hint
hashPassword joins six parts with SEPARATOR. verifyPassword splits the string, checks for six parts and the name scrypt, turns the three settings into numbers, and derives with the same length as the stored hash.
```

```hint
scrypt needs about 128 * cost * blockSize bytes, so pass twice that as maxmem or the OWASP-sized test throws. Add `.catch(() => null)` on the derive call so bad settings return false, then compare with `timingSafeEqual(key, hash)`.
```
