---
title: Reading network traffic with HAR
lang: py
minutes: 25
level: junior
roles: [backend, analyst, ai]
files: [summarize_har.py]
sources:
  - https://developer.chrome.com/docs/devtools/network/reference
  - https://webperfwg.org/specs/HAR/Overview.html
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections
---

## A HAR is a recording

The network is the one place where an app **cannot hide what it does**. Every request leaves the browser.

A **HAR** (HTTP Archive) is a JSON file with every request of a session. In DevTools, Network panel: **Export HAR (sanitized)**.

Why it helps with Edge Read Aloud: in a capture you would see one plain GET that returns the voice list as JSON, and one WebSocket row that stays open. Two different kinds of traffic, two different tools.

> **Trap:** the default export strips `Cookie`, `Set-Cookie` and `Authorization`. A HAR exported **with** sensitive data is a password file. Never commit or share one.

```svg A HAR holds a log, the log holds one entry per request, and each entry has a request, a response and timings
<svg viewBox="0 0 520 220" role="img" aria-label="Structure of a HAR file">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="log">
      <rect x="10" y="14" width="180" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="36" fill="var(--fg)">log</text>
    </g>
    <g data-cue="entries">
      <path d="M30 48 L30 80 L50 80" fill="none" stroke="var(--border)" stroke-width="2"/>
      <rect x="50" y="62" width="250" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="62" y="84" fill="var(--fg)">entries[ ] one per request</text>
    </g>
    <g data-cue="parts">
      <path d="M70 96 L70 120 L90 120 M70 120 L70 152 L90 152 M70 152 L70 184 L90 184" fill="none" stroke="var(--border)" stroke-width="2"/>
      <rect x="90" y="104" width="340" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="102" y="124" fill="var(--fg)">request: method, url, headers[ ]</text>
      <rect x="90" y="138" width="340" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="102" y="158" fill="var(--fg)">response: status, redirectURL, headers[ ]</text>
      <rect x="90" y="172" width="340" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="102" y="192" fill="var(--fg)">timings: blocked, dns, connect, wait, ...</text>
    </g>
  </g>
</svg>
```

```narrate
A HAR file is a recording of everything the browser asked for. [[log]] At the top sits the log. [[entries]] Inside it, one entry per request, in the order they happened. [[parts]] Each entry holds the request that was sent, the response that came back, and a set of timings. One warning: exporting with sensitive data keeps cookies and tokens, so treat that file like a password.
```

## Headers are a list

In a HAR, headers are a **list of name and value pairs**, not a dictionary.

```json
"headers": [
  { "name": "authorization", "value": "Bearer ..." }
]
```

- Header names are case-insensitive. HTTP/2 sends them in lower case
- `Authorization: <scheme> <credentials>`. `Basic` is just base64 of `user:password`, so it is **not** encryption (MDN)
- A cookie is a name and value the server sets with `Set-Cookie` and the browser sends back

> **Not this:** `headers["Authorization"]`. It crashes on a list, and misses `authorization`. Compare names with `.lower()`.

> **Why:** in your notes write the **URL and the scheme** (`Bearer`, `Basic`), never the secret. A summary that leaks a token is a new leak.

```narrate
In a HAR, headers are a list of name and value pairs, so you search it. Names are not case sensitive, and HTTP version two writes them in lower case. The authorization header starts with a scheme such as Bearer or Basic. Basic is only base sixty-four, anyone can reverse it. When you take notes, write the address and the scheme. Never copy the secret itself.
```

```quiz
q: A request has the header authorization with the value "Bearer abc123". What goes in your notes?
options:
  - The whole value, so you can replay it
  - The URL and the word Bearer
  - Nothing, auth headers are not interesting
answer: 1
why: The scheme tells you how the API authenticates. The token itself is a secret and should never be copied around.
```

## Where did the time go?

`timings` splits one request into phases, in milliseconds. A value of `-1` means **does not apply**, for example no DNS on a reused connection. `ssl` is **inside** `connect`.

