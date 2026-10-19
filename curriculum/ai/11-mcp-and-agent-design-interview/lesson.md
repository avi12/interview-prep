---
title: MCP and agent design interviews
lang: none
minutes: 25
level: junior
roles: [ai, backend]
sources:
  - https://modelcontextprotocol.io/docs/learn/architecture
  - https://modelcontextprotocol.io/specification/latest
  - https://modelcontextprotocol.io/specification/2026-07-28/server/tools
  - https://modelcontextprotocol.io/specification/2025-11-25/server/resources
  - https://modelcontextprotocol.io/specification/2025-11-25/server/prompts
  - https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
  - https://www.anthropic.com/engineering/building-effective-agents
  - https://www.anthropic.com/news/contextual-retrieval
---

## What MCP is

The **Model Context Protocol (MCP)** is an open standard that lets an AI app use outside tools and data through one common interface.

- **Host:** the AI app (Claude Code, an editor)
- **Client:** one per server, kept inside the host
- **Server:** a program that offers tools and data
- Messages are **JSON-RPC 2.0**: a plain JSON format for a request and its reply

```svg A host creates one client per server; a local server runs as a subprocess, a remote one over the network; every message is JSON-RPC
<svg viewBox="0 0 680 250" role="img" aria-label="MCP host with two clients connected to a local and a remote server">
  <defs>
    <marker id="arrow-mcp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="host">
      <rect x="10" y="20" width="310" height="210" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="24" y="44" fill="var(--fg)">AI app (host)</text>
      <rect x="26" y="80" width="110" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="81" y="107" text-anchor="middle" fill="var(--fg)">model</text>
    </g>
    <g data-cue="clients">
      <path d="M138 102 L168 70" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-mcp)"/>
      <path d="M138 102 L168 150" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-mcp)"/>
      <rect x="170" y="48" width="130" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="235" y="75" text-anchor="middle" fill="var(--fg)">client A</text>
      <rect x="170" y="128" width="130" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="235" y="155" text-anchor="middle" fill="var(--fg)">client B</text>
    </g>
    <g data-cue="wire">
      <path d="M302 70 L408 70" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#arrow-mcp)"/>
      <path d="M302 150 L408 150" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#arrow-mcp)"/>
      <text x="355" y="62" text-anchor="middle" fill="var(--fg-muted)" font-size="11">JSON-RPC</text>
      <text x="355" y="142" text-anchor="middle" fill="var(--fg-muted)" font-size="11">JSON-RPC</text>
    </g>
    <g data-cue="local">
      <rect x="410" y="40" width="250" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="424" y="64" fill="var(--fg)">file system server</text>
      <text x="424" y="84" fill="var(--fg-muted)" font-size="11">local subprocess, stdio</text>
    </g>
    <g data-cue="remote">
      <rect x="410" y="120" width="250" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="424" y="144" fill="var(--fg)">Sentry server</text>
      <text x="424" y="164" fill="var(--fg-muted)" font-size="11">remote platform, HTTP</text>
    </g>
  </g>
</svg>
```

> **Why:** without a standard, M apps and N tools need up to M x N connectors. With MCP a tool is written once, as a server, and works in every host. The spec borrows the idea from the Language Server Protocol.

```narrate
[[host]] Start with the host: the AI application, such as Claude Code or an editor. It owns the model. [[clients]] For every server it connects to, the host creates one client, and each client keeps its own connection. [[local]] A local server, like a file system server, runs as a subprocess on your machine. [[remote]] A remote server, like the one Sentry runs, lives on someone else's platform and talks over the network. [[wire]] Every message between them is JSON-RPC two point oh, so any host can talk to any server.
```

## Three things a server offers

| Primitive | What it is | Who triggers it | Methods |
|---|---|---|---|
| **Tools** | functions with a JSON Schema for input | the **model** | `tools/list`, `tools/call` |
| **Resources** | data by URI: files, schemas, records | the **app** | `resources/list`, `resources/read` |
| **Prompts** | reusable templates | the **user** (slash commands) | `prompts/list`, `prompts/get` |

