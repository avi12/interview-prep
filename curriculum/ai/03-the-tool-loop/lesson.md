---
title: The tool loop
lang: ts
minutes: 25
level: junior
roles: [ai, backend]
files: [agent.ts]
sources:
  - https://www.anthropic.com/engineering/building-effective-agents
  - https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
  - https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
  - https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
  - https://developers.openai.com/api/docs/guides/function-calling
---

## The loop in one picture

An **agent** is "LLMs using tools based on environmental feedback in a loop" (Anthropic's definition).

The model **never runs anything**. It asks, in a `tool_use` block. Your code runs the tool and reports back. Then the model decides what is next.

```svg Your code asks, the model requests a tool, your code runs it and replies, until the model says end_turn
<svg viewBox="0 0 640 372" role="img" aria-label="Sequence between your code, the model and a tool, looping until end_turn">
  <defs>
    <marker id="arrow-loop" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="40" y="8" width="120" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="100" y="27" text-anchor="middle" fill="var(--fg)">your code</text>
    <rect x="260" y="8" width="120" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="320" y="27" text-anchor="middle" fill="var(--fg)">the model</text>
    <rect x="480" y="8" width="120" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="540" y="27" text-anchor="middle" fill="var(--fg)">a tool</text>
    <path d="M100 38 L100 362" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
    <path d="M320 38 L320 362" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
    <path d="M540 38 L540 362" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
    <g data-cue="ask">
      <path d="M100 76 L314 76" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-loop)"/>
      <text x="110" y="68" fill="var(--fg)" font-size="13">1  task + tool definitions</text>
    </g>
    <g data-cue="loop">
      <rect x="14" y="96" width="612" height="190" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="24" y="113" fill="var(--fg-muted)" font-size="12">repeat while stop_reason is tool_use</text>
    </g>
    <g data-cue="guard">
      <text x="616" y="113" text-anchor="end" fill="var(--danger)" font-size="12">cap: maxIterations</text>
    </g>
    <g data-cue="wants">
      <path d="M320 140 L106 140" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-loop)"/>
      <text x="112" y="132" fill="var(--fg)" font-size="13">2  tool_use: name + input</text>
    </g>
    <g data-cue="run">
      <path d="M100 184 L534 184" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-loop)"/>
      <text x="110" y="176" fill="var(--fg)" font-size="13">3  run the tool with the input</text>
      <path d="M540 228 L106 228" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-loop)"/>
      <text x="112" y="220" fill="var(--fg)" font-size="13">4  result, or the error</text>
    </g>
    <g data-cue="back">
      <path d="M100 272 L314 272" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-loop)"/>
      <text x="110" y="264" fill="var(--fg)" font-size="13">5  tool_result, same id</text>
    </g>
    <g data-cue="done">
      <path d="M320 330 L106 330" stroke="var(--ok)" stroke-width="2" marker-end="url(#arrow-loop)"/>
      <text x="112" y="322" fill="var(--fg)" font-size="13">6  end_turn: final answer</text>
    </g>
  </g>
</svg>
```

```narrate
Read it top to bottom. [[ask]] Your code sends the task and the tool definitions. [[wants]] The model replies with stop reason tool use, and a block naming a tool and its input. It does not run anything. [[run]] Your code runs the tool, and catches any error. [[back]] The result goes back as a tool result with the same id. [[loop]] That repeats for as long as the stop reason says tool use. [[guard]] A cap on iterations stops a model that never finishes. [[done]] When the stop reason is end turn, the text is the final answer.
```

## The message shapes

The model's turn carries the request:

```json
{ "role": "assistant", "content": [
  { "type": "text", "text": "Let me look that up." },
  { "type": "tool_use", "id": "toolu_01A", "name": "lookup_order", "input": { "order_id": "A17" } }
] }
```

Your reply is a **user** message with a `tool_result` per `tool_use`:

```json
{ "role": "user", "content": [
  { "type": "tool_result", "tool_use_id": "toolu_01A", "content": "{\"status\":\"shipped\"}" }
] }
```

- Append the model's **whole** turn first, unchanged
- `tool_result` blocks come **first** in the content, any text after
- Several `tool_use` blocks in one turn: all results go in **one** message

> **Trap:** text before a `tool_result` is a 400 error.

> **Not this:** a separate `tool` role. That is OpenAI's style (`function_call_output` with a `call_id`). Claude keeps tools inside user and assistant messages.

```narrate
The model asks for a tool inside its own turn, as a tool use block with an id, a name and an input. You answer with a user message that holds one tool result for each request, matched by id. Append the model's whole turn first, exactly as it came. Put tool results before any text, and put all results from one turn into a single message. OpenAI uses different names, but the loop is the same.
```

## When a tool fails

Tools fail: bad id, timeout, network. Do not let the exception escape. Return it as a result with `is_error: true`.

```json
{ "type": "tool_result", "tool_use_id": "toolu_01A", "is_error": true,
  "content": "Error: order Z99 not found. Check the id and try again." }
```

The model reads the error and can retry with new input, try another tool, or tell the user.

> **Why:** an error is information. Anthropic's docs say to write **instructive** messages: what went wrong and what to try next.

> **Not this:** throwing out of the loop. One bad order id would kill the whole conversation.

```quiz
q: A tool throws "Order Z99 not found". What does the loop do?
options:
  - crash and show a stack trace
  - send a tool_result with is_error true and the message
  - skip the tool_result and call the model again
answer: 1
why: Every tool_use needs a tool_result. Sending the error lets the model recover. Skipping it is a 400 error.
```

```narrate
Tools fail all the time. Instead of crashing, catch the error and send it back as a tool result flagged as an error, with a message that says what went wrong and what to try next. The model reads it and recovers: it may retry with a different input, use another tool, or explain the problem to the user. And never skip a result. Every tool use needs a matching one.
```

## Limits you must add

Anthropic's agents post: it is "also common to include stopping conditions (such as a maximum number of iterations) to maintain control".

- **Max iterations**: count model calls. At the cap, throw. Never `while (true)`
- **Unknown tool name**: return an error result, do not crash
- **Irreversible tools** (refunds, emails, deletes): ask a human first
- **Log each step**: tool name, input, result, tokens

> **Trap:** a model stuck calling the same tool forever. Each turn re-sends the whole history, so cost grows with every lap.

```narrate
Add limits before anything else. Count the model calls, and stop at a cap. Unknown tool names get an error result. Irreversible tools, such as refunds, should wait for a human. And log every step, because when the loop misbehaves in production, the log is all you have. A stuck loop is expensive: every lap re-sends the whole conversation.
```

## Your turn

Open `agent.ts`. Two functions are yours:

- `runTool({ tools, block })`: find the tool by name, run it, return a `tool_result`. An unknown tool or a thrown error becomes `is_error: true`
- `runAgent({ client, system, task, tools, maxIterations })`: the loop. Return `{ answer, iterations }`. After `maxIterations` model calls that still ask for tools, throw `MaxIterationsError`

Tools carry a `run` function. **Do not send `run` to the model.** The scripted `FakeModel` rejects it, like the real API.

Two tools in the tests: `lookup_order` and `issue_refund`.

```hint
Keep one `messages` array starting with the task. Each lap: call the model, then if `stop_reason` is not `tool_use`, return the text.
```

```hint
On `tool_use`: push `{ role: "assistant", content: response.content }`, run every `tool_use` block with `runTool`, then push ONE user message holding all the results.
```

```hint
Strip `run` before sending: `tools.map(({ run, ...definition }) => definition)`. In `runTool`, `try { await tool.run(block.input) } catch (error) { ... }`.
```
