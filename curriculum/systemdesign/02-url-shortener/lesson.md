---
title: URL shortener
lang: ts
minutes: 25
level: junior
roles: [backend]
files: [shortener.ts]
sources:
  - https://www.hellointerview.com/learn/system-design/problem-breakdowns/bitly
  - https://github.com/donnemartin/system-design-primer
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections
  - https://www.rfc-editor.org/rfc/rfc9110.html#name-301-moved-permanently
  - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html
---

## The question and its two calls

Design a service that turns a long link into `sho.rt/aZ3x9Q`, and sends visitors from the short link to the long one.

- `POST /urls` with `{ longUrl }` returns the short URL
- `GET /{code}` returns a redirect

Ask first: custom aliases? Expiry? Click counts? Then say the shape of the traffic: clicks outnumber new links by about **1,000 to 1**.

> **Why:** a read-heavy system is designed around its read path. Say the ratio in step 1, and every later choice (cache, replicas) has a reason.

```narrate
This is the classic first design question. You need two calls: create a short link, and follow a short link. Before drawing anything, ask about custom names, expiry, and click counts. Then say the key fact out loud: people click links about a thousand times for every link that is created. That one number shapes the whole design.
```

## How long must the code be?

Short codes are **numbers written in base 62**: the digits, then A to Z, then a to z. Standard base64 adds `+` and `/`, which are not safe inside a URL path.

| Characters | Codes (62 to the n) |
|---|---|
| 5 | 916 million |
| 6 | 56.8 billion |
| 7 | 3.5 trillion |
| 8 | 218 trillion |

For 1 billion links, 6 characters fit. Many designs choose 7 for headroom.

```svg Encoding turns a number into digits by dividing by 62 and keeping each remainder
<svg viewBox="0 0 640 244" role="img" aria-label="Encoding 1000 in base 62 by dividing by 62 and keeping the remainders" font-family="var(--font-mono)" font-size="13">
<g data-cue="first">
<rect x="10" y="34" width="96" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="58" y="60.6" font-size="13" fill="var(--fg)" text-anchor="middle">1000</text>
<text x="126" y="61" font-size="14" fill="var(--fg)" text-anchor="start">1000 = 16 x 62 + 8</text>
<path d="M330 56 L396 56" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="396,56 386,61 386,51" fill="var(--fg)"/>
<rect x="396" y="34" width="130" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="461" y="52.6" font-size="13" fill="var(--fg)" text-anchor="middle">8</text>
<text x="461" y="68.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">remainder 8</text>
</g>
<g data-cue="second">
<path d="M58 78 L58 112" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="58,112 53,102 63,102" fill="var(--fg)"/>
<text x="70" y="100" font-size="12" fill="var(--fg-muted)" text-anchor="start">quotient 16</text>
<rect x="10" y="112" width="96" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="58" y="138.6" font-size="13" fill="var(--fg)" text-anchor="middle">16</text>
<text x="126" y="139" font-size="14" fill="var(--fg)" text-anchor="start">16 = 0 x 62 + 16</text>
<path d="M330 134 L396 134" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="396,134 386,139 386,129" fill="var(--fg)"/>
<rect x="396" y="112" width="130" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="461" y="130.6" font-size="13" fill="var(--fg)" text-anchor="middle">G</text>
<text x="461" y="146.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">remainder 16</text>
</g>
<g data-cue="result">
<text x="10" y="205" font-size="13" fill="var(--fg)" text-anchor="start">Quotient 0, so stop. Read digits last to first:</text>
<rect x="396" y="184" width="44" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="418" y="206.6" font-size="13" fill="var(--fg)" text-anchor="middle">G</text>
<rect x="440" y="184" width="44" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="462" y="206.6" font-size="13" fill="var(--fg)" text-anchor="middle">8</text>
<text x="496" y="207" font-size="14" fill="var(--fg)" text-anchor="start" font-weight="700">= G8</text>
</g>
</svg>
```

```narrate
A short code is just a number written with sixty two symbols instead of ten. To encode one thousand, [[first]] divide by sixty two. You get sixteen, with a remainder of eight, so the last digit is eight. [[second]] Now divide sixteen by sixty two. The quotient is zero and the remainder is sixteen, which is the capital letter G. [[result]] Read the digits from last to first, and the code is capital G, then eight.
```

