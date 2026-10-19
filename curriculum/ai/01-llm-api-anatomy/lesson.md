---
title: Anatomy of an LLM API call
lang: ts
minutes: 25
level: junior
roles: [ai, backend]
files: [llmApi.ts]
sources:
  - https://platform.claude.com/docs/en/api/python/messages/create
  - https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
  - https://platform.claude.com/docs/en/build-with-claude/context-windows
  - https://platform.claude.com/docs/en/build-with-claude/token-counting
  - https://platform.claude.com/docs/en/about-claude/pricing
  - https://platform.claude.com/docs/en/build-with-claude/streaming
  - https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide
  - https://developers.openai.com/api/docs/guides/text
  - https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
---

## One call, start to finish

An LLM call is **stateless**: one request in, one message out. The model keeps no memory between calls.

- **Request:** system prompt, messages, limits
- **Response:** content, `stop_reason`, `usage`

The shapes here are Anthropic's Messages API. Other vendors name things differently, but every chat API has these same parts.

```svg One request goes in, one response comes out; tokens fill the context window; streaming sends the same response in pieces
<svg viewBox="0 0 640 336" role="img" aria-label="Request, model with context window, response, and streaming events">
  <defs>
    <marker id="arrow-call" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="13">
    <text x="10" y="20" fill="var(--fg-muted)">REQUEST</text>
    <text x="262" y="20" fill="var(--fg-muted)">MODEL</text>
    <text x="440" y="20" fill="var(--fg-muted)">RESPONSE</text>
    <g data-cue="system">
      <rect x="10" y="30" width="200" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="50" fill="var(--fg)">system</text>
      <text x="20" y="67" fill="var(--fg-muted)" font-size="11">rules for the whole chat</text>
    </g>
    <g data-cue="messages">
      <rect x="10" y="84" width="200" height="98" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="104" fill="var(--fg)">messages</text>
      <rect x="20" y="116" width="8" height="8" fill="var(--cat-1)"/>
      <text x="34" y="124" fill="var(--fg)" font-size="11">user: question</text>
      <rect x="20" y="134" width="8" height="8" fill="var(--cat-2)"/>
      <text x="34" y="142" fill="var(--fg)" font-size="11">assistant: reply</text>
      <rect x="20" y="152" width="8" height="8" fill="var(--cat-1)"/>
      <text x="34" y="160" fill="var(--fg)" font-size="11">user: follow-up</text>
    </g>
    <g data-cue="knobs">
      <rect x="10" y="190" width="200" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="210" fill="var(--fg)" font-size="12">max_tokens: 1024</text>
      <text x="20" y="230" fill="var(--fg-muted)" font-size="11">stop_sequences, tools</text>
    </g>
    <path d="M212 138 L248 138" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-call)"/>
    <g data-cue="window">
      <rect x="250" y="30" width="150" height="216" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="262" y="58" fill="var(--fg)">the model</text>
      <text x="262" y="82" fill="var(--fg-muted)" font-size="11">reads tokens in</text>
      <text x="262" y="100" fill="var(--fg-muted)" font-size="11">writes tokens out</text>
      <text x="262" y="156" fill="var(--fg)" font-size="12">context window</text>
      <rect x="262" y="166" width="126" height="22" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="263" y="167" width="72" height="20" fill="var(--cat-1)"/>
      <rect x="335" y="167" width="32" height="20" fill="var(--accent-2)"/>
      <text x="262" y="208" fill="var(--fg-muted)" font-size="11">input + output</text>
      <text x="262" y="226" fill="var(--fg-muted)" font-size="11">must fit in one bar</text>
    </g>
    <path d="M402 138 L428 138" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-call)"/>
    <g data-cue="reply">
      <rect x="430" y="30" width="200" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="440" y="52" fill="var(--fg)">content</text>
      <text x="440" y="70" fill="var(--fg-muted)" font-size="11">list of blocks: text, tool_use</text>
    </g>
    <g data-cue="stop">
      <rect x="430" y="90" width="200" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="440" y="112" fill="var(--fg)">stop_reason</text>
      <text x="440" y="130" fill="var(--ok)" font-size="12">end_turn</text>
    </g>
    <g data-cue="usage">
      <rect x="430" y="150" width="200" height="96" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="440" y="172" fill="var(--fg)">usage</text>
      <text x="440" y="194" fill="var(--fg-muted)" font-size="12">input_tokens: 25</text>
      <text x="440" y="214" fill="var(--fg-muted)" font-size="12">output_tokens: 120</text>
      <text x="440" y="234" fill="var(--fg-muted)" font-size="11">tokens are the bill</text>
    </g>
    <g data-cue="stream" font-size="11">
      <text x="10" y="274" fill="var(--fg-muted)" font-size="12">stream: true sends the same response as events</text>
      <rect x="10" y="282" width="104" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="62" y="299" text-anchor="middle" fill="var(--fg)">message_start</text>
      <path d="M116 295 L126 295" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-call)"/>
      <rect x="128" y="282" width="146" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="201" y="299" text-anchor="middle" fill="var(--fg)">content_block_delta</text>
      <path d="M276 295 L286 295" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-call)"/>
      <rect x="288" y="282" width="104" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="299" text-anchor="middle" fill="var(--fg)">message_delta</text>
      <path d="M394 295 L404 295" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-call)"/>
      <rect x="406" y="282" width="96" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="454" y="299" text-anchor="middle" fill="var(--fg)">message_stop</text>
    </g>
  </g>
</svg>
```

