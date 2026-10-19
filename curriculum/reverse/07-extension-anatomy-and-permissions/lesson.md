---
title: Extension anatomy and permissions
lang: ts
minutes: 30
level: junior
roles: [backend, analyst, ai]
files: [auditManifest.ts]
sources:
  - https://developer.chrome.com/docs/extensions/reference/manifest
  - https://developer.chrome.com/docs/extensions/reference/permissions-list
  - https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
  - https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
  - https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
  - https://developer.chrome.com/docs/extensions/develop/concepts/service-workers
  - https://developer.chrome.com/docs/extensions/develop/migrate/improve-security
  - https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy
---

## What is inside an extension

An extension is a folder of web files plus one file that describes it. Reading one starts with the parts:

- **manifest.json**: the contract: name, permissions, which files do what
- **Service worker**: reacts to events. It has no DOM and sleeps when idle
- **Content scripts**: run inside web pages, in an isolated world, and can only reach a few APIs directly
- **Extension pages**: popup, options, and an **offscreen document** when you need a DOM

Edge's Read Aloud is itself a hidden extension, "Microsoft Voices". A client for it plays audio from an offscreen document, because the service worker cannot.

```svg A content script lives in the page, the service worker coordinates, extension pages show the interface
<svg viewBox="0 0 520 200" role="img" aria-label="Parts of a Chrome extension and how they talk">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="page">
      <rect x="10" y="20" width="160" height="140" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="90" y="42" fill="var(--fg-muted)">web page</text>
      <rect x="26" y="70" width="128" height="60" fill="var(--accent-2)" fill-opacity="0.3" stroke="var(--border)" stroke-width="2"/>
      <text x="90" y="96" fill="var(--fg)">content script</text>
      <text x="90" y="114" fill="var(--fg-muted)">isolated world</text>
    </g>
    <g data-cue="worker">
      <rect x="215" y="62" width="110" height="76" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="270" y="92" fill="var(--fg)">service</text>
      <text x="270" y="110" fill="var(--fg)">worker</text>
      <path d="M172 100 L213 100 M179 94 L172 100 L179 106 M206 94 L213 100 L206 106" fill="none" stroke="var(--border)" stroke-width="2"/>
      <text x="192" y="86" fill="var(--fg-muted)" font-size="10">msg</text>
    </g>
    <g data-cue="pages">
      <rect x="370" y="20" width="140" height="50" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="440" y="50" fill="var(--fg)">popup, options</text>
      <rect x="370" y="84" width="140" height="50" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="440" y="114" fill="var(--fg)">offscreen page</text>
      <path d="M327 90 L368 50 M327 110 L368 110" fill="none" stroke="var(--border)" stroke-width="2"/>
    </g>
  </g>
</svg>
```

```narrate
Three kinds of parts. [[page]] A content script lives inside a web page, but in its own isolated world, so the page cannot see its variables. It reaches most extension features only by sending messages. [[worker]] The service worker is the coordinator. It wakes on events, has no DOM, and sleeps when idle. [[pages]] Popup and options pages hold the interface, and an offscreen page gives you a DOM when you need one, for example to play audio.
```

> **Why:** the isolation is deliberate. A page that is hostile or buggy cannot reach the privileged worker directly, only through messages you can validate.

## The manifest is the contract

| Key | What it grants |
|---|---|
| `permissions` | named APIs: `tabs`, `cookies`, `storage`... |
| `host_permissions` | which sites the extension may read and change |
| `content_scripts[].matches` | pages where code is injected automatically |
| `content_security_policy` | which scripts the extension's own pages may run |
| `web_accessible_resources` | files any matching web page may load |

The Read Aloud client keeps it tiny: three permissions, each used once (rewrite one request header, keep an audio page alive, remember settings), and only the hosts it talks to.

```narrate
Review starts at the manifest, because it lists everything the extension is allowed to do. Permissions name browser features. Host permissions name the websites it can touch. Content script matches say where code is injected without asking. Web accessible resources are files that any matching page can load. A good manifest is boring: few permissions, each explained by one feature, and only the hosts it needs.
```

> **Not this:** asking for broad access "just in case". Use narrower tools: `activeTab` gives temporary access after a click, and optional permissions are granted at runtime.

## How broad is the match?

A **match pattern** is `scheme://host/path`. The path is ignored for host permissions, so the host decides.