A database server could offer a **tool** to run a query, a **resource** with the schema, and a **prompt** with few-shot examples.

```json
{ "jsonrpc": "2.0", "id": 2, "method": "tools/call",
  "params": { "name": "get_weather", "arguments": { "location": "New York" } } }
```

A failing tool still returns a normal result with `isError: true`. The model can read the message and retry. Unknown tools are JSON-RPC protocol errors instead.

```quiz
q: Which MCP primitive does the model itself choose to call, based on the conversation?
options:
  - Tools
  - Resources
  - Prompts
answer: 0
why: Tools are model-controlled. Resources are application-driven, and prompts are chosen by the user.
```

```narrate
A server can offer three kinds of things. Tools are functions with a schema for their input, and the model decides when to call them. Resources are data identified by a web address style identifier, like a file or a database schema, and the application decides what to include. Prompts are reusable templates that the user picks, often as slash commands. A tool that fails returns a normal result flagged as an error, so the model can read the message and retry.
```

## How it travels

**stdio** means standard input and output, the pipes every program has.

| | stdio | Streamable HTTP |
|---|---|---|
| Server | a subprocess the client starts | its own process, many clients |
| Messages | one JSON message per line on stdin and stdout | HTTP POST to one endpoint, optional event stream back |
| Fits | local tools: files, git | remote services |
| Must do | keep stdout for protocol only, log to stderr | check the `Origin` header, bind to localhost when local, authenticate (the spec defines an OAuth-based flow) |

> **Trap:** with stdio, a stray `print()` to stdout corrupts the stream. Log to stderr.

> **Trap:** tutorials from before mid-2026 show an `initialize` handshake and server "sampling". The 2026-07-28 spec is stateless: every request carries its version and capabilities, clients may call `server/discover` first, and sampling is deprecated. Check the spec date.

```narrate
Two transports are standard. With standard input and output, the client starts the server as a subprocess and they exchange one JSON message per line. That suits local tools. With streamable HTTP, the server is its own process, clients post messages to one endpoint, and the server can stream replies back. Remote servers must check the origin header and authenticate. One common trap: on the standard input and output transport, anything extra you print corrupts the stream, so log to the error stream.
```

## MCP is also attack surface

Every connected server adds its tool names and descriptions to the model's context. That costs tokens and it is text the model reads.

- The spec says tool **annotations are untrusted** unless the server is trusted
- Hosts must get **user consent** before invoking a tool, and there should be a human able to deny calls
- Clients should show tool inputs before the call, validate results, and log usage
- A tool **result** is untrusted data (lesson 09)

> **Why:** an MCP server is code you run, plus text your model obeys. Treat installing one like adding a dependency.

> **Not this:** connecting every server you find "to have more tools". You pay for the descriptions on every call, and each one is more for an attacker to use.

```narrate
Every server you connect adds its tool names and descriptions to the model's context. That costs tokens, and it is text the model reads, so it is attack surface. The specification says tool annotations are untrusted unless the server is trusted, that hosts must get user consent before invoking a tool, and that clients should show the inputs and validate the results. Treat installing a server like adding a dependency, and connect only the ones you need.
```

## Single call, workflow, or agent?

