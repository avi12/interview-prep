---
title: Authentication vs authorization
lang: none
minutes: 10
level: junior
roles: [backend]
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403
---

## Three words, three jobs

| Word | Question it answers | What comes out |
|---|---|---|
| **Authentication** (authn) | Who are you? | An identity |
| **Authorization** (authz) | What may you do? | Allow or deny |
| **Session** | Do I still know you? | A remembered identity |

HTTP forgets you after every request. The server needs a way to remember the answer to "who are you". That memory is the session.

Authn comes first, authz second, and the session connects them.

```narrate
Three words, three jobs. Authentication asks who you are. Authorization asks what you may do. A session is how the server remembers the answer to the first question, because HTTP forgets you after every request. Keep these apart and you sound like someone who has built this before.
```

## One request, step by step

Every protected request passes the same gates, in the same order. A failure at a gate stops the request there.

You cannot decide what someone may do before you know who they are.

```svg The cookie is checked first (authn), then the rules (authz), and only then your own code runs
<svg viewBox="0 0 560 220" role="img" aria-label="A request passes an authentication check, then an authorization check, then the handler">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="client">
      <rect x="10" y="40" width="100" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="68" text-anchor="middle" fill="var(--fg)">Browser</text>
      <text x="60" y="88" text-anchor="middle" fill="var(--fg-muted)">+ cookie</text>
      <path d="M110 72 L143 72" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="150,72 143,68 143,76" fill="var(--primary)"/>
    </g>
    <g data-cue="authn">
      <rect x="150" y="40" width="108" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="204" y="68" text-anchor="middle" fill="var(--fg)">1 AUTHN</text>
      <text x="204" y="88" text-anchor="middle" fill="var(--fg-muted)">who are you?</text>
      <path d="M258 72 L291 72" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="298,72 291,68 291,76" fill="var(--primary)"/>
      <path d="M204 104 L204 143" stroke="var(--danger)" stroke-width="2" fill="none"/>
      <polygon points="204,150 200,143 208,143" fill="var(--danger)"/>
      <rect x="136" y="150" width="136" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="204" y="170" text-anchor="middle" fill="var(--fg)" font-size="12">401 not logged in</text>
    </g>
    <g data-cue="authz">
      <rect x="298" y="40" width="108" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="352" y="68" text-anchor="middle" fill="var(--fg)">2 AUTHZ</text>
      <text x="352" y="88" text-anchor="middle" fill="var(--fg-muted)">allowed?</text>
      <path d="M406 72 L439 72" stroke="var(--primary)" stroke-width="2" fill="none"/>
      <polygon points="446,72 439,68 439,76" fill="var(--primary)"/>
      <path d="M352 104 L352 143" stroke="var(--danger)" stroke-width="2" fill="none"/>
      <polygon points="352,150 348,143 356,143" fill="var(--danger)"/>
      <rect x="282" y="150" width="140" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="352" y="170" text-anchor="middle" fill="var(--fg)" font-size="12">403 or 404 not yours</text>
    </g>
    <g data-cue="handler">
      <rect x="446" y="40" width="104" height="64" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="498" y="68" text-anchor="middle" fill="var(--fg)">Your code</text>
      <text x="498" y="88" text-anchor="middle" fill="var(--ok)">200 OK</text>
    </g>
  </g>
</svg>
```

```narrate
Follow one request from the left. [[client]] The browser sends it with its session cookie. [[authn]] Gate one: who is this? The server looks the cookie up. No valid session means four oh one. [[authz]] Gate two: may this person do this thing to this exact object? If not, four oh three, or four oh four to hide that it exists. [[handler]] Only after both gates does your code run.
```

## 401 or 403?

| Status | Meaning | Will logging in again help? |
|---|---|---|
| **401** | No valid credentials. The caller is not authenticated | Yes |
| **403** | Known caller, not allowed | No |
| **404** | Same as 403, but hides that the thing exists | No |

> **Trap:** 401 is named "Unauthorized" but it means *unauthenticated*.

> **Why:** the server checks authz on every request. A hidden button is not a rule; anyone can call your API directly.

> **Not this:** hide the admin button in the UI and call it done. The browser belongs to the attacker.

```narrate
Four oh one means the server does not know who you are, so logging in can help. Four oh three means it knows exactly who you are and the answer is no, so logging in again changes nothing. Four oh four is a way to say no without admitting the thing exists. And never treat a hidden button as a rule.
```

```quiz
q: A logged-in user asks for an invoice that belongs to someone else. Which check failed?
options:
  - Authentication
  - Authorization
  - The session
answer: 1
why: The server knew who the user was. What failed was the rule about whether that user may see that invoice.
```

## What to say in the interview

Say it in four sentences:

> Authentication proves who you are. Authorization decides what that identity may do. A session carries the first result across requests. I check both on the server, on every request, and authorization per object.

The interviewer is checking three things:

- You do not mix the words up
- You know authz is **per object**, not only per page
- You do not trust the client

```narrate
If you are asked to explain the difference, use four sentences. Authentication proves who you are. Authorization decides what that identity may do. A session carries the first result across requests. And you check both on the server, on every request, per object. That last part is what separates a junior who has read about it from one who has built it.
```

```quiz
q: HTTP forgets you after each request. What lets the server know you on the next one?
options:
  - It remembers your network address
  - A session id that the browser sends back with every request
  - The browser keeps one connection open forever
answer: 1
why: The server hands out a random session id once, the browser returns it on every request, and the server looks it up.
```