```narrate
Follow one call from left to right. [[system]] First the system prompt, the rules for the whole chat. [[messages]] Then the messages, user and assistant turns, oldest first. [[knobs]] Dials such as max tokens cap the answer. [[window]] Everything you send, plus everything the model writes, must fit in the context window, counted in tokens. [[reply]] Back comes the reply, a list of content blocks. [[stop]] The stop reason says why it ended. [[usage]] Usage counts the tokens, and tokens are the bill. [[stream]] With streaming, the same reply arrives as small events.
```

## Roles and the system prompt

The API remembers nothing, so **you resend the whole conversation** on every call.

| Role | Written by |
|---|---|
| `user` | your app or the end user |
| `assistant` | the model (you replay its earlier turns) |

The system prompt is **not** a message. It is a top-level field: standing rules, set once.

```json
{
  "model": "claude-sonnet-5-5",
  "max_tokens": 1024,
  "system": "You answer in one sentence.",
  "messages": [
    { "role": "user", "content": "What is a token?" },
    { "role": "assistant", "content": "A chunk of text, often part of a word." },
    { "role": "user", "content": "How big is one?" }
  ]
}
```

> **Why:** with no hidden memory, you decide exactly what the model sees. The price is that long chats re-pay for every earlier turn.

> **Not this:** a `role: "system"` message as the first message. Claude takes `system` as a top-level field. OpenAI's Responses API uses `instructions` or a `developer` message, so check the vendor before copying code.

```narrate
The API remembers nothing. Every call carries the whole conversation: your messages, and the model's earlier replies as assistant messages. The system prompt travels in its own field, because it is rules, not conversation. This also explains cost. A long chat pays again for its whole past on every turn.
```

## Tokens and the context window

A **token** is a chunk of text, often part of a word. Models read, write and bill in tokens, not characters.

- English is roughly 4 characters per token, so 100 tokens is about 75 words
- Only a rule of thumb: every model family has its own tokenizer
- For a count before sending, use the free `count_tokens` endpoint (still an estimate)

The **context window** is the most one call can hold: everything you send plus everything the model writes. Current Claude models allow 1M tokens.

> **Trap:** Claude 4.7 and later count about 30% more tokens for the same text than earlier models. Never reuse old counts for a new model.

```narrate
A token is a chunk of text, often a piece of a word. In English, about four characters make one token. That is a rule of thumb, because each model has its own tokenizer. The context window is the limit for one call, and it is shared by what you send and what the model writes. A prompt that fills the window leaves no room for the answer.
```

## What a call costs

Prices are quoted **per million tokens**, and output costs more than input.

| Sonnet 5.5 | Price per 1M tokens |
|---|---|
| input | $2 |
| output | $10 |
| cache write (5 min) | $2.50 |
| cache read | $0.10 |

2,000 tokens in and 500 out: `2000 / 1M x $2` plus `500 / 1M x $10` = $0.004 + $0.005 = **$0.009**.

With prompt caching, `usage` splits input into three fields: `input_tokens` (uncached only), `cache_creation_input_tokens` and `cache_read_input_tokens`. Total input is their sum.

> **Why:** price from `usage` in the response. It is what the server counted and billed, not your guess.

> **Not this:** `input_tokens * price` alone once caching is on. You would miss two of the three input fields.

