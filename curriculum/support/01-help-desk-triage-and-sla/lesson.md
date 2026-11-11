---
title: Help desk triage and SLAs
lang: none
minutes: 15
level: junior
roles: [support]
files: []
sources:
  - https://www.atlassian.com/itsm/service-request-management/slas
  - https://www.atlassian.com/incident-management/kpis/common-metrics
  - https://www.atlassian.com/itsm/incident-management/escalation
---

## What a help desk does

The help desk is the **single point of contact** for anyone who needs technical help. Requests arrive by phone, chat, email or a web portal, and every one follows the same path:

1. **Receive and validate**: is this a real, in-scope request? If yes, open a **ticket**. If not, tell the user why
2. **Investigate**: ask questions, reproduce the fault, connect remotely if needed
3. **Resolve or escalate**: fix it, or pass it to a more senior tier with clear notes
4. **Close and document**: write down what fixed it, so the next person finds it

```svg Every request becomes a ticket, then is either fixed at the first tier or escalated, and always ends documented
<svg viewBox="0 0 560 170" role="img" aria-label="Help desk ticket flow">
  <g data-cue="intake" font-family="var(--font-mono)" font-size="13">
    <rect x="10" y="20" width="110" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="65" y="42" text-anchor="middle" fill="var(--fg)">receive</text>
    <text x="65" y="60" text-anchor="middle" fill="var(--fg)">+ validate</text>
  </g>
  <g data-cue="investigate" font-family="var(--font-mono)" font-size="13">
    <path d="M120 45 L150 45" stroke="var(--fg)" stroke-width="2"/>
    <rect x="150" y="20" width="110" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="205" y="50" text-anchor="middle" fill="var(--fg)">investigate</text>
  </g>
  <g data-cue="resolve" font-family="var(--font-mono)" font-size="13">
    <path d="M260 45 L300 45" stroke="var(--ok)" stroke-width="2"/>
    <rect x="300" y="20" width="110" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="355" y="50" text-anchor="middle" fill="var(--fg)">resolve</text>
  </g>
  <g data-cue="escalate" font-family="var(--font-mono)" font-size="13">
    <path d="M205 70 L205 110 L300 110" fill="none" stroke="var(--danger)" stroke-width="2"/>
    <rect x="300" y="90" width="110" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="355" y="117" text-anchor="middle" fill="var(--fg)">escalate</text>
  </g>
  <g data-cue="close" font-family="var(--font-mono)" font-size="13">
    <path d="M410 45 L440 45 M410 112 L430 112 L430 55 L440 55" fill="none" stroke="var(--fg)" stroke-width="2"/>
    <rect x="440" y="20" width="110" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="495" y="42" text-anchor="middle" fill="var(--fg)">close +</text>
    <text x="495" y="60" text-anchor="middle" fill="var(--fg)">document</text>
  </g>
</svg>
```

```narrate
[[intake]] A request comes in and is checked: is it real and in scope? If so, it becomes a ticket. [[investigate]] Next the technician asks questions and reproduces the fault. [[resolve]] Then one of two paths: fix it at the first tier, [[escalate]] or escalate it to a more senior tier with clear notes. [[close]] Either way the ticket ends closed and documented, so the next fix is faster.
```

## Priority is urgency times impact

A queue without order becomes a bottleneck. Each ticket gets a priority from two questions: **how urgent** is it, and **how many people** does it stop?

| Priority | Example | Respond within | Resolve within |
| --- | --- | --- | --- |
| High | server or critical app down | 30 minutes | 2 hours |
| Medium | slow network, shared printer | 2 hours | 8 hours |
| Low | install software, reset a password | 24 hours | 48 hours |

These targets are an example. Every organization writes its own.

> **Why:** the priority is about the **business**, not about who shouts loudest. A calm email about a stopped payroll server beats an angry call about a desktop wallpaper.

```narrate
A queue without order turns into a bottleneck. Each ticket gets a priority from two questions: how urgent is it, and how many people does it stop? High means work has stopped, like a crashed server. Medium hurts but does not stop the business. Low is routine, like installing software. The priority follows business impact, not who complains the loudest.
```

## The SLA turns priority into a clock

An **SLA** (Service Level Agreement) is the written promise between the support team and its customers. For every ticket it sets two clocks, both starting when the ticket opens:

- **Response time**: until a technician first contacts the user
- **Resolution time**: until the fault is fixed and the ticket closed

So the real question is not "which label is highest?" but **"whose deadline comes first?"**

