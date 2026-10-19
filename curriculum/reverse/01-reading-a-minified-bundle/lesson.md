---
title: Reading a minified bundle
lang: ts
minutes: 25
level: junior
roles: [backend, analyst, ai]
files: [extractEndpoints.ts]
sources:
  - https://developer.mozilla.org/en-US/docs/Glossary/Minification
  - https://developer.chrome.com/docs/devtools/javascript/reference
  - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
  - https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open
  - https://cwe.mitre.org/data/definitions/798.html
---

## Why interviewers care

Reverse engineering is **reading code you did not write**, with no docs and nobody to ask. That is a normal week: a legacy service, a vendor SDK, a bug inside a library.

What the interviewer watches:

- Do you stay calm in unfamiliar code?
- Do you follow a method, or guess?
- Do you know that code sent to a browser is public?

Our running example is real. Edge ships Read Aloud as a hidden extension, packed inside the browser. Dumping it gave plain JavaScript, comments included. Reading it showed which service to call.

```narrate
Reverse engineering sounds exotic, but it is mostly one skill: reading code you did not write, fast. Interviewers watch whether you have a method. Our example all course is real. Edge ships its Read Aloud feature as a hidden extension packed inside the browser. Someone dumped its files, read the plain JavaScript, and learned how to talk to the voice service. No magic, only reading.
```

## Minified is not hidden

**Minification** shrinks a file: it removes whitespace and comments and shortens names (MDN). Strings and structure survive. **Obfuscation** goes further on purpose, to slow a reader down.

```js
// original
const API = "https://api.shop.test";
function getProduct(id) { return fetch(API + "/v1/products/" + id); }
// minified
var e="https://api.shop.test";function r(r){return fetch(e+"/v1/products/"+r)}
```

| Survives | Lost |
|---|---|
| string literals: URLs, header names | variable and function names |
| call shapes like `fetch(...)` | comments, whitespace, layout |

> **Why:** the browser must run the file, so the browser must be able to read it. What you can run, you can read.

```narrate
Minifying removes whitespace and comments and shortens names. It keeps the strings and the shape of the calls, and those are exactly what a reverse engineer searches for. Obfuscation tries harder, but the browser still has to execute the file, so it can never be truly hidden.
```

## A repeatable way in

```svg Four steps in order: make it readable, search for anchors, follow each value, write the call down
<svg viewBox="0 0 520 210" role="img" aria-label="Four steps to find API calls in a bundle">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="pretty">
      <rect x="10" y="20" width="112" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="66" y="48" text-anchor="middle" fill="var(--fg)">1 pretty</text>
      <text x="66" y="68" text-anchor="middle" fill="var(--fg)">print</text>
    </g>
    <g data-cue="search">
      <rect x="138" y="20" width="112" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="194" y="48" text-anchor="middle" fill="var(--fg)">2 search</text>
      <text x="194" y="68" text-anchor="middle" fill="var(--fg)">anchors</text>
      <text x="194" y="110" text-anchor="middle" fill="var(--fg-muted)">fetch(</text>
      <text x="194" y="128" text-anchor="middle" fill="var(--fg-muted)">.open(</text>
      <text x="194" y="146" text-anchor="middle" fill="var(--fg-muted)">Authorization</text>
    </g>
    <g data-cue="follow">
      <rect x="266" y="20" width="112" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="322" y="48" text-anchor="middle" fill="var(--fg)">3 follow</text>
      <text x="322" y="68" text-anchor="middle" fill="var(--fg)">each name</text>
      <text x="322" y="110" text-anchor="middle" fill="var(--fg-muted)">e + t[0]</text>
    </g>
    <g data-cue="notes">
      <rect x="394" y="20" width="112" height="64" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="450" y="48" text-anchor="middle" fill="var(--fg)">4 write it</text>
      <text x="450" y="68" text-anchor="middle" fill="var(--fg)">down</text>
      <text x="450" y="110" text-anchor="middle" fill="var(--accent-2)">POST</text>
      <text x="450" y="128" text-anchor="middle" fill="var(--fg-muted)">/v2/cart</text>
    </g>
    <path d="M124 52 L136 52 M130 46 L136 52 L130 58" fill="none" stroke="var(--border)" stroke-width="2"/>
    <path d="M252 52 L264 52 M258 46 L264 52 L258 58" fill="none" stroke="var(--border)" stroke-width="2"/>
    <path d="M380 52 L392 52 M386 46 L392 52 L386 58" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="10" y="190" fill="var(--fg-muted)">method + URL + headers, for every call</text>
  </g>
</svg>
```

