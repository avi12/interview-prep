---
title: Queues and async work
lang: py
minutes: 25
level: junior
roles: [backend, ai]
files: [visibility_queue.py]
sources:
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling
  - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
  - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
  - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
---

## Why put work on a queue

Some work is slow or flaky: sending an email, resizing an image, calling an LLM. If the user waits, pages get slow, and fail when the helper is down.

With a **queue**, the API writes a message and answers at once (`202 Accepted`). A **worker** picks the message up later.

- The API keeps working even if the workers are down
- You scale workers on their own
- The cost: no instant result, and one more thing to run

```svg The user gets an answer before the slow job even starts
<svg viewBox="0 0 640 294" role="img" aria-label="With a queue the API answers at once and a worker does the slow job later" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 288" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client</text>
<path d="M235.3 38 L235.3 288" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="175.3" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="235.3" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">API</text>
<path d="M404.7 38 L404.7 288" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="344.7" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="404.7" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Queue</text>
<path d="M574 38 L574 288" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Worker</text>
<g data-cue="request">
<path d="M68 79.4 L233.3 79.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="233.3,79.4 223.3,84.4 223.3,74.4" fill="var(--fg)"/>
<text x="150.7" y="72.4" font-size="12" fill="var(--fg)" text-anchor="middle">POST /signup</text>
</g>
<g data-cue="enqueue">
<path d="M237.3 117.4 L402.7 117.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="402.7,117.4 392.7,122.4 392.7,112.4" fill="var(--fg)"/>
<text x="320" y="110.4" font-size="12" fill="var(--fg)" text-anchor="middle">send: welcome email</text>
</g>
<g data-cue="reply">
<path d="M233.3 155.4 L68 155.4" fill="none" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,155.4 78,150.4 78,160.4" fill="var(--ok)"/>
<text x="150.7" y="148.4" font-size="12" fill="var(--fg)" text-anchor="middle">202 Accepted</text>
</g>
<g data-cue="work">
<path d="M572 193.4 L406.7 193.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="406.7,193.4 416.7,188.4 416.7,198.4" fill="var(--fg)"/>
<text x="489.3" y="186.4" font-size="12" fill="var(--fg)" text-anchor="middle">receive</text>
</g>
<g data-cue="work">
<path d="M574 213.4 L536 213.4 L536 231.4 L572 231.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,231.4 562,236.4 562,226.4" fill="var(--fg)"/>
<text x="528" y="218.4" font-size="12" fill="var(--fg)" text-anchor="end">sends the email</text>
</g>
<g data-cue="ack">
<path d="M572 269.4 L406.7 269.4" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="406.7,269.4 416.7,264.4 416.7,274.4" fill="var(--ok)"/>
<text x="489.3" y="262.4" font-size="12" fill="var(--fg)" text-anchor="middle">ack</text>
</g>
</svg>
```

```narrate
A user signs up. [[request]] The client posts to the A P I. [[enqueue]] The A P I does not send the email itself. It drops a message on the queue. [[reply]] And it answers right away, with accepted. The user is already done. [[work]] Later, a worker takes the message and sends the email. [[ack]] When the job is finished, the worker acknowledges the message, so the queue can delete it.
```

> **Why:** a queue turns "must finish now" into "must finish soon". That is far easier to keep reliable.

> **Not this:** a queue for something the caller needs right now, like a login check. A queue is one-way, so call the service directly.

## A queue levels the load

Traffic arrives in bursts. A service sized for the peak sits idle most of the day. Sized for the average, it falls over in a burst.

Put a queue between them. Bursts pile up in the queue, and workers drain it at their own steady pace. This is **load leveling**.

Watch the queue **depth**. If arrivals stay above what the workers can handle, the queue grows without end, and so does the wait.

```svg The queue absorbs the burst and the workers never see the spike
<svg viewBox="0 0 640 244" role="img" aria-label="A queue absorbs bursts of requests and lets workers process at a steady pace" font-family="var(--font-mono)" font-size="13">
<g data-cue="burst">
<text x="10" y="52" font-size="12" fill="var(--fg)" text-anchor="start">Requests</text>
<text x="10" y="67" font-size="12" fill="var(--fg)" text-anchor="start">arrive in</text>
<text x="10" y="82" font-size="12" fill="var(--fg)" text-anchor="start">bursts</text>
<path d="M130 96 L610 96" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="136" y="86" width="48" height="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="196" y="86" width="48" height="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="256" y="34" width="48" height="62" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="316" y="26" width="48" height="70" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="376" y="82" width="48" height="14" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="436" y="86" width="48" height="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="496" y="42" width="48" height="54" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="556" y="86" width="48" height="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="queue">
<rect x="130" y="110" width="480" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="370" y="132" font-size="12" fill="var(--fg)" text-anchor="middle">queue: holds the backlog, drains it between bursts</text>
</g>
<g data-cue="steady">
<text x="10" y="178" font-size="12" fill="var(--fg)" text-anchor="start">Workers</text>
<text x="10" y="193" font-size="12" fill="var(--fg)" text-anchor="start">work at a</text>
<text x="10" y="208" font-size="12" fill="var(--fg)" text-anchor="start">steady pace</text>
<path d="M130 214 L610 214" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="136" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="196" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="256" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="316" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="376" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="436" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="496" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="556" y="174" width="48" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
</svg>
```

