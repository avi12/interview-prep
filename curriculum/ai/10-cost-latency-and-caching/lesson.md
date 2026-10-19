---
title: Cost, latency and caching
lang: none
minutes: 20
level: junior
roles: [ai, backend]
sources:
  - https://platform.claude.com/docs/en/about-claude/pricing
  - https://platform.claude.com/docs/en/build-with-claude/prompt-caching
  - https://platform.claude.com/docs/en/build-with-claude/batch-processing
  - https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency
  - https://platform.claude.com/docs/en/build-with-claude/streaming
  - https://www.anthropic.com/engineering/building-effective-agents
---

## Tokens are the bill

Cost is **input tokens x input price + output tokens x output price**. Prices are per million tokens, and output costs more.

| Model | Input | Output | Cache read | Batch in / out |
|---|---|---|---|---|
| Claude Sonnet 5.5 | $2 | $10 | $0.10 | $1 / $5 |
| Claude Haiku 5.5 | $0.10 | $0.50 | $0.01 | $0.05 / $0.25 |

Haiku prices are for prompts up to 100,000 tokens. Lesson 01 did the single-call arithmetic. The new question is **where tokens hide** once you have traffic:

- The system prompt and **tool definitions**, sent on every call
- Retrieved chunks
- The whole chat history, resent on every turn
- An agent loop resends it on every round trip

> **Why:** one call costs fractions of a cent. A million calls is a budget line. Count tokens per request, then multiply by traffic.

```narrate
Cost is tokens times price, and prices are quoted per million tokens. On Sonnet five point five, output costs five times as much as input. Lesson one did the arithmetic for a single call. The new question is where tokens hide once you have traffic. The system prompt and tool definitions go out on every call. Retrieved chunks add more. The whole chat history is sent again on every turn, and an agent loop sends it again on every round trip. So count tokens per request, then multiply by traffic.
```

## A worked estimate

A support assistant gets **10,000 questions a day**. Each request carries a 4,000-token prefix that never changes (instructions, tool definitions), 1,000 tokens that do (retrieved chunks, the question), and a 300-token answer.

```text
plain   : 5,000 in x $2/M + 300 out x $10/M            = $0.0100 + $0.0030 = $0.0130
cached  : 4,000 x $0.10/M + 1,000 x $2/M + 300 x $10/M = $0.0004 + $0.0020 + $0.0030 = $0.0054
```

| Setup | Per request | Per day |
|---|---|---|
| Sonnet 5.5, nothing cached | $0.0130 | $130 |
| + cache the 4,000-token prefix | $0.0054 | $54 |
| + Haiku 5.5 for the easy 60%, with a cheap router call | $0.0024 | $24 |

Assumed: steady traffic keeps the cache warm, 60% of questions are easy, Haiku also reads the cached prefix, and the router call (a small model that sorts easy from hard) is about 1,000 tokens in. Each cache write adds about $0.01, and they are rare.

> **Not this:** "it will be expensive". Say "$130 a day, about $54 with caching, about $24 with routing", and name your assumptions.

```narrate
Here is a worked estimate. A support assistant gets ten thousand questions a day. Each request has a four thousand token prefix that never changes, a thousand tokens that do, and a three hundred token answer. Plain, that costs about one point three cents a request, or one hundred thirty dollars a day. Cache the prefix and it drops to fifty four dollars. Send the easy sixty percent to Haiku, and add a cheap router call, and it falls to about twenty four dollars. Quote numbers and assumptions, not adjectives.
```

## Prompt caching

The model processes your prompt in a fixed order: **tools, then system, then messages**. Caching stores the processed prefix, so a repeat request skips that work and pays the cache-read price.