```svg Three slow requests with three different causes: connection setup, server thinking, a big download
<svg viewBox="0 0 520 220" role="img" aria-label="Three waterfall bars with different dominant phases">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="connect">
      <rect x="20" y="20" width="10" height="22" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="30" y="20" width="250" height="22" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
      <rect x="280" y="20" width="60" height="22" fill="var(--cat-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="340" y="20" width="30" height="22" fill="var(--cat-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="62" fill="var(--fg)">slow connect: new connection, DNS, TLS</text>
    </g>
    <g data-cue="wait">
      <rect x="20" y="80" width="10" height="22" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="30" y="80" width="300" height="22" fill="var(--cat-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="330" y="80" width="30" height="22" fill="var(--cat-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="122" fill="var(--fg)">slow wait: the server is thinking</text>
    </g>
    <g data-cue="receive">
      <rect x="20" y="140" width="10" height="22" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="30" y="140" width="60" height="22" fill="var(--cat-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="90" y="140" width="300" height="22" fill="var(--cat-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="182" fill="var(--fg)">slow receive: a big response</text>
    </g>
  </g>
</svg>
```

```narrate
Slow does not mean one thing. [[connect]] If the connect phase is the longest, the cost is setting up a new connection: name lookup and encryption. [[wait]] If wait is the longest, the request arrived quickly but the server took its time, so look at the backend. [[receive]] If receive is the longest, the response is simply big. The biggest phase tells you who to blame.
```

> **Not this:** adding up every key in `timings`. The `-1` values and `ssl` (already counted in `connect`) give a wrong total.

## Follow the redirects

A redirect is a `3xx` status plus a `Location` header. The HAR stores the target in `response.redirectURL`. Chase it until a request does not redirect.

- `301`, `302`, `303`, `307`, `308` redirect. `304` means "not modified", **not** a redirect
- A chain can loop. Stop when you see a URL twice
- The target may be missing from the capture (another site)

```svg Three requests in one chain: 301, then 302, then the final 200
<svg viewBox="0 0 520 170" role="img" aria-label="Redirect chain with three hops">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="hop1">
      <rect x="10" y="50" width="130" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="72" fill="var(--fg-muted)">http://</text>
      <text x="75" y="90" fill="var(--fg)">shop.test/</text>
      <path d="M142 76 L190 76 M184 70 L190 76 L184 82" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="166" y="64" fill="var(--accent-2)">301</text>
    </g>
    <g data-cue="hop2">
      <rect x="192" y="50" width="130" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="257" y="72" fill="var(--fg-muted)">https://</text>
      <text x="257" y="90" fill="var(--fg)">shop.test/</text>
      <path d="M324 76 L372 76 M366 70 L372 76 L366 82" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="348" y="64" fill="var(--accent-2)">302</text>
    </g>
    <g data-cue="final">
      <rect x="374" y="50" width="136" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="442" y="72" fill="var(--fg-muted)">https://</text>
      <text x="442" y="90" fill="var(--fg)">shop.test/home</text>
      <text x="442" y="124" fill="var(--ok)">200 final</text>
    </g>
  </g>
</svg>
```

```narrate
Redirects form a chain. [[hop1]] The first request goes to a plain http address, and the server answers with a three oh one that points to the secure one. [[hop2]] That one answers with a three oh two, pointing to the home page. [[final]] The home page finally answers two hundred, so that is where the chain ends. Always guard against loops.
```

```quiz
q: A response has status 304 and an empty Location. Is it a redirect hop?
options:
  - Yes, every 3xx redirects
  - No, 304 means the cached copy is still valid
  - Only if the method is POST
answer: 1
why: 304 Not Modified tells the browser to reuse its cache. Only 301, 302, 303, 307 and 308 point somewhere else.
```

## Your turn

`shop.har` sits next to `summarize_har.py`: made-up traffic, read it first. Write `summarize_har(har)`, where `har` is the parsed JSON (a `dict`). Return:

- `"slowest"`: the 3 entries with the largest `time`, longest first, each `{"url", "time", "phase"}`. `phase` is the largest of `blocked, dns, connect, send, wait, receive` (not `ssl`, ignore `-1`). Ties keep capture order
- `"authorized"`: requests with an `Authorization` header, in order, each `{"url", "scheme"}`. **Never** the secret
- `"redirect_chain"`: URLs from the first entry, following `redirectURL` on `301/302/303/307/308`. Stop at a loop, a missing target or a final page

```hint
`sorted(entries, key=..., reverse=True)` keeps equal items in their original order, so ties are already handled.
```

```hint
Header search: loop over the list and compare `header["name"].lower()` to `"authorization"`. `value.partition(" ")[0]` is the scheme.
```

```hint
Redirects: build a dict from url to entry, start with `[first_url]`, and loop while the last url has a redirecting entry whose target is not in the chain yet.
```
