---
title: The 45-minute framework
lang: none
minutes: 15
level: junior
roles: [backend, ai]
sources:
  - https://github.com/donnemartin/system-design-primer
  - https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery
  - https://www.hellointerview.com/learn/system-design/problem-breakdowns/bitly
  - https://gist.github.com/jboner/2841832
---

## What the round really tests

A system design round is a **conversation**, not an exam. Roughly 4 in 10 junior backend job posts mention it, and for juniors it is usually one small scenario.

The interviewer watches three things:

- Do you **ask** before you build?
- Do you pick **simple parts** and say why?
- Do you notice **where it breaks**?

For a junior, the interviewer expects to step in with hints. Taking a hint well is a good sign.

> **Why:** a fixed order of steps keeps you calm. When your mind goes blank, you only need to remember the next step.

> **Not this:** open with "I would use Kafka and Redis". Names without reasons sound memorized.

```narrate
A system design round is a conversation, not an exam. The interviewer cares less about the final drawing and more about how you handle a vague question. Do you ask first, pick simple parts, and say why? For a junior, they expect to step in with hints, so listening well counts. A fixed order of steps keeps you calm, because when you blank you only need to remember the next step.
```

## Seven steps on a clock

The System Design Primer teaches four moves: use cases, high-level design, core components, scale. Hello Interview budgets about 5 minutes for requirements, 10 to 15 for the high-level design and 10 for deep dives. This is the same shape with estimates and the data model split out.

The times are a plan, not a rule. Adjust, but never skip a step.

```svg The clock: most time goes to the boxes and the deep dive, but the cheap early steps decide whether they are the right boxes
<svg viewBox="0 0 640 260" role="img" aria-label="Seven interview steps laid out on a 45 minute clock" font-family="var(--font-mono)" font-size="13">
<path d="M214 10 L214 230" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="214" y="248" font-size="12" fill="var(--fg-muted)" text-anchor="middle">0</text>
<path d="M348.7 10 L348.7 230" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="348.7" y="248" font-size="12" fill="var(--fg-muted)" text-anchor="middle">15</text>
<path d="M483.3 10 L483.3 230" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="483.3" y="248" font-size="12" fill="var(--fg-muted)" text-anchor="middle">30</text>
<path d="M618 10 L618 230" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="618" y="248" font-size="12" fill="var(--fg-muted)" text-anchor="middle">45</text>
<g data-cue="requirements">
<text x="10" y="32" font-size="13" fill="var(--fg)" text-anchor="start">1 Requirements</text>
<text x="200" y="32" font-size="13" fill="var(--fg-muted)" text-anchor="end">5 min</text>
<rect x="214" y="17" width="44.9" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="estimates">
<text x="10" y="62" font-size="13" fill="var(--fg)" text-anchor="start">2 Estimates</text>
<text x="200" y="62" font-size="13" fill="var(--fg-muted)" text-anchor="end">3 min</text>
<rect x="258.9" y="47" width="26.9" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="api">
<text x="10" y="92" font-size="13" fill="var(--fg)" text-anchor="start">3 API</text>
<text x="200" y="92" font-size="13" fill="var(--fg-muted)" text-anchor="end">4 min</text>
<rect x="285.8" y="77" width="35.9" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="data">
<text x="10" y="122" font-size="13" fill="var(--fg)" text-anchor="start">4 Data model</text>
<text x="200" y="122" font-size="13" fill="var(--fg-muted)" text-anchor="end">4 min</text>
<rect x="321.7" y="107" width="35.9" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="boxes">
<text x="10" y="152" font-size="13" fill="var(--fg)" text-anchor="start">5 Boxes</text>
<text x="200" y="152" font-size="13" fill="var(--fg-muted)" text-anchor="end">10 min</text>
<rect x="357.6" y="137" width="89.8" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="deep">
<text x="10" y="182" font-size="13" fill="var(--fg)" text-anchor="start">6 Deep dive</text>
<text x="200" y="182" font-size="13" fill="var(--fg-muted)" text-anchor="end">12 min</text>
<rect x="447.4" y="167" width="107.7" height="22" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="wrap">
<text x="10" y="212" font-size="13" fill="var(--fg)" text-anchor="start">7 Bottlenecks</text>
<text x="200" y="212" font-size="13" fill="var(--fg-muted)" text-anchor="end">7 min</text>
<rect x="555.2" y="197" width="62.8" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<text x="200" y="248" font-size="12" fill="var(--fg-muted)" text-anchor="end">minutes</text>
</svg>
```

```narrate
Here is the clock. [[requirements]] First, five minutes of questions: what must it do, and how big is it. [[estimates]] Then three minutes of rough numbers. [[api]] Next the A P I, the verbs of the system. [[data]] Then the data model, the nouns. [[boxes]] Ten minutes on the high level boxes. [[deep]] Twelve minutes going deep on the one or two parts that matter. [[wrap]] Finish with bottlenecks and a short summary.
```

## What to say out loud

Talking is the product. The interviewer cannot grade thoughts you did not say.