```svg Three designs in order of complexity: one call, code-driven steps, a model-driven loop; move right only when the left cannot do the job
<svg viewBox="0 0 680 240" role="img" aria-label="Single call, workflow and agent side by side with a rule below">
  <defs>
    <marker id="arrow-ladder" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="single">
      <rect x="10" y="20" width="200" height="140" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="46" fill="var(--fg)">1 single call</text>
      <text x="22" y="72" fill="var(--fg-muted)" font-size="11">one prompt, maybe plus</text>
      <text x="22" y="88" fill="var(--fg-muted)" font-size="11">retrieved text</text>
      <text x="22" y="118" fill="var(--ok)" font-size="11">fast, cheap, easy to test</text>
    </g>
    <path d="M212 90 L238 90" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-ladder)"/>
    <g data-cue="workflow">
      <rect x="240" y="20" width="200" height="140" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="252" y="46" fill="var(--fg)">2 workflow</text>
      <text x="252" y="72" fill="var(--fg)" font-size="11">your code decides the steps:</text>
      <text x="252" y="88" fill="var(--fg)" font-size="11">chain, route, run in parallel</text>
      <text x="252" y="118" fill="var(--ok)" font-size="11">predictable, testable steps</text>
    </g>
    <path d="M442 90 L468 90" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-ladder)"/>
    <g data-cue="agent">
      <rect x="470" y="20" width="200" height="140" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="482" y="46" fill="var(--fg)">3 agent</text>
      <text x="482" y="72" fill="var(--fg)" font-size="11">the model decides the steps,</text>
      <text x="482" y="88" fill="var(--fg)" font-size="11">in a loop, with tools</text>
      <text x="482" y="118" fill="var(--danger)" font-size="11">slower, costlier, needs limits</text>
    </g>
    <g data-cue="rule">
      <text x="10" y="196" fill="var(--fg)">Move right only when the box on the left cannot do the job.</text>
      <text x="10" y="218" fill="var(--fg-muted)" font-size="12">Anthropic: find the simplest solution possible.</text>
    </g>
  </g>
</svg>
```

- **Workflow patterns:** prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer
- **Agent:** best when the number of steps cannot be predicted, and you can trust its choices enough

> **Why:** each step to the right costs latency, money and debuggability.

> **Not this:** starting with an agent framework. It can hide the prompts and make failures harder to read.

```quiz
q: You must pull the invoice number and total from a PDF into JSON. What do you build?
options:
  - A multi-agent system with a planner
  - A single call with a schema for the output
  - A workflow with five chained calls
answer: 1
why: The steps are known and the output is fixed, so one validated call is enough. Simpler is cheaper and easier to test.
```

```narrate
[[single]] Start with a single call: one prompt, maybe with retrieved text. It is fast, cheap and easy to test. [[workflow]] If one call is not enough, write a workflow. Your code decides the steps. Chain two calls, route by type, or run parts in parallel. Each step can be tested alone. [[agent]] Use an agent only when you cannot predict the steps. The model decides what to do next, in a loop with tools. That buys flexibility and costs latency, money and predictability. [[rule]] Move right only when the box on the left cannot do the job.
```

## Answering an AI design question

The interviewer grades your **trade-offs**, not the box count. Use five steps, out loud:

