---
title: Structured output and retries
lang: ts
minutes: 25
level: junior
roles: [ai, backend]
files: [extract.ts]
sources:
  - https://platform.claude.com/docs/en/build-with-claude/structured-outputs
  - https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
  - https://developers.openai.com/api/docs/guides/structured-outputs
  - https://zod.dev/basics
  - https://zod.dev/error-formatting
  - https://zod.dev/json-schema
---

## The model said "JSON". Did it?

You ask for JSON. Most of the time you get it. The rest of the time:

| What arrives | Why it breaks |
|---|---|
| `Sure! Here is the JSON: {...}` | prose around the object |
| `{"total": "42.50"}` | a string where you need a number |
| `{"vendor": "Acme"}` | a required field is missing |
| `{"vendor": "Ac` | cut off by `max_tokens` |

Both Anthropic and OpenAI offer **structured outputs** that constrain the answer to a JSON Schema. Use them. But their docs still list refusals and truncation as cases that can break the schema.

> **Why:** treat model text like user input. Validate it at the boundary, before any other code touches it.

> **Not this:** `JSON.parse(reply)` and trust the result. It checks the syntax, not the shape.

```narrate
Asking a model for JSON works most of the time. Sometimes it adds friendly words around the object. Sometimes a number arrives as a string, a field is missing, or the answer is cut off at the token limit. Vendors offer structured outputs that help a lot, but they still document refusals and truncation. So you validate model text the same way you validate user input.
```

## Validate with one schema

**Zod** describes the shape once and checks it. `safeParse` never throws: it returns a result you branch on.

```ts
const Invoice = z.object({
  vendor: z.string().min(1),
  total: z.number().positive(),
  currency: z.enum(["USD", "EUR", "ILS"])
});

const result = Invoice.safeParse(JSON.parse(reply));
if (!result.success) return z.prettifyError(result.error);
return result.data;
```

`z.prettifyError` turns the failure into text the model can read:

```
✖ Invalid input: expected number, received string
  → at total
```

The same schema also tells the model what to send: `z.toJSONSchema(Invoice)`.

> **Why:** one schema is the single source of truth. The prompt and the check cannot drift apart.

```quiz
q: Which call gives you the error as a value instead of throwing it?
options:
  - schema.parse(value)
  - schema.safeParse(value)
  - JSON.parse(text)
answer: 1
why: safeParse returns a result object with a success flag and never throws. parse throws a ZodError on bad input.
```

```narrate
Zod describes the shape once and checks it. The safe parse method does not throw. It hands back a result with a success flag, and either the clean data or the error. The pretty error method turns the problems into plain text that names the field and what was wrong. And the very same schema can be converted to a JSON Schema, so the prompt and the check always agree.
```

## The retry loop

When validation fails, show the model **its own wrong answer and the exact error**, then ask again. Stop after N attempts.