| Step | Say this out loud |
|---|---|
| 1 Requirements | "Before I draw: what must it do, for whom, and what matters more, speed or never losing data?" |
| 2 Estimates | "Let me round: 100 million users, 5 reads each a day, so about 5,000 reads a second." |
| 3 API | "Two core calls: create and read. I will write them as endpoints." |
| 4 Data model | "We store one thing, keyed by one id. A relational table is enough." |
| 5 Boxes | "I start simple. I add a part only when a number or a requirement asks for it." |
| 6 Deep dive | "The read path is hot, so I go deeper there. I choose a cache over a bigger database because..." |
| 7 Bottlenecks | "One database is a single point of failure. A replica fixes it and costs some staleness." |

```narrate
Talking is the product, because the interviewer cannot grade thoughts you did not say. At each step use one plain sentence. Ask what matters before you draw. Round the numbers aloud. Name the two core calls. Say you start simple and add parts only when a number asks for them. Whenever you choose something, say what you chose it over, and why.
```

## Estimates: round hard, then decide

Estimates are not for show. They exist to **decide something**.

| Rule of thumb | Round number |
|---|---|
| Seconds in a day | about 100,000 (really 86,400) |
| 1 million requests a day | about 12 a second |
| 1 KB times 1 million | 1 GB |
| Read from memory | about 100 ns |
| Random read from SSD | about 150 microseconds |
| Round trip inside one datacenter | about 500 microseconds |
| Round trip across continents | about 150 ms |

These numbers are from about 2012. Use them for orders of magnitude only.

```svg Each chain ends in a decision: traffic says add a cache, storage says one disk is enough
<svg viewBox="0 0 640 214" role="img" aria-label="Two back of the envelope chains: traffic leads to a cache, storage leads to no sharding" font-family="var(--font-mono)" font-size="13">
<g data-cue="traffic">
<text x="10" y="22" font-size="12" fill="var(--fg-muted)" text-anchor="start">TRAFFIC (example numbers)</text>
<rect x="10" y="30" width="108" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="64" y="54.2" font-size="12" fill="var(--fg)" text-anchor="middle">100M users</text>
<text x="64" y="70.2" font-size="12" fill="var(--fg)" text-anchor="middle">5 reads a day</text>
<rect x="138" y="30" width="108" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="192" y="54.2" font-size="12" fill="var(--fg)" text-anchor="middle">500M reads</text>
<text x="192" y="70.2" font-size="12" fill="var(--fg)" text-anchor="middle">per day</text>
<rect x="266" y="30" width="108" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="54.2" font-size="12" fill="var(--fg)" text-anchor="middle">divide by</text>
<text x="320" y="70.2" font-size="12" fill="var(--fg)" text-anchor="middle">~100k seconds</text>
<rect x="394" y="30" width="108" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="448" y="54.2" font-size="12" fill="var(--fg)" text-anchor="middle">~5k reads</text>
<text x="448" y="70.2" font-size="12" fill="var(--fg)" text-anchor="middle">per second</text>
<rect x="522" y="30" width="108" height="56" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="576" y="54.2" font-size="12" fill="var(--fg)" text-anchor="middle">peak 50k/s</text>
<text x="576" y="70.2" font-size="12" fill="var(--fg)" text-anchor="middle">add a cache</text>
<path d="M118 58 L138 58" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="138,58 128,63 128,53" fill="var(--fg)"/>
<path d="M246 58 L266 58" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="266,58 256,63 256,53" fill="var(--fg)"/>
<path d="M374 58 L394 58" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="394,58 384,63 384,53" fill="var(--fg)"/>
<path d="M502 58 L522 58" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="522,58 512,63 512,53" fill="var(--fg)"/>
</g>
<g data-cue="storage">
<text x="10" y="120" font-size="12" fill="var(--fg-muted)" text-anchor="start">STORAGE (example numbers)</text>
<rect x="10" y="128" width="108" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="64" y="152.2" font-size="12" fill="var(--fg)" text-anchor="middle">1B rows x</text>
<text x="64" y="168.2" font-size="12" fill="var(--fg)" text-anchor="middle">500 bytes</text>
<rect x="138" y="128" width="108" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="192" y="152.2" font-size="12" fill="var(--fg)" text-anchor="middle">= 500 GB</text>
<text x="192" y="168.2" font-size="12" fill="var(--fg)" text-anchor="middle">of data</text>
<rect x="266" y="128" width="108" height="56" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="152.2" font-size="12" fill="var(--fg)" text-anchor="middle">fits one disk</text>
<text x="320" y="168.2" font-size="12" fill="var(--fg)" text-anchor="middle">no shards yet</text>
<path d="M118 156 L138 156" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="138,156 128,161 128,151" fill="var(--fg)"/>
<path d="M246 156 L266 156" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="266,156 256,161 256,151" fill="var(--fg)"/>
</g>
</svg>
```

```narrate
Pick example numbers and round hard. [[traffic]] A hundred million users each read five times a day, which is five hundred million reads. Divide by about a hundred thousand seconds and you get five thousand reads per second, maybe fifty thousand at peak. So the reads go through a cache. [[storage]] For storage, one billion rows of five hundred bytes is five hundred gigabytes. That fits on one disk, so no sharding yet.
```

