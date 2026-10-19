---
title: XSS, CSRF and clickjacking
lang: ts
minutes: 30
level: junior
roles: [backend]
files: [defenses.ts]
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
  - https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS
  - https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
---

## XSS: your page runs the attacker's code

**XSS** (cross-site scripting) happens when your site puts attacker-written text into a page **without encoding it**. The browser cannot tell your script from theirs.

- **Stored:** saved first (a comment), shown to everyone later
- **Reflected:** echoed straight from the URL
- **DOM-based:** browser code writes it with `innerHTML`

```svg Text that should be shown as text gets built into the page as markup
<svg viewBox="0 0 560 190" role="img" aria-label="A comment containing a script tag is inserted raw into the page and runs in the victim's browser">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="input">
      <rect x="10" y="16" width="160" height="78" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="90" y="38" text-anchor="middle" fill="var(--fg)">Attacker posts</text>
      <text x="90" y="56" text-anchor="middle" fill="var(--fg)">a comment:</text>
      <text x="90" y="78" text-anchor="middle" fill="var(--danger)" font-size="11">&lt;script&gt;x()&lt;/script&gt;</text>
      <path d="M170 55 L193 55" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="200,55 193,51 193,59" fill="var(--primary)"/>
    </g>
    <g data-cue="page">
      <rect x="200" y="16" width="160" height="78" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="38" text-anchor="middle" fill="var(--fg)">Server builds</text>
      <text x="280" y="56" text-anchor="middle" fill="var(--fg)">the page and adds</text>
      <text x="280" y="74" text-anchor="middle" fill="var(--fg)">the comment raw</text>
      <path d="M360 55 L383 55" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="390,55 383,51 383,59" fill="var(--primary)"/>
    </g>
    <g data-cue="run">
      <rect x="390" y="16" width="160" height="78" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="470" y="38" text-anchor="middle" fill="var(--fg)">Victim's browser</text>
      <text x="470" y="56" text-anchor="middle" fill="var(--fg)">runs it as code</text>
      <text x="470" y="74" text-anchor="middle" fill="var(--fg)">on your site</text>
      <text x="10" y="132" fill="var(--fg)">It can read the page and call your API as the victim.</text>
      <text x="10" y="152" fill="var(--fg-muted)">HttpOnly hides the cookie, but not the actions.</text>
    </g>
  </g>
</svg>
```

```narrate
[[input]] An attacker posts a comment that contains a script tag. [[page]] Your server builds the page and drops the comment in as it is, raw. [[run]] The victim's browser cannot tell your code from theirs, so it runs the script with the full power of your site. It can read the page and call your interface as the victim. Even an HttpOnly cookie only hides the cookie, not the actions.
```

## Stop XSS: encode on output

Turn the five special characters into **entities** (codes like `&lt;` that the browser shows as a character) at the moment you write text into HTML. The browser then shows them, and never runs them.

| Character | Becomes |
|---|---|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

Also **quote attribute values**. Modern frameworks (React, Svelte) do this for `{value}`, but `innerHTML`, `dangerouslySetInnerHTML` and Svelte's `{@html}` skip it. If users must write HTML, run it through a sanitizer such as DOMPurify.

> **Why:** the right encoding depends on where the text lands (HTML, attribute, JavaScript, URL). So encode at **output**, not when saving.

> **Not this:** strip `<script>` from the input. `<img src=x onerror=...>` runs code without it.

```narrate
Fix it where the text meets the page. Turn the five special characters, the ampersand, the two angle brackets and the two quote marks, into entities. The browser then displays them instead of running them. Always quote attribute values. Frameworks do this for you, until you reach for inner H T M L. If users must write markup, use a sanitizer. Do not try to filter input; the right encoding depends on where the text lands.
```

```quiz
q: A user's display name is stored in the database. When should you HTML-encode it?
options:
  - Before saving it, once
  - When writing it into the HTML page
  - In the browser, before the form is sent
answer: 1
why: The same name may later go into HTML, an attribute or JSON. Each needs its own encoding, so encode at the point of output.
```

## CSP: a seat belt

A **Content Security Policy** is a response header telling the browser which scripts may run. A **nonce** is a random one-time value. With a nonce policy, only scripts carrying the current nonce run, so injected inline scripts are blocked.