```narrate
Work in four steps. [[pretty]] First make the file readable. DevTools pretty prints minified files for you. [[search]] Second, search for anchors that only network code contains: fetch, open, and the word Authorization. [[follow]] Third, follow every name back to where it was set. [[notes]] Fourth, write down the method, the address and the headers for each call.
```

> **Not this:** reading from line one downward. A bundle is mostly library code. Jump in from anchors only API code contains.

## Pieces hide the URL

Two tricks defeat a plain search for `fetch("https`:

- **Concatenation**: the URL is built from parts
- **String table**: strings moved into one array, read by index

```js
var e="https://api.shop.test",t=["/v2/cart","/v2/orders/"];
fetch(e+t[0],{method:"POST"})   // POST https://api.shop.test/v2/cart
fetch(e+t[1]+r)                 // GET  https://api.shop.test/v2/orders/{r}
```

Obfuscators wrap the lookup in a decoder function. The idea is the same: evaluate the lookup, in your head or by running that one line in the console.

> **Not this:** the regex `fetch\("([^"]+)"\)`. It only sees calls whose URL is a single literal, so it misses both tricks.

> **Trap:** minifiers reuse short names in different scopes. `e` may be the base URL here and a response there.

```narrate
Two tricks hide a URL from a simple search. One is concatenation: the address is built from several parts. The other is a string table: all strings sit in one array, and the code reads them by index. To read such a call, replace every name with its value, in order, like solving an expression. Careful, though. Minifiers reuse short names in different scopes.
```

```quiz
q: With var e="https://api.shop.test",t=["/a","/b"] what does fetch(e+t[1]) call?
options:
  - https://api.shop.test/a
  - https://api.shop.test/b
  - https://api.shop.testt[1]
answer: 1
why: Index counting starts at zero, so t[1] is the second entry, "/b", appended to the base address.
```

## Secrets in a bundle

Sometimes the bundle holds a token. Anyone who loads the page has it. This weakness has a name: hard-coded credentials, CWE-798 (a catalogue of weakness types).

The Edge project shows the limit of hiding. Edge keeps its client token out of the JavaScript: the extension asks the browser for it. It lives in the browser's native code. It was still found there.

> **Why:** hiding moves a secret, it does not remove it. In an interview, say: never ship a secret to a client, keep it on the server, and treat a leaked one as burned.

```narrate
A bundle can carry a token, and then everyone who loads the page owns it. Edge tried to keep its client token out of the JavaScript, by asking the browser for it at run time. The value still sat inside the browser's own file, and it was found there. So the interview answer is simple: a secret shipped to a client is not a secret.
```

```quiz
q: A token is in a minified bundle, with a one-letter variable name. Is it protected?
options:
  - Yes, minified code is hidden
  - No, whoever loads the page can read it
  - Yes, if the name is short enough
answer: 1
why: Minifying changes names and spacing only. The string is still in the file the browser downloads.
```

## Your turn

Open `extractEndpoints.ts` in your copy. `bundle.min.js` sits next to it: read it first. Then write `extractEndpoints(source)`. It returns `{ method, url }` for each network call, in order of appearance.

- `fetch(url)` is a `GET`; `fetch(url, { method: "X" })` uses `X`
- `thing.open("METHOD", url)` is an XHR call (XMLHttpRequest, the older way to call a server); `window.open("https://...", "_blank")` is not
- A url is a `+` chain of literals, constants (`e`) and table entries (`t[1]`); unknown names become `{name}`
- Methods come back upper-case

The tests also run a second bundle with other names, so no hard-coding.

```hint
Start with two pre-passes over the source: one map of `name="literal"` constants, one map of `name=["a","b"]` tables.
```

```hint
Match calls with a regex like `\bfetch\(([^,)]*)(?:,([^)]*))?\)`. Group 1 is the URL expression, group 2 holds the options where `method:"POST"` lives.
```

```hint
Turn a URL expression into pieces with `/"[^"]*"|[A-Za-z_$][\w$]*(?:\[\d+\])?/g`, resolve each piece, and join. Collect fetch and XHR matches into one list and sort by `match.index`.
```