1. **Clarify:** users, volume, latency, accuracy bar, data freshness, and what a wrong answer costs
2. **Start simple:** single call, RAG, workflow or agent? Say why
3. **Draw the data path:** ingest, chunk, embed, retrieve, prompt, model, validate
4. **Name risks and guards:** hallucination (score gate, citations, I don't know), injection (least privilege, approval), cost and latency (caching, smaller model, streaming)
5. **Say how you will know it works:** golden set, recall@k, a calibrated judge, regression in CI, tracing

> **Why:** step 5 is what separates a demo from a product. Interviewers listen for it.

Retrieval choices to name: keyword search plus embeddings beat embeddings alone in Anthropic's tests, and reranking cut failed retrievals further.

```narrate
The interviewer grades your trade-offs, not how many boxes you draw. Use five steps, out loud. First clarify: users, volume, latency, how accurate it must be, and what a wrong answer costs. Second, start simple, and say whether a single call, retrieval, a workflow or an agent fits, and why. Third, draw the data path. Fourth, name the risks and the guard for each. Fifth, say how you will know it works: a golden set, retrieval metrics, a checked judge, and regression tests in continuous integration.
```

## A worked answer: help-desk assistant

Prompt: "Design an assistant that answers customer questions from our help docs and can issue refunds."

```svg Help-desk design in the RAG diagram style: guarded retrieval and answer path, a refund tool behind human approval, and evals, tracing and cost controls underneath
<svg viewBox="0 0 680 290" role="img" aria-label="Help-desk assistant design with guards, retrieval, model, refund approval and operations">
  <defs>
    <marker id="arrow-design" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="question">
      <rect x="10" y="30" width="108" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="64" y="61" text-anchor="middle" fill="var(--fg)">question</text>
    </g>
    <path d="M120 56 L144 56" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-design)"/>
    <g data-cue="guard">
      <rect x="146" y="30" width="108" height="52" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="200" y="52" text-anchor="middle" fill="var(--fg)">input guard</text>
      <text x="200" y="68" text-anchor="middle" fill="var(--fg)" font-size="11">cheap abuse check</text>
    </g>
    <path d="M256 56 L280 56" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-design)"/>
    <g data-cue="retrieve">
      <rect x="282" y="30" width="108" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="336" y="52" text-anchor="middle" fill="var(--fg)">retrieve</text>
      <text x="336" y="68" text-anchor="middle" fill="var(--fg-muted)" font-size="11">hybrid + score gate</text>
    </g>
    <path d="M392 56 L416 56" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-design)"/>
    <g data-cue="model">
      <rect x="418" y="30" width="108" height="52" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="472" y="52" text-anchor="middle" fill="var(--fg)">model</text>
      <text x="472" y="68" text-anchor="middle" fill="var(--fg-muted)" font-size="11">cites sources</text>
    </g>
    <path d="M528 56 L552 56" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-design)"/>
    <g data-cue="check">
      <rect x="554" y="30" width="108" height="52" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="608" y="52" text-anchor="middle" fill="var(--fg)">output check</text>
      <text x="608" y="68" text-anchor="middle" fill="var(--fg)" font-size="11">citations, links</text>
    </g>
    <path d="M472 84 L472 124" fill="none" stroke="var(--danger)" stroke-width="2" marker-end="url(#arrow-design)"/>
    <g data-cue="refund">
      <rect x="352" y="126" width="240" height="56" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="364" y="148" fill="var(--fg)">refund tool: risky</text>
      <text x="364" y="166" fill="var(--fg-muted)" font-size="11">human approves, hard amount limit</text>
    </g>
    <g data-cue="ops">
      <text x="10" y="212" fill="var(--fg-muted)">UNDERNEATH</text>
      <rect x="10" y="220" width="130" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="242" text-anchor="middle" fill="var(--fg)">golden set</text>
      <text x="75" y="258" text-anchor="middle" fill="var(--fg-muted)" font-size="11">+ CI gate</text>
      <rect x="150" y="220" width="130" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="215" y="242" text-anchor="middle" fill="var(--fg)">tracing</text>
      <text x="215" y="258" text-anchor="middle" fill="var(--fg-muted)" font-size="11">tokens, latency</text>
      <rect x="290" y="220" width="130" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="355" y="242" text-anchor="middle" fill="var(--fg)">cost controls</text>
      <text x="355" y="258" text-anchor="middle" fill="var(--fg-muted)" font-size="11">cache, small model</text>
    </g>
  </g>
</svg>
```

- Answers: RAG, because the docs change and answers need sources
- Refund: a **tool** the model may request, but a human approves it and a hard limit caps it
- Evals: questions with and without answers, plus injection attacks, in the golden set

```narrate
[[question]] A customer question comes in. [[guard]] A cheap check looks for abuse. [[retrieve]] We retrieve from the help docs and apply a score gate, so a weak match becomes I don't know. [[model]] The model answers from numbered sources and cites them. [[check]] Plain code checks the answer, for valid citations and unknown links. [[refund]] The refund is a risky tool, so it needs a human yes and a hard limit. [[ops]] Underneath, a golden set runs in continuous integration, every call is traced with its tokens, and caching and a smaller model keep the bill flat.
```