```svg The stable top of the prompt is cached up to a breakpoint; only the new question after it is processed at full price
<svg viewBox="0 0 640 236" role="img" aria-label="Prompt layout with a cache breakpoint">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="tools">
      <rect x="20" y="16" width="290" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="32" y="41" fill="var(--fg)">1. tool definitions</text>
    </g>
    <g data-cue="system">
      <rect x="20" y="60" width="290" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="32" y="85" fill="var(--fg)">2. system prompt + rules</text>
    </g>
    <g data-cue="history">
      <rect x="20" y="104" width="290" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="32" y="129" fill="var(--fg)">3. documents / earlier turns</text>
    </g>
    <g data-cue="cache">
      <path d="M10 154 L320 154" stroke="var(--accent-2)" stroke-width="3" stroke-dasharray="8 5"/>
      <text x="32" y="150" fill="var(--fg-muted)" font-size="11">cache breakpoint</text>
      <path d="M326 18 L326 142" stroke="var(--ok)" stroke-width="3"/>
      <text x="338" y="70" fill="var(--fg)">cached prefix</text>
      <text x="338" y="90" fill="var(--ok)">read at $0.10 / M</text>
    </g>
    <g data-cue="fresh">
      <rect x="20" y="164" width="290" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="32" y="189" fill="var(--fg)">4. the new question</text>
      <text x="338" y="189" fill="var(--fg-muted)">full price, $2 / M</text>
    </g>
  </g>
</svg>
```

- **First use** writes the cache at 1.25x the input price. A **read** costs 0.05x on Sonnet 5.5, so the first reuse pays the write back
- Lifetime is 5 minutes, renewed each time it is used. Minimum size on Sonnet 5.5: 512 tokens
- Check `usage`: `cache_read_input_tokens` of 0 means no hit

> **Trap:** any change at or before the breakpoint, even one word, misses the cache. A timestamp or user name at the top of the system prompt means it never hits.

```quiz
q: Which prompt layout gets cache hits?
options:
  - Today's date, then instructions, then documents, then the question
  - Instructions, then documents, then the question last
  - The question first, then instructions and documents
answer: 1
why: The cached prefix must be identical on every request. Stable text goes first and the part that changes goes last.
```

```narrate
The model processes your prompt in a fixed order. [[tools]] Tool definitions come first. [[system]] Then the system prompt. [[history]] Then documents and earlier turns. [[cache]] Put a cache breakpoint after the part that stays the same, and everything before it is stored and read back at a small fraction of the price. [[fresh]] Only the new question after the breakpoint is processed at full price. If anything before the breakpoint changes, even one word, the cache misses, so stable text goes first and changing text goes last.
```

## Three more levers

- **Smaller model for easy steps.** Classify, extract, route. Haiku 5.5 costs a twentieth of Sonnet 5.5, in and out. Anthropic's routing pattern: easy requests to cheaper models, hard ones to stronger models
- **Batch the work nobody waits for.** The Batch API costs 50% less. Most batches finish within an hour; an unfinished one expires after 24. Good for nightly evals. It stacks with caching
- **Write less.** Output tokens cost 5x input tokens and each one also takes time. Ask for concise answers and set `max_tokens` as a ceiling

> **Why:** pay for the big model only where its quality shows.

> **Not this:** one large model for every step "to be safe". Most pipelines have a few hard steps and many easy ones.

```narrate
Three more levers. First, use a smaller model for easy steps. Classifying, extracting fields and routing rarely need the biggest model, and Haiku costs a twentieth of Sonnet. Second, batch work nobody is waiting for. The batch interface costs half. Results usually arrive within an hour, and a batch expires after a day, which suits nightly evals. Third, write less. Output tokens cost five times more than input tokens, and each one also takes time to produce.
```

## Where latency comes from