> **Why:** a number lets you say "so we need X". Without the "so", the math is noise.

> **Not this:** exact arithmetic with a calculator. Round to powers of ten. The interviewer checks the order of magnitude.

```quiz
q: About how many requests per second is 1 million requests per day?
options:
  - 1
  - 12
  - 120
  - 1,200
answer: 1
why: A day has about 100,000 seconds, so 1,000,000 / 100,000 is about 10. The exact answer is 11.6, so "about 12".
```

## API first, then the data

Write the API **before** the boxes. Verbs become endpoints. Nouns become tables.

```text
POST /urls     body: { longUrl }     returns 201 { shortUrl }
GET  /{code}                         returns 302, Location: longUrl
```

```text
urls ( code PRIMARY KEY, long_url, created_at )
```

Every box you draw later must serve one of these calls. If a box serves none, leave it out.

> **Trap:** drawing boxes first. You end up with a diagram that serves no request, and the interviewer cannot tell what the system does.

```narrate
Write the A P I before the boxes. Verbs become endpoints: create a short link, and read a short link. Nouns become tables: one row with the code, the long address, and the creation time. Every box you draw later must serve one of these calls. If a box serves none, leave it out.
```

## Boxes first, then one deep dive

Start with the **simplest design** that meets the requirements. Then ask "where does this break?" and add one part per answer, saying the reason aloud.

Pick the deep dive where the numbers point: the hot read path, the write contention, the biggest data.

```svg A first draft, built left to right. Every box earns its place with a reason
<svg viewBox="0 0 640 236" role="img" aria-label="A first draft: client, load balancer, app servers, cache and database" font-family="var(--font-mono)" font-size="13">
<g data-cue="client">
<rect x="10" y="80" width="92" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="56" y="111.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client</text>
</g>
<g data-cue="balancer">
<path d="M102 107 L136 107" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="136,107 126,112 126,102" fill="var(--fg)"/>
<rect x="136" y="80" width="112" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="192" y="103.6" font-size="13" fill="var(--fg)" text-anchor="middle">Load</text>
<text x="192" y="119.6" font-size="13" fill="var(--fg)" text-anchor="middle">balancer</text>
</g>
<g data-cue="app">
<path d="M248 107 L282 107" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="282,107 272,112 272,102" fill="var(--fg)"/>
<rect x="282" y="66" width="122" height="82" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="343" y="95.6" font-size="13" fill="var(--fg)" text-anchor="middle">App servers</text>
<text x="343" y="111.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">stateless</text>
<text x="343" y="127.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">add more</text>
</g>
<g data-cue="cache">
<path d="M404 94 L438 58" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="438,58 434.8,68.7 427.5,61.8" fill="var(--ok)"/>
<rect x="438" y="20" width="150" height="54" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="513" y="43.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<text x="513" y="59.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">hot reads</text>
</g>
<g data-cue="db">
<path d="M404 122 L438 148" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="438,148 427,145.9 433.1,138" fill="var(--fg)"/>
<path d="M513 74 L513 118" fill="none" stroke="var(--fg-muted)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="513,118 508,108 518,108" fill="var(--fg-muted)"/>
<text x="523" y="100" font-size="12" fill="var(--fg-muted)" text-anchor="start">miss</text>
<rect x="438" y="118" width="150" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="513" y="141.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<text x="513" y="157.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">source of truth</text>
</g>
<text x="10" y="214" font-size="12" fill="var(--fg-muted)" text-anchor="start">Deep dive where the numbers point: here, the read path.</text>
</svg>
```

```narrate
Start at the left. [[client]] The client sends a request. [[balancer]] A load balancer spreads requests, so losing one server is not an outage. [[app]] Stateless app servers hold the logic, and we add more when traffic grows. [[cache]] A cache answers the hot reads from memory. [[db]] The database is the one source of truth, and only cache misses reach it.
```

> **Why:** add a box only when a requirement or a number asks for it. Each box is one more thing that can fail.

> **Not this:** fifteen boxes on day one (queue, CDN, search, microservices). Unexplained boxes invite questions you cannot answer.

## Bottlenecks and the last two minutes

Walk the design once and look for trouble:

- **Single point of failure?** One database, one load balancer
- **Hot spot?** One key or one shard gets most traffic
- **Slow dependency?** Needs a timeout and a plan
- **Data growing?** Storage will outgrow one disk someday

Then close in three sentences: what you built, the main trade-off you chose, and what you would do next.

> **Trap:** going silent when asked "what would break?". Say it: "The database is a single point of failure. A replica fixes it. The cost is that reads may be slightly stale."

```quiz
q: The interviewer says "design a chat app". What is your first move?
options:
  - Draw the database tables
  - Ask what it must do and how big it is
  - Choose between SQL and NoSQL
answer: 1
why: The question is vague on purpose. Requirements and scale decide every later choice, so you ask first.
```

```narrate
Walk the design once and look for trouble. Is there a single point of failure, like one database? Is there a hot spot, where one key gets most of the traffic? Is any dependency slow? Will the data outgrow one disk? Then close in three sentences: what you built, the main trade-off, and what you would do next.
```