> **Not this:** hex or standard base64 codes. Hex needs 10 characters to reach 1 trillion. Standard base64 has two symbols that need escaping in a URL. (Base64url swaps them for `-` and `_` and works, but base62 is plainer to read and type.)

```quiz
q: You expect 1 billion short links. What is the smallest code length that can hold them all in base 62?
options:
  - 5 characters
  - 6 characters
  - 8 characters
answer: 1
why: 62 to the 5th is 916 million, which is too small. 62 to the 6th is 56.8 billion, which fits.
```

## Where does the number come from?

Two honest answers. Pick one, then say what you give up.

| | Hash the URL | Counter |
|---|---|---|
| How | SHA-256 the URL, take a number, base62 it | Atomic increment (Redis `INCR`), base62 it |
| Collisions | Possible, so you must handle them | None |
| Same URL twice | Same code, free dedupe | A new code each time |
| Guessable | Not by itself | Yes, codes arrive in order |
| Catch | Retry logic | One counter to scale: hand out blocks of ids |

```svg Both lanes end at the same base62 step
<svg viewBox="0 0 640 190" role="img" aria-label="Two ways to get a number, one way to turn it into a code" font-family="var(--font-mono)" font-size="13">
<g data-cue="hash">
<text x="10" y="20" font-size="12" fill="var(--fg-muted)" text-anchor="start">HASH THE URL</text>
<rect x="10" y="28" width="104" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="62" y="57.2" font-size="12" fill="var(--fg)" text-anchor="middle">long URL</text>
<path d="M114 53 L138 53" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="138,53 128,58 128,48" fill="var(--fg)"/>
<rect x="138" y="28" width="104" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="190" y="57.2" font-size="12" fill="var(--fg)" text-anchor="middle">SHA-256</text>
<path d="M242 53 L266 53" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="266,53 256,58 256,48" fill="var(--fg)"/>
<rect x="266" y="28" width="104" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="318" y="49.2" font-size="12" fill="var(--fg)" text-anchor="middle">number</text>
<text x="318" y="65.2" font-size="12" fill="var(--fg)" text-anchor="middle">mod 62^7</text>
<path d="M370 53 L394 53" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="394,53 384,58 384,48" fill="var(--fg)"/>
</g>
<g data-cue="base62">
<rect x="394" y="28" width="104" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="446" y="57.2" font-size="12" fill="var(--fg)" text-anchor="middle">base62</text>
<path d="M498 53 L522 53" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="522,53 512,58 512,48" fill="var(--fg)"/>
<rect x="522" y="28" width="104" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="57.2" font-size="12" fill="var(--fg)" text-anchor="middle">7-char code</text>
</g>
<g data-cue="counter">
<text x="10" y="110" font-size="12" fill="var(--fg-muted)" text-anchor="start">COUNTER</text>
<rect x="10" y="118" width="104" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="62" y="139.2" font-size="12" fill="var(--fg)" text-anchor="middle">counter</text>
<text x="62" y="155.2" font-size="12" fill="var(--fg)" text-anchor="middle">plus 1</text>
<path d="M114 143 L138 143" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="138,143 128,148 128,138" fill="var(--fg)"/>
<rect x="138" y="118" width="104" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="190" y="147.2" font-size="12" fill="var(--fg)" text-anchor="middle">number</text>
<path d="M242 143 L266 143" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="266,143 256,148 256,138" fill="var(--fg)"/>
</g>
<g data-cue="base62">
<rect x="266" y="118" width="104" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="318" y="147.2" font-size="12" fill="var(--fg)" text-anchor="middle">base62</text>
<path d="M370 143 L394 143" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="394,143 384,148 384,138" fill="var(--fg)"/>
<rect x="394" y="118" width="104" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="446" y="147.2" font-size="12" fill="var(--fg)" text-anchor="middle">7-char code</text>
</g>
</svg>
```

```narrate
Here are two ways to get the number. [[hash]] Hash the long address, and turn the hash into a number that fits in seven characters. [[counter]] Or keep a counter and add one for every new link. [[base62]] Either way the number goes through the same base sixty two step, and out comes a short code. Hashing needs collision handling. A counter has none, but its codes come in order, so they are easy to guess.
```

> **Not this:** the first few characters of the URL, or a random string with no uniqueness check. Many URLs share a prefix, and random strings collide eventually.

## Collisions: let the store decide

Two different URLs can land on the same code. At 1 billion links, about 1 in 3,500 new links collides. A silent overwrite would send someone's click to the wrong site.