```svg One call is wait, then read the prompt, then write the answer token by token; streaming changes when the user first sees text, not the total time
<svg viewBox="0 0 680 262" role="img" aria-label="Timeline of one model call with and without streaming, and an agent loop repeating it">
  <g font-family="var(--font-mono)" font-size="12">
    <text x="10" y="18" fill="var(--fg-muted)">ONE CALL, LEFT TO RIGHT</text>
    <g data-cue="wait">
      <rect x="10" y="26" width="70" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="45" y="50" text-anchor="middle" fill="var(--fg)" font-size="11">send + queue</text>
    </g>
    <g data-cue="read">
      <rect x="80" y="26" width="170" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="165" y="43" text-anchor="middle" fill="var(--fg)">read the prompt</text>
      <text x="165" y="58" text-anchor="middle" fill="var(--fg-muted)" font-size="11">more input = longer</text>
    </g>
    <g data-cue="first">
      <path d="M250 20 L250 74" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="250" y="90" text-anchor="middle" fill="var(--fg)" font-size="11">first token (TTFT)</text>
    </g>
    <g data-cue="write">
      <rect x="250" y="26" width="310" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="405" y="43" text-anchor="middle" fill="var(--fg)">write, one token at a time</text>
      <text x="405" y="58" text-anchor="middle" fill="var(--fg-muted)" font-size="11">more output = longer</text>
    </g>
    <g data-cue="nostream">
      <text x="10" y="112" fill="var(--fg-muted)">WITHOUT STREAMING</text>
      <rect x="10" y="118" width="550" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="136" fill="var(--fg)" font-size="11">the user sees nothing</text>
      <rect x="560" y="118" width="80" height="26" fill="var(--ok)" stroke="var(--border)" stroke-width="2"/>
      <text x="600" y="136" text-anchor="middle" fill="var(--fg)" font-size="11">answer</text>
    </g>
    <g data-cue="stream">
      <text x="10" y="168" fill="var(--fg-muted)">WITH STREAMING</text>
      <rect x="10" y="174" width="240" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="192" fill="var(--fg)" font-size="11">the user sees nothing</text>
      <rect x="250" y="174" width="310" height="26" fill="var(--ok)" stroke="var(--border)" stroke-width="2"/>
      <text x="262" y="192" fill="var(--fg)" font-size="11">text appears as it is written</text>
    </g>
    <g data-cue="loop">
      <text x="10" y="222" fill="var(--fg-muted)">AN AGENT REPEATS IT</text>
      <rect x="10" y="228" width="100" height="24" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="244" text-anchor="middle" fill="var(--fg)" font-size="11">call</text>
      <rect x="112" y="228" width="60" height="24" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="142" y="244" text-anchor="middle" fill="var(--fg)" font-size="11">tool</text>
      <rect x="174" y="228" width="100" height="24" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="224" y="244" text-anchor="middle" fill="var(--fg)" font-size="11">call</text>
      <rect x="276" y="228" width="60" height="24" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="306" y="244" text-anchor="middle" fill="var(--fg)" font-size="11">tool</text>
      <rect x="338" y="228" width="100" height="24" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="388" y="244" text-anchor="middle" fill="var(--fg)" font-size="11">call</text>
    </g>
  </g>
</svg>
```

- **Time to first token (TTFT)** and **total time** are different numbers. Measure both
- Streaming does not shorten the total. It shows words from the first token, so it feels faster
- Levers: smaller model, shorter output, caching (less prompt to process), independent tool calls in parallel

```narrate
Read the top bar from left to right. [[wait]] First the request travels and waits its turn. [[read]] Then the model reads your prompt, and a longer prompt takes longer. Caching shortens this part. [[first]] The first token appears here, and that moment is the time to first token. [[write]] After that the model writes one token at a time, so every output token adds waiting time. [[nostream]] Without streaming, the user sees nothing until the very end. [[stream]] With streaming, text flows in from the first token, and the total time is the same. [[loop]] In an agent, each tool round trip repeats the whole bar.
```

## Make it cheaper and faster, in an interview

Do not guess. **Measure first**, then pull the biggest lever.

| You see | Pull this |
|---|---|
| A long prefix that never changes | prompt caching |
| Easy steps in a hard pipeline | smaller model, or a router |
| Nobody is waiting for the result | batch |
| Long answers | shorter output, lower `max_tokens` |
| A user watching a spinner | streaming |
| Many tool round trips | fewer rounds, or parallel calls |

> **Why:** every saving can cost quality. Re-run your golden set (lesson 07) after each change, so you know what you paid.

```quiz
q: A chat answer takes 8 seconds in total. You turn on streaming. What changes?
options:
  - The total drops to about 4 seconds
  - The user sees the first words much sooner
  - The answer costs half as much
answer: 1
why: Streaming sends the same tokens in the same total time, but the first ones arrive early, so it feels faster.
```

```narrate
When an interviewer says make it cheaper and faster, do not guess. First measure: tokens per request from the usage field, and both time to first token and total time. Then pull the biggest lever. A long unchanging prefix calls for caching. Easy steps call for a smaller model. If nobody is waiting, use batch. Long answers call for shorter output. A user watching a screen calls for streaming. After every change, rerun your golden set, because every saving can cost quality.
```