```narrate
Read the chart from the top. [[burst]] Requests arrive in bursts, with quiet gaps between them. [[queue]] The queue sits in the middle. It holds the backlog during a burst and drains it afterwards. [[steady]] The workers at the bottom never feel the spike. They process at the same steady pace all the time, so you only pay for the average load.
```

> **Why:** you size workers for the average load, not for the peak. That saves money and keeps the service calm.

> **Trap:** autoscaling workers without a limit. A hundred workers can crush the database behind them, and you just moved the overload.

## At-least-once delivery

| Guarantee | What can go wrong |
|---|---|
| At-most-once | A message can be **lost** |
| At-least-once | A message can arrive **twice** |
| Exactly-once | Not something a network gives you |

SQS standard queues deliver **at least once**. More than one copy might arrive, and order is best effort. A worker may finish the job and crash before it acks, so the queue cannot know.

The fix is not in the queue. It is in the consumer: make a repeat **harmless**.

```python
def handle(message):
    if already_done(message.id):
        return
    do_the_work(message.body)
    mark_done(message.id)
```

For outside calls like email or payment, send an idempotency key, as in the retries lesson.

> **Why:** duplicates will happen, so make them harmless. At-least-once plus an idempotent consumer gives you an "exactly-once effect".

> **Not this:** a fast consumer so duplicates "never happen". A crash at the wrong moment still redelivers.

```quiz
q: A worker sends the email, then crashes before acking. What happens?
options:
  - The message is lost
  - The message is delivered again, so the email may go out twice
  - The queue guarantees it is delivered exactly once
answer: 1
why: No ack arrived, so the queue assumes the work failed and redelivers. The consumer must tolerate the repeat.
```

```narrate
Queues make a promise about delivery. At most once means a message can be lost. At least once means it can arrive twice. Most queues choose at least once, because losing work is worse than repeating it. A worker may finish the job and crash before it acknowledges, so the queue cannot tell. The answer lives in the consumer: check whether this message was already handled, and skip it if so.
```

## Visibility timeout

Receiving a message does **not** delete it. The queue **hides** it for the visibility timeout. Ack in time: deleted. No ack: it becomes visible again and another worker retries. That is how a queue survives a crashed worker.

SQS defaults to 30 seconds. You can extend it while still working (a heartbeat).

- **Too short**: you are still working when it reappears, so someone duplicates your job
- **Too long**: after a crash the message stays hidden, and the retry is late

Set it a bit above your normal maximum processing time.

```svg A crash is not a lost message. It is a message that comes back
<svg viewBox="0 0 640 318" role="img" aria-label="A worker crashes before acking, the visibility timeout passes, and another worker receives the same message" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 312" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Worker A</text>
<path d="M320 38 L320 312" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="260" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Queue</text>
<path d="M574 38 L574 312" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Worker B</text>
<g data-cue="receive">
<path d="M68 77.9 L318 77.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="318,77.9 308,82.9 308,72.9" fill="var(--fg)"/>
<text x="193" y="70.9" font-size="12" fill="var(--fg)" text-anchor="middle">receive</text>
</g>
<g data-cue="receive">
<path d="M318 113.9 L68 113.9" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,113.9 78,108.9 78,118.9" fill="var(--fg)"/>
<text x="193" y="106.9" font-size="12" fill="var(--fg)" text-anchor="middle">m1, hidden for 30 s</text>
</g>
<g data-cue="crash">
<path d="M66 131.9 L104 131.9 L104 149.9 L68 149.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="68,149.9 78,144.9 78,154.9" fill="var(--fg)"/>
<text x="112" y="136.9" font-size="12" fill="var(--fg)" text-anchor="start">crashes, no ack</text>
</g>
<g data-cue="timeout">
<path d="M320 167.9 L358 167.9 L358 185.9 L322 185.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,185.9 332,180.9 332,190.9" fill="var(--fg)"/>
<text x="366" y="172.9" font-size="12" fill="var(--fg)" text-anchor="start">30 s pass: m1 visible</text>
</g>
<g data-cue="again">
<path d="M572 221.9 L322 221.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,221.9 332,216.9 332,226.9" fill="var(--fg)"/>
<text x="447" y="214.9" font-size="12" fill="var(--fg)" text-anchor="middle">receive</text>
</g>
<g data-cue="again">
<path d="M322 257.9 L572 257.9" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="572,257.9 562,262.9 562,252.9" fill="var(--fg)"/>
<text x="447" y="250.9" font-size="12" fill="var(--fg)" text-anchor="middle">m1 again, count 2</text>
</g>
<g data-cue="ack">
<path d="M572 293.9 L322 293.9" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="322,293.9 332,288.9 332,298.9" fill="var(--ok)"/>
<text x="447" y="286.9" font-size="12" fill="var(--fg)" text-anchor="middle">ack: deleted</text>
</g>
</svg>
```