```svg Each failed check adds two messages (the bad reply, the error) and loops back to the model; N attempts end in a throw
<svg viewBox="0 0 640 290" role="img" aria-label="Retry loop: ask, parse, validate, feedback, give up">
  <defs>
    <marker id="arrow-retry" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="ask">
      <rect x="10" y="30" width="130" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="52" fill="var(--fg)">ask the model</text>
      <text x="22" y="70" fill="var(--fg-muted)" font-size="11">text in, JSON out</text>
    </g>
    <path d="M142 56 L168 56" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-retry)"/>
    <g data-cue="parse">
      <rect x="170" y="30" width="130" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="182" y="52" fill="var(--fg)">JSON.parse</text>
      <text x="182" y="70" fill="var(--fg-muted)" font-size="11">valid JSON?</text>
      <path d="M235 84 L235 148" stroke="var(--danger)" stroke-width="2" marker-end="url(#arrow-retry)"/>
      <text x="243" y="122" fill="var(--danger)" font-size="11">not JSON</text>
    </g>
    <path d="M302 56 L328 56" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-retry)"/>
    <g data-cue="validate">
      <rect x="330" y="30" width="140" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="342" y="52" fill="var(--fg)">zod safeParse</text>
      <text x="342" y="70" fill="var(--fg-muted)" font-size="11">right shape?</text>
      <path d="M400 84 L400 148" stroke="var(--danger)" stroke-width="2" marker-end="url(#arrow-retry)"/>
      <text x="408" y="122" fill="var(--danger)" font-size="11">wrong shape</text>
    </g>
    <path d="M472 56 L498 56" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-retry)"/>
    <g data-cue="ok">
      <rect x="500" y="30" width="130" height="52" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="512" y="52" fill="var(--fg)">return data</text>
      <text x="512" y="70" fill="var(--fg-muted)" font-size="11">typed, checked</text>
    </g>
    <g data-cue="feedback">
      <rect x="170" y="150" width="300" height="62" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="182" y="174" fill="var(--fg)">append two messages</text>
      <text x="182" y="194" fill="var(--fg-muted)" font-size="11">bad reply (assistant) + error (user)</text>
      <path d="M170 181 L75 181 L75 86" fill="none" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#arrow-retry)"/>
      <text x="84" y="140" fill="var(--fg-muted)" font-size="11">attempt &lt; N: ask again</text>
    </g>
    <g data-cue="giveup">
      <path d="M320 214 L320 236" stroke="var(--danger)" stroke-width="2" marker-end="url(#arrow-retry)"/>
      <text x="330" y="230" fill="var(--fg-muted)" font-size="11">N tries used</text>
      <rect x="250" y="238" width="140" height="42" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="262" y="263" fill="var(--fg)">throw an error</text>
    </g>
  </g>
</svg>
```

```narrate
Start at the left. [[ask]] Send the text to the model. [[parse]] First check: is the reply valid JSON? [[validate]] Second check: does it match the zod schema? [[ok]] If both pass, return the clean data. [[feedback]] If either fails, add two messages: the bad reply, and the exact error. Then ask again, with the model seeing its own mistake. [[giveup]] After N attempts, stop and throw, so a bad day never turns into an endless bill.
```

> **Why:** the error is new information. A model that sees what it wrote and what was wrong usually fixes it in one retry.

> **Not this:** resending the identical request. Same input, same likely mistake, double the cost.

> **Trap:** no attempt limit. A stuck loop is an infinite bill.

## What to say out loud

The interviewer is checking whether you treat model output as **untrusted input**.

- "I validate with a schema, and I send the schema to the model too"
- "On failure I feed back the exact error, and I cap attempts at a small number"
- "If `stop_reason` is `max_tokens`, retrying will not help. I raise the cap instead"

```quiz
q: A reply fails validation. What do you send on the retry?
options:
  - the same request again
  - the conversation, plus the bad reply, plus the validation error
  - the same request with a higher temperature
answer: 1
why: The bad reply and the exact error are new information. Without them the model has no reason to answer differently.
```

```narrate
Here is what to say in the interview. Model output is untrusted input, so you validate it with a schema, and you give the same schema to the model. On failure you feed back the exact error and you cap the attempts. One more detail: if the answer was cut off at the token limit, retrying the same request will fail the same way. Raise the limit instead.
```

## Your turn

Open `extract.ts`. Two functions are yours:

- `checkReply({ reply, schema })`: parse the text (use the given `jsonTextOf` to strip a code fence), then `safeParse`. Return `{ isValid: true, data }` or `{ isValid: false, problem }`
- `extractWithRetry({ client, text, schema, maxAttempts })`: the loop. Return `{ data, attempts }`, or throw `ExtractionError` after `maxAttempts` calls

Rules the tests check:

- Failed replies are fed back as an assistant message, then a user message with the problem
- Return the zod output, so defaults apply
- Never call the model more than `maxAttempts` times

`FakeModel` plays a model that answers badly first. No network.

```hint
Wrap `JSON.parse` in `try/catch` inside `checkReply` and return a `problem` that says the reply was not valid JSON. Then `schema.safeParse(parsed)`.
```

```hint
Keep one `messages` array. After a bad reply, push `{ role: "assistant", content: reply }` and then a user message with the problem text.
```

```hint
`for (let attempt = 1; attempt <= maxAttempts; attempt++)`. Return early when `checkReply` says `isValid`. After the loop, throw `new ExtractionError({ attempts: maxAttempts, lastProblem })`.
```