1. Build the code from `hash(url, attempt)`
2. Insert it with an **insert-if-absent** rule (a `UNIQUE` constraint)
3. Taken by the same URL: return it. Taken by another: try `attempt + 1`
4. After about 5 attempts, give up with an error

```svg The store refuses a taken code in one atomic step, so the app simply tries the next attempt
<svg viewBox="0 0 640 338" role="img" aria-label="Shorten with a collision: the store refuses a taken code, so the app tries the next attempt" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 332" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client</text>
<path d="M320 38 L320 332" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="260" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">App server</text>
<path d="M574 38 L574 332" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="16.6" font-size="13" fill="var(--fg)" text-anchor="middle">Store</text>
<text x="574" y="32.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">UNIQUE code</text>
<g data-cue="request">
<path d="M68 76.5 L318 76.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="318,76.5 308,81.5 308,71.5" fill="var(--fg)"/>
<text x="193" y="69.5" font-size="12" fill="var(--fg)" text-anchor="middle">POST /urls</text>
</g>
<g data-cue="first">
<path d="M320 93.5 L358 93.5 L358 110.5 L322 110.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,110.5 332,105.5 332,115.5" fill="var(--fg)"/>
<text x="366" y="98.5" font-size="12" fill="var(--fg)" text-anchor="start">Ab3 = hash(url, 0)</text>
</g>
<g data-cue="first">
<path d="M322 144.5 L572 144.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,144.5 562,149.5 562,139.5" fill="var(--fg)"/>
<text x="447" y="137.5" font-size="12" fill="var(--fg)" text-anchor="middle">insert Ab3 if absent</text>
</g>
<g data-cue="taken">
<path d="M572 178.5 L322 178.5" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="322,178.5 332,173.5 332,183.5" fill="var(--danger)"/>
<text x="447" y="171.5" font-size="12" fill="var(--fg)" text-anchor="middle">taken by another URL</text>
</g>
<g data-cue="second">
<path d="M320 195.5 L358 195.5 L358 212.5 L322 212.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,212.5 332,207.5 332,217.5" fill="var(--fg)"/>
<text x="366" y="200.5" font-size="12" fill="var(--fg)" text-anchor="start">Xy9 = hash(url, 1)</text>
</g>
<g data-cue="second">
<path d="M322 246.5 L572 246.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,246.5 562,251.5 562,241.5" fill="var(--fg)"/>
<text x="447" y="239.5" font-size="12" fill="var(--fg)" text-anchor="middle">insert Xy9 if absent</text>
</g>
<g data-cue="second">
<path d="M572 280.5 L322 280.5" fill="none" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="322,280.5 332,275.5 332,285.5" fill="var(--ok)"/>
<text x="447" y="273.5" font-size="12" fill="var(--fg)" text-anchor="middle">inserted</text>
</g>
<g data-cue="done">
<path d="M318 314.5 L68 314.5" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="68,314.5 78,309.5 78,319.5" fill="var(--ok)"/>
<text x="193" y="307.5" font-size="12" fill="var(--fg)" text-anchor="middle">201 short URL Xy9</text>
</g>
</svg>
```

```narrate
Watch a collision. [[request]] A client posts a long address. [[first]] The app hashes it with attempt zero and asks the store to insert the code, but only if it is absent. [[taken]] The store says this code belongs to another address. [[second]] So the app hashes again with attempt one, gets a new code, and the insert succeeds. [[done]] The client receives the short link.
```

> **Trap:** check first, then insert. Two servers check at the same moment, both see "free", both insert, and one silently overwrites the other. Let one atomic insert (a single step nobody can interrupt) decide.

## Reads: the redirect path

With 1,000 reads per write, almost every click should be answered **from memory**. This is cache-aside: look in the cache, on a miss read the database, then fill the cache.

| Redirect | Browser behavior | You keep |
|---|---|---|
| `301` permanent | May cache it, later clicks skip you | Speed, but no click counts or changes |
| `302` temporary | Not cached unless you allow it | Control: count, change, expire |