```narrate
Follow message one. [[receive]] Worker A receives it, and the queue hides it for thirty seconds. [[crash]] Worker A crashes, and never acknowledges. [[timeout]] Thirty seconds pass, and the message becomes visible again. [[again]] Worker B receives the very same message, now on its second delivery. [[ack]] This time the job finishes, B acknowledges, and the message is deleted for good.
```

> **Trap:** a visibility timeout shorter than the job. The message reappears while the first worker is still busy, and the work is duplicated every single time.

## Ack, nack and the dead-letter queue

A **poison message** fails every time: bad data, or a bug. Without a limit it loops forever and wastes workers.

After a set number of receives, the queue moves it to the **dead-letter queue (DLQ)**. A person looks, fixes the bug, and **redrives** it.

- **Ack**: done, delete it
- **Nack**: "I could not do this", make it visible again now
- Alarm on the DLQ depth, and keep its retention longer than the main queue

```svg Every message ends in one of two places: deleted, or parked for a human
<svg viewBox="0 0 640 242" role="img" aria-label="Message life cycle: visible, in flight, deleted, or parked in the dead-letter queue" font-family="var(--font-mono)" font-size="13">
<g data-cue="visible">
<rect x="30" y="60" width="130" height="58" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="95" y="85.6" font-size="13" fill="var(--fg)" text-anchor="middle">VISIBLE</text>
<text x="95" y="101.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">waiting</text>
</g>
<g data-cue="receive">
<path d="M160 78 L260 78" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="260,78 250,83 250,73" fill="var(--fg)"/>
<text x="210" y="70" font-size="12" fill="var(--fg)" text-anchor="middle">receive</text>
</g>
<g data-cue="flight">
<rect x="260" y="60" width="150" height="58" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="335" y="85.6" font-size="13" fill="var(--fg)" text-anchor="middle">IN FLIGHT</text>
<text x="335" y="101.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">hidden for 30 s</text>
</g>
<g data-cue="back">
<path d="M260 104 L160 104" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="160,104 170,99 170,109" fill="var(--danger)"/>
<text x="210" y="128" font-size="12" fill="var(--fg)" text-anchor="middle">nack or timeout</text>
</g>
<g data-cue="ack">
<path d="M410 89 L490 89" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="490,89 480,94 480,84" fill="var(--ok)"/>
<text x="450" y="80" font-size="12" fill="var(--fg)" text-anchor="middle">ack</text>
<rect x="490" y="60" width="120" height="58" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="550" y="85.6" font-size="13" fill="var(--fg)" text-anchor="middle">DELETED</text>
<text x="550" y="101.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">done</text>
</g>
<g data-cue="dlq">
<path d="M95 118 L95 172" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="95,172 90,162 100,162" fill="var(--danger)"/>
<text x="107" y="150" font-size="12" fill="var(--fg)" text-anchor="start">already received the max number of times</text>
<rect x="30" y="172" width="200" height="54" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="130" y="195.6" font-size="13" fill="var(--fg)" text-anchor="middle">DEAD-LETTER QUEUE</text>
<text x="130" y="211.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">park it, raise an alarm</text>
</g>
</svg>
```

```narrate
Every message moves between a few states. [[visible]] A new message is visible and waiting. [[receive]] When a worker receives it, [[flight]] it goes in flight and is hidden. [[ack]] If the worker acks, it is deleted. [[back]] If the worker nacks, or the time runs out, it becomes visible again. [[dlq]] But a message that has already been received the maximum number of times is parked in the dead-letter queue instead.
```

> **Not this:** retry forever. One bad message then burns worker time for ever, and hides the real problem.

> **Trap:** a max receives of 1. One network hiccup would park a perfectly good message.

## Your turn

Open `visibility_queue.py` and implement `VisibilityQueue(visibility_timeout, max_receives, now)`. `now()` is an injected clock, in seconds.

- `send(body)` returns a new id: 1, 2, 3 and so on
- `receive()` returns the oldest **visible** message, or `None`. It hides it for `visibility_timeout` seconds and adds 1 to `receive_count`
- If a visible message was already received `max_receives` times, move it to `dead_letters` and look at the next one
- `ack(id)` deletes it and returns `True`, or `False` if unknown. `nack(id)` makes it visible now

Run the tests from the Run button, or `pnpm lesson test systemdesign/06-queues-and-async-work`.

```hint
Keep two dicts: the messages by id, and the time each one becomes visible (`visible_at`). A new message is visible at `now()`.
```

```hint
In `receive`, loop over `sorted(self.messages)`. Skip ids where `visible_at > now()`. Dead-letter the ones that hit `max_receives`. For the first healthy one, bump the count, set a new `visible_at`, and return it.
```

```hint
`nack` just sets `visible_at[id] = now()`. `ack` deletes the id from both dicts. Both ignore unknown ids (ack returns False).
```