```svg A low ticket opened 23 hours ago is due in 1 hour; a medium ticket opened now is due in 2. The old low one goes first
<svg viewBox="0 0 560 170" role="img" aria-label="Two tickets on a timeline with response deadlines">
  <g data-cue="now" font-family="var(--font-mono)" font-size="12">
    <path d="M30 140 L540 140" stroke="var(--fg-muted)" stroke-width="2"/>
    <path d="M200 30 L200 150" stroke="var(--fg)" stroke-width="2" stroke-dasharray="4 4"/>
    <text x="200" y="164" text-anchor="middle" fill="var(--fg)">now</text>
  </g>
  <g data-cue="low" font-family="var(--font-mono)" font-size="12">
    <rect x="30" y="40" width="250" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="40" y="59" fill="var(--fg)">LOW, opened 23h ago</text>
    <path d="M280 32 L280 76" stroke="var(--danger)" stroke-width="3"/>
    <text x="286" y="59" fill="var(--fg)">due in 1h</text>
  </g>
  <g data-cue="medium" font-family="var(--font-mono)" font-size="12">
    <rect x="200" y="90" width="160" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="210" y="109" fill="var(--fg)">MEDIUM, new</text>
    <path d="M360 82 L360 126" stroke="var(--danger)" stroke-width="3"/>
    <text x="366" y="109" fill="var(--fg)">due in 2h</text>
  </g>
</svg>
```

```narrate
[[now]] The dashed line is now. [[low]] This low priority ticket was opened twenty three hours ago, and its twenty four hour clock runs out in one hour. [[medium]] This medium ticket just arrived, with a two hour clock. The low one breaches first, so it goes first.
```

> **Not this:** sort by the priority label alone. Low tickets then wait forever behind every new medium one and **all** breach their SLA. Sort by the response deadline: opened time plus the target for its priority.

## Measuring the desk: KPIs

The SLA is the promise. **KPIs** (Key Performance Indicators) measure how well the desk keeps it:

| KPI | Measures | Example |
| --- | --- | --- |
| FRT, First Response Time | open to first contact | contacted within 15 minutes |
| RT, Resolution Time | open to closed | high fixed under 60 minutes |
| FCR, First Contact Resolution | share fixed in the first interaction | password fixed on the first call |
| CSAT, Customer Satisfaction | how the user felt | 5 star survey after closing |

> **Why:** FCR is the one interviewers love. A high FCR means no ping-pong between tiers, which is cheaper and builds trust.

```narrate
The service level agreement is the promise, and key performance indicators measure it. First response time is how fast someone answers. Resolution time is how long until it is fixed. First contact resolution is the share fixed in the very first conversation, with no hand-offs. Customer satisfaction is the survey score after closing. First contact resolution is the one to mention in an interview.
```

```quiz
q: A user reports a high priority fault. What does a Level 1 technician do first?
options:
  - Escalate straight to a senior technician
  - Open a ticket and record the problem
  - Reassign it to another team
  - Fix it and only then tell the user
answer: 1
why: Nothing is tracked, timed or measured until a ticket exists, so the ticket comes first.
```

## Tools and AI on the desk

A **ticketing system** turns every request into a ticket with a unique id, so nothing falls between the chairs. Common ones: **Jira Service Management** (IT and dev teams), **Zendesk** (customer service), **ServiceNow** (large enterprises), **Freshdesk** (small and mid-size businesses).

AI is a force multiplier, not a replacement:

- **Categorize and prioritize** each new ticket from its text
- **Route** it to the free technician with the right skill
- **Self-service** chatbots for password resets and simple fixes
- **Agent assist** drafts replies the technician edits

```narrate
A ticketing system gives every request a unique number so nothing gets lost. Jira Service Management, Zendesk, ServiceNow and Freshdesk are the names you will hear. On top of that, artificial intelligence can sort and prioritize tickets, route them to the right person, answer simple requests by itself, and draft replies. It takes the routine work so people can handle the hard problems.
```

```quiz
q: Network tickets kept landing on software experts while network experts sat idle. The new AI tool weighs each ticket's topic against each technician's skill, load and availability. Which capability is that?
options:
  - Automated responses
  - Predictive analytics
  - Routing tickets to the right technician
  - Categorization and prioritization
answer: 2
why: Matching a ticket to a specific person by skill and availability is routing; categorizing only labels the ticket.
```

## Practice: triage the queue

Four tickets are waiting. The rule to apply: priority follows **urgency and impact**, then the SLA clock decides ties.

```narrate
Four tickets are waiting. Apply one rule: priority follows urgency and impact. Think about how many people each problem stops, and how soon, then answer.
```

```quiz
q: Which order should the technician answer these? A critical app has crashed. The office network is slow. A user wants a password reset. A user wants a printer set up.
options:
  - Password reset, printer, slow network, app crash
  - App crash, slow network, password reset or printer
  - Slow network, app crash, printer, password reset
  - Printer, password reset, app crash, slow network
answer: 1
why: The crash stops the business (high, 30 minutes), the slow network hurts everyone but works (medium, 2 hours), and a password or printer is routine (low, 24 hours).
```

```quiz
q: A user's critical application is down and the Level 1 technician has opened a ticket and found the fix needs access they do not have. What is the right next step?
options:
  - Close the ticket and ask the user to try again later
  - Escalate to a senior technician with exact notes of what was tried
  - Leave it until the response deadline is close
  - Reassign it to a random team
answer: 1
why: When the problem is too complex or beyond your authority, escalate, and write down exactly what you checked so the next tier does not start from zero.
```