```svg The first click fills the cache. Every later click skips the database
<svg viewBox="0 0 640 338" role="img" aria-label="A redirect read: cache miss goes to the database, the next click is a cache hit" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 332" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Browser</text>
<path d="M235.3 38 L235.3 332" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="175.3" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="235.3" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">App server</text>
<path d="M404.7 38 L404.7 332" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="344.7" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="404.7" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<path d="M574 38 L574 332" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<g data-cue="click">
<path d="M68 76.5 L233.3 76.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="233.3,76.5 223.3,81.5 223.3,71.5" fill="var(--fg)"/>
<text x="150.7" y="69.5" font-size="12" fill="var(--fg)" text-anchor="middle">GET /Xy9</text>
</g>
<g data-cue="click">
<path d="M237.3 110.5 L402.7 110.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="402.7,110.5 392.7,115.5 392.7,105.5" fill="var(--fg)"/>
<text x="320" y="103.5" font-size="12" fill="var(--fg)" text-anchor="middle">get Xy9</text>
</g>
<g data-cue="miss">
<path d="M402.7 144.5 L237.3 144.5" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="237.3,144.5 247.3,139.5 247.3,149.5" fill="var(--danger)"/>
<text x="320" y="137.5" font-size="12" fill="var(--fg)" text-anchor="middle">miss</text>
</g>
<g data-cue="miss">
<path d="M237.3 178.5 L572 178.5" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,178.5 562,183.5 562,173.5" fill="var(--fg)"/>
<text x="320" y="171.5" font-size="12" fill="var(--fg)" text-anchor="middle">SELECT by code</text>
</g>
<g data-cue="miss">
<path d="M572 212.5 L237.3 212.5" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="237.3,212.5 247.3,207.5 247.3,217.5" fill="var(--fg)"/>
<text x="320" y="205.5" font-size="12" fill="var(--fg)" text-anchor="middle">long URL</text>
</g>
<g data-cue="fill">
<path d="M237.3 246.5 L402.7 246.5" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="402.7,246.5 392.7,251.5 392.7,241.5" fill="var(--ok)"/>
<text x="320" y="239.5" font-size="12" fill="var(--fg)" text-anchor="middle">set, TTL 1 day</text>
</g>
<g data-cue="fill">
<path d="M233.3 280.5 L68 280.5" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="68,280.5 78,275.5 78,285.5" fill="var(--ok)"/>
<text x="150.7" y="273.5" font-size="12" fill="var(--fg)" text-anchor="middle">302 + long URL</text>
</g>
<g data-cue="hit">
<rect x="92" y="293.5" width="456" height="27" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="310.5" font-size="12" fill="var(--fg)" text-anchor="middle">Next click: get Xy9 is a hit. The database is never touched.</text>
</g>
</svg>
```

```narrate
Follow a click. [[click]] The browser asks the app for the code, and the app asks the cache first. [[miss]] The cache misses, so the app reads the database and gets the long address. [[fill]] It stores the answer in the cache with an expiry, and replies with a redirect. [[hit]] The next click for this code is a cache hit, and the database is never touched.
```

> **Why:** use an LRU cache so popular links stay in memory and rare ones fall out. Set the cache expiry no later than the link's own expiry.

```quiz
q: Why do most shorteners answer with 302 and not 301?
options:
  - 302 is faster for the browser
  - 302 keeps every click coming to you, so you can count, change or expire links
  - Browsers cannot follow a 301
answer: 1
why: A 301 may be cached by the browser, so later clicks never reach your server. A 302 keeps you in control.
```

## Your turn

Open `shortener.ts` and make the tests pass. The file already has the alphabet, `CODE_SPACE`, `MAX_ATTEMPTS` and a real `sha256Hash`.

- `encodeBase62(id)` and `decodeBase62(code)` are inverses. `0` encodes as `"0"`
- `shorten` uses the code `encodeBase62(hash({ longUrl, attempt }) % CODE_SPACE)`, with `attempt` starting at 0
- Write only through `store.setIfAbsent`. If the code is taken by the **same** URL, return it
- After `MAX_ATTEMPTS` collisions, throw an `Error`

Run the tests from the Run button, or `pnpm lesson test systemdesign/02-url-shortener`.

```hint
For encode, repeat: take `rest % BASE` as a digit, put it in front of the code, then `rest = Math.floor(rest / BASE)`. Stop when `rest` is 0, and handle `0` first.
```

```hint
For decode, walk the characters left to right: `id = id * BASE + ALPHABET.indexOf(char)`.
```

```hint
In shorten, loop `attempt` from 0 to `MAX_ATTEMPTS - 1`. If `setIfAbsent` returns true, return the code. Otherwise, if `store.get(code) === longUrl`, return the code. After the loop, throw.
```