```http
Content-Security-Policy: default-src 'self'; script-src 'nonce-R4nd0m'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

- The nonce is **new and unpredictable for every response**
- Try it first with `Content-Security-Policy-Report-Only`

> **Why:** OWASP and MDN call CSP defense in depth. If encoding fails somewhere, CSP can still stop the script.

> **Not this:** `'unsafe-inline'`. It allows exactly the injected inline script you wanted to block.

```narrate
A content security policy is a header that tells the browser which scripts it may run. With a nonce, the page marks its own scripts with a fresh random value on every response. An injected script has no nonce, so the browser refuses it. Test with report only mode first. Treat it as a seat belt, not as the brakes. Encoding is still the main defense. And never allow unsafe inline.
```

## CSRF: the browser sends your cookie

**CSRF** (cross-site request forgery): another site makes **your browser** send a request to a site where you are logged in. The browser attaches that site's cookie automatically.

```svg The attacker never sees your cookie; your browser attaches it
<svg viewBox="0 0 560 190" role="img" aria-label="A hidden form on another site posts to the bank, and the browser adds the bank cookie">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="loggedin">
      <rect x="10" y="16" width="160" height="78" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="90" y="38" text-anchor="middle" fill="var(--fg)">1 You are logged</text>
      <text x="90" y="56" text-anchor="middle" fill="var(--fg)">in to bank.example</text>
      <text x="90" y="76" text-anchor="middle" fill="var(--fg-muted)" font-size="11">(cookie stored)</text>
      <path d="M170 55 L193 55" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="200,55 193,51 193,59" fill="var(--primary)"/>
    </g>
    <g data-cue="evil">
      <rect x="200" y="16" width="160" height="78" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="280" y="38" text-anchor="middle" fill="var(--fg)">2 You open</text>
      <text x="280" y="56" text-anchor="middle" fill="var(--fg)">evil.example,</text>
      <text x="280" y="74" text-anchor="middle" fill="var(--fg)">a hidden form fires</text>
      <path d="M360 55 L383 55" stroke="var(--danger)" stroke-width="2" fill="none"/>
      <polygon points="390,55 383,51 383,59" fill="var(--danger)"/>
    </g>
    <g data-cue="sent">
      <rect x="390" y="16" width="160" height="78" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="470" y="38" text-anchor="middle" fill="var(--fg)">3 Browser POSTs</text>
      <text x="470" y="56" text-anchor="middle" fill="var(--fg)">to the bank WITH</text>
      <text x="470" y="74" text-anchor="middle" fill="var(--fg)">your cookie</text>
      <text x="10" y="132" fill="var(--danger)">The bank sees a valid session, so the transfer happens.</text>
    </g>
  </g>
</svg>
```

```narrate
[[loggedin]] You are logged in to your bank, so your browser holds its cookie. [[evil]] In another tab you open a page that contains a hidden form pointing at the bank, and it submits itself. [[sent]] Your browser sends the request to the bank and attaches the bank cookie, because cookies follow the destination, not the page that started the request. The bank sees a valid session and moves the money. The attacker never saw your cookie.
```

## CSRF: tokens first, SameSite as backup

- **CSRF token** (the main defense): a random value tied to the session, sent in a hidden field or header and checked on every state-changing request. The attacker's page cannot read it. Use your framework's built-in one first
- **`SameSite=Lax` or `Strict`** cookie: browsers hold the cookie back on cross-site requests. OWASP calls it defense in depth, not a replacement
- **Safe GET:** never change state on GET. `Lax` still sends cookies on top-level GET navigations
- **Also check** `Origin` or `Sec-Fetch-Site` where you can

> **Trap:** XSS defeats every CSRF defense. A script on your own page can read the token.

> **Not this:** "we only accept POST" or "we use a secret cookie". An auto-submitted form is a POST, and the browser sends the cookie for you.

```narrate
The main defense is a token. Give each session a random value, put it in the form or a header, and check it on every request that changes state. The attacker's page cannot read it, so it cannot send it. The same site cookie flag is a good backup, not a replacement. Never change state on a plain GET request. And remember, if the attacker also gets XSS, they can read the token too.
```

```quiz
q: Which request needs a CSRF token check?
options:
  - GET /orders
  - POST /orders/42/cancel
  - OPTIONS /orders
answer: 1
why: Safe methods only read. POST changes state, and the browser would attach the session cookie to a forged one.
```

## Clickjacking: the invisible frame

The attacker loads **your** page inside an invisible frame on their page, placed under a decoy button. The user thinks they click "Win a prize" and actually click your "Delete account".

The defense is a header: `Content-Security-Policy: frame-ancestors 'none'` (or `'self'`). Add `X-Frame-Options: DENY` only for old browsers; OWASP calls that header obsolete.

| Attack | What the attacker abuses | Main defense |
|---|---|---|
| XSS | Your page runs their script | Output encoding + CSP |
| CSRF | The browser attaches your cookie | Token + SameSite |
| Clickjacking | Your page inside their frame | `frame-ancestors` |

> **Not this:** a JavaScript "frame buster". OWASP lists several public ways to defeat them.

```narrate
Clickjacking loads your page in an invisible frame under a decoy button, so the user clicks something they cannot see. The fix is a response header. Frame ancestors set to none stops anyone framing your page. X frame options deny covers old browsers. Do not rely on a script that breaks out of frames; it can be defeated. Remember the three attacks and what each abuses: scripts, cookies, and frames.
```

## Your turn

Open `defenses.ts` in your copy. Three small functions:

- `escapeHtml(text)`: replace `&`, `<`, `>`, `"` and `'` with the entities in the table, in **one pass**. Leave everything else alone
- `createCsrfToken({ getRandomBytes? })`: 32 random bytes as base64url
- `isCsrfRequestAllowed({ method, sessionToken, submittedToken })`: safe methods (`GET`, `HEAD`, `OPTIONS`, any letter case; RFC 9110 lists `TRACE` too, but we treat it as unknown) pass. Every other method, including ones you do not know, needs a **non-empty** submitted token equal to the session token, compared in constant time

Run the tests from the Run button, or `pnpm lesson test auth/07-web-attacks`.

```hint
Keep the five replacements in a lookup object, and use one regular expression for the five characters with `replace` and a function. One pass means your own `&` is never escaped twice.
```

```hint
For the CSRF check: uppercase the method and look it up in `SAFE_METHODS`. Everything else is state-changing, so it continues to the token check.
```

```hint
Return false when either token is empty. `timingSafeEqual` throws when lengths differ, so compare the byte lengths first and only then call it.
```