```svg From one host to every site: three patterns, three very different reaches
<svg viewBox="0 0 520 190" role="img" aria-label="Match patterns from narrow to broad">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="narrow">
      <rect x="10" y="20" width="70" height="26" fill="var(--ok)" fill-opacity="0.4" stroke="var(--border)" stroke-width="2"/>
      <text x="92" y="38" fill="var(--fg)">https://api.shop.test/*  one host</text>
    </g>
    <g data-cue="sites">
      <rect x="10" y="70" width="200" height="26" fill="var(--cat-1)" fill-opacity="0.4" stroke="var(--border)" stroke-width="2"/>
      <text x="222" y="88" fill="var(--fg)">https://*.shop.test/*</text>
      <text x="10" y="116" fill="var(--fg-muted)">a whole site and its subdomains</text>
    </g>
    <g data-cue="everything">
      <rect x="10" y="132" width="500" height="26" fill="var(--danger)" fill-opacity="0.4" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="150" fill="var(--fg)">&lt;all_urls&gt;  or  https://*/*  every site you visit</text>
    </g>
  </g>
</svg>
```

```narrate
Compare three patterns. [[narrow]] One host is the narrowest: the extension can only touch that one service. [[sites]] A wildcard before the domain widens it to a whole site and its subdomains. [[everything]] The all urls pattern, or https star slash star, reaches every site you visit, including your bank and your mail. That is the pattern a reviewer looks for first.
```

> **Trap:** Chrome's reviews of `<all_urls>` can take longer, because it affects all hosts (Chrome docs). Treat it as a high-risk request, never a default.

## Permissions that matter

Not all named permissions are equal. Chrome warns for some, for example `tabs` ("Read your browsing history"), `history`, `nativeMessaging`, `debugger`, `proxy`.

- **High**: `debugger`, `proxy`, `cookies`
- **Medium**: `webRequest`, `history`, `tabs`, `clipboardRead`, `nativeMessaging`, `management`, `declarativeNetRequest`
- **Low**: `downloads`

This ranking is our judgment, not a Chrome rule. `cookies` plus broad hosts means session theft.

```narrate
Named permissions are not equal. Chrome shows a warning for some, such as tabs, history, native messaging, debugger and proxy. We rank three as high: debugger, proxy and cookies. Cookies together with access to every site would let an extension steal your logged in sessions. This ranking is a judgment call, not a Chrome rule, so be ready to explain your reasoning out loud.
```

```quiz
q: An extension needs to rewrite one header on requests to its own two services. Which request is the best fit?
options:
  - host_permissions with <all_urls>
  - declarativeNetRequestWithHostAccess plus the two hosts
  - debugger
answer: 1
why: It grants the capability and only for the hosts you list. The other two give far more power than the job needs.
```

## No remote code

Manifest V3 requires all logic to be inside the package: no scripts loaded from your server or a CDN, no `eval`. A manifest that asks for `'unsafe-eval'` or a remote `script-src` is a red flag, or an old Manifest V2 leftover.

The default policy for extension pages is `script-src 'self'; object-src 'self'`. Remote **data**, such as a JSON config that toggles features, is allowed. Remote **code** is not.

> **Why:** a store review reads the code once. Remote code could change after the review, and the extension would do something nobody checked.

```narrate
Manifest version three closed one big door: all the extension's code must ship inside the package. No script from a content delivery network, no eval. So if a manifest asks to allow unsafe eval, or lists a remote script source, that is a warning sign. Remote configuration data is still fine. The reason is trust: a reviewer checks the shipped code once, and remote code could change after that.
```

## Your turn

Open `auditManifest.ts` and write `auditManifest(manifest)`. It returns findings `{ rule, severity, subject }`, each reported once. Order does not matter. Two sample manifests sit next to it.

- `broad-host-access` (high): `host_permissions`, plus entries of `permissions` that look like URL patterns, equal to `<all_urls>`, `*://*/*`, `http://*/*` or `https://*/*`
- `broad-content-script` (high): the same patterns in `content_scripts[].matches`
- `risky-permission`: severity from the list above, subject is the permission
- `remote-code` (high): in the `script-src` of the extension pages policy, `'unsafe-eval'` or any `http(s)://` source
- `open-web-accessible-resources` (medium): broad `matches` in version 3 `web_accessible_resources` objects
- `old-manifest-version` (medium): `manifest_version` is not 3, subject is the number

```hint
Make one small function per rule that returns an array of findings, then spread them all into one list.
```

```hint
The policy is either a string (version 2) or `{ extension_pages }` (version 3). Split it on `;`, split each directive on spaces, and find the one whose first word is `script-src`.
```

```hint
To report a pattern once, key the findings by `rule + subject` in a `Map`, and return the map's values.
```