```quiz
q: 2,000 input tokens and 500 output tokens, at $2 in and $10 out per million. What does the call cost?
options:
  - $0.0009
  - $0.009
  - $0.09
answer: 1
why: 2,000 tokens at $2 per million is $0.004, 500 tokens at $10 per million is $0.005, and the sum is $0.009.
```

```narrate
Cost is tokens times price, and prices are quoted per million tokens. Output tokens cost more than input tokens. In the example, two thousand input tokens cost four tenths of a cent, and five hundred output tokens cost half a cent, so the call costs nine tenths of a cent. With caching on, input splits into three usage fields, and you must add all three.
```

## Why it stopped

Never read only the text. `stop_reason` says whether the answer is complete.

| `stop_reason` | Meaning | You |
|---|---|---|
| `end_turn` | finished naturally | use the text |
| `max_tokens` | hit your cap | answer is **cut**: raise the cap or continue |
| `stop_sequence` | produced one of your strings | read `stop_sequence` |
| `tool_use` | wants a tool run | run it, send the result (next lesson) |
| `refusal` | declined, still HTTP 200 | read `stop_details`, retry on a fallback |
| `pause_turn` | a server-tool loop paused | send the content back to continue |

> **Trap:** a cut-off answer looks fine until it is JSON that will not parse.

```quiz
q: A JSON answer arrives cut off in the middle of an object. Which stop_reason is the clue?
options:
  - end_turn
  - max_tokens
  - stop_sequence
answer: 1
why: The model hit the max_tokens cap before it could finish, so the output is truncated.
```

```narrate
The text alone never tells you if an answer is complete. The stop reason does. End turn means the model finished. Max tokens means it was cut off at your cap, so the answer is incomplete. Tool use means the model wants you to run a tool. A refusal still arrives as a normal success response, so you have to check for it.
```

## Temperature and the other dials

- `max_tokens`: a hard cap on the answer, and it is required. A ceiling, not a target
- `stop_sequences`: strings that end the answer when produced
- `temperature`: randomness. Low is steadier, high is more varied

The newest Claude models, such as Sonnet 5.5, return a 400 error for a non-default `temperature`. Leave it out and steer with the prompt. Older models and many other vendors still accept it.

> **Why:** extraction and classification want steady answers. Today you get them from a clear prompt plus validation of the output (next lesson).

> **Not this:** trusting `temperature: 0` for identical output every time. Randomness drops, but the guarantee does not appear. Test your code against a scripted fake model, never the live one.

```narrate
Three dials matter. Max tokens caps the length, and it is required. Stop sequences end the answer early. Temperature controls randomness. Interviewers like to ask about it, and the honest answer is that low temperature gives steadier output but never a guarantee. Newest Claude models also reject a custom temperature, so you leave it out and use clear prompts instead.
```

## Streaming

Without streaming you wait for the whole answer. With `stream: true` the server sends **server-sent events** while it writes.

1. `message_start`: the message, content still empty
2. `content_block_delta`: many small `text_delta` pieces
3. `message_delta`: the `stop_reason` and cumulative `usage`
4. `message_stop`

```
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}
```

> **Why:** the first words show up fast, and long outputs do not hit request timeouts. The final `stop_reason` and usage come last, in `message_delta`.

```narrate
Streaming sends the same reply in pieces. The stream opens with a message start event, then many small text deltas that you append to the screen. Near the end, a message delta event carries the stop reason and the token usage. Then a message stop event closes the stream. Users see words quickly, and long answers avoid timeouts.
```

## Your turn

Open `llmApi.ts`. Four small functions:

- `buildRequest`: `system` stays top-level, `history` is never changed, the new user text goes last, `stop_sequences` only when given
- `readResponse`: join the text blocks, set `isTruncated` for `max_tokens`
- `costOf`: all four usage fields times their price; cache fields can be `null`
- `ask`: build, call `client.messages.create`, read, price

The tests use `FakeModel`, a scripted stand-in with the same `messages.create` shape. No network, no key. It rejects bad requests like the real API does. Try `maxTokens` and read the error.

```hint
Request fields are snake_case: `max_tokens`, `stop_sequences`. Build the list as `[...history, { role: "user", content: userText }]`.
```

```hint
For optional fields, spread an empty object when absent: `...(system ? { system } : {})`.
```

```hint
Cost per field is `(tokens ?? 0) * pricePerMillion / TOKENS_PER_MILLION`. One small helper keeps `costOf` flat.
```
