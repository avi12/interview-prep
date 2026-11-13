---
title: Documenting the ticket
lang: none
minutes: 15
level: junior
roles: [support]
files: []
sources:
  - https://www.atlassian.com/itsm/knowledge-management/what-is-a-knowledge-base
  - https://www.atlassian.com/itsm/knowledge-management
  - https://www.atlassian.com/itsm/service-request-management
---

## Three parts of a good record

Lesson 1 ended with "close and document". Here is what goes in the note.

1. **Problem summary**: the fault as the customer described it, with **no interpretation** yet
2. **Steps taken**: a chronological list with exact details: tools, commands, versions
3. **Outcome and next steps**: solved? Escalation needed? What was the customer told to do?

```svg A real record: problem, steps, outcome, in that order
<svg viewBox="0 0 560 250" role="img" aria-label="Example ticket note in three parts">
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="problem">
      <rect x="10" y="10" width="540" height="56" fill="var(--surface-2)"/>
      <text x="22" y="32" stroke="none" font-weight="700">PROBLEM</text>
      <text x="22" y="52" stroke="none">Laptop shuts off after about 15 minutes of use.</text>
    </g>
    <g data-cue="steps">
      <rect x="10" y="76" width="540" height="104" fill="var(--surface-3)"/>
      <text x="22" y="98" stroke="none" font-weight="700">STEPS</text>
      <text x="22" y="118" stroke="none">1 Event Viewer: critical errors found</text>
      <text x="22" y="136" stroke="none">2 Temperature: normal</text>
      <text x="22" y="154" stroke="none">3 Chipset driver updated to 10.1.18</text>
      <text x="22" y="172" stroke="none">4 BIOS updated to A12</text>
    </g>
    <g data-cue="outcome">
      <rect x="10" y="190" width="540" height="50" fill="var(--primary-container)"/>
      <text x="22" y="210" stroke="none" font-weight="700">OUTCOME</text>
      <text x="22" y="230" stroke="none">Old BIOS was the cause. Stayed on 1 hour+. Call if it returns.</text>
    </g>
  </g>
  <circle class="pkt" cx="538" cy="20" r="5" fill="var(--accent-2)" style="--dy: 55px; --delay: 0ms"/>
  <circle class="pkt" cx="538" cy="84" r="5" fill="var(--primary)" style="--dy: 100px; --delay: 1500ms"/>
</svg>
```

```narrate
[[problem]] Start with the problem, exactly as the customer reported it, with no guessing yet. [[steps]] Then list every step in order, with precise details like the tool, the command, and the version numbers. [[outcome]] Finish with the result: was it solved, does it need escalation, and what was the customer told to do?
```

> **Trap:** writing "fixed it" as the whole note. The next technician learns nothing and has to rediscover the cause.

```quiz
q: Which line belongs in the **steps** part?
options:
  - "Customer is very annoying"
  - "Updated the chipset driver to version 10.1.18"
  - "Probably a virus"
  - "Customer wants a refund"
answer: 1
why: Steps are factual actions with exact versions. Opinions and guesses do not belong there.
```

## Record what failed, and what the customer tried

Write down the attempts that **did not work**. They save the next technician from repeating them. State plainly when a step changed nothing, or helped only partly.

Also record what the customer did **before** calling: restarted the router, checked the cables. That is diagnosis time already saved.

```svg Before the call, the customer already tried things. During the call, some of your steps fail too. Both go in the note
<svg viewBox="0 0 560 170" role="img" aria-label="Timeline of customer actions and failed attempts">
  <path d="M20 80 L540 80" stroke="var(--fg-muted)" stroke-width="3"/>
  <path d="M270 40 L270 120" stroke="var(--fg)" stroke-width="2" stroke-dasharray="4 4"/>
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg)" text-anchor="middle">
    <text x="270" y="30">the call starts</text>
    <g data-cue="before">
      <rect x="40" y="60" width="200" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="140" y="85">restarted router, cables ok</text>
      <text x="140" y="125" fill="var(--fg-muted)">customer, before</text>
    </g>
    <g data-cue="failed">
      <rect x="300" y="60" width="240" height="40" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="420" y="85">DNS flush: no change</text>
      <text x="420" y="125" fill="var(--fg-muted)">you, tried and failed</text>
    </g>
  </g>
  <circle class="pkt" cx="30" cy="80" r="6" fill="var(--accent-2)" style="--dx: 500px; --delay: 0ms"/>
</svg>
```

```narrate
[[before]] First, note what the customer did before calling, like restarting the router or checking the cables. That saves diagnosis time. [[failed]] Second, note what you tried that did not work, such as a DNS flush with no change. The next technician will not waste time repeating it.
```

> **Not this:** logging only the winning fix. The failed steps are exactly the information that stops the next technician from wasting an hour.

```quiz
q: You tried a driver reinstall and nothing changed. What do you write?
options:
  - Nothing, it did not help
  - "Reinstalled the driver: no change"
  - Delete the step so the ticket looks clean
  - "Driver reinstall fixed it"
answer: 1
why: A failed attempt is useful data. Stating "no change" prevents the same dead end later.
```

## Write it professionally

Notes may be read by a customer, a manager or an auditor. Four rules:

- **Objective**: facts only. No slang, no personal opinions
- **Respectful**: written so it can be the basis for future contact
- **Confidential**: no sensitive personal details in general documents, such as passwords or private data
- **Consistent**: same structure every time, whoever the technician is

```svg Same event, two notes: only one is safe to read aloud to the customer
<svg viewBox="0 0 560 150" role="img" aria-label="Bad note versus good note">
  <g data-cue="bad">
    <rect x="10" y="20" width="250" height="100" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="22" y="46" font-family="var(--font-mono)" font-size="12" fill="var(--fg)" font-weight="700">NOT THIS</text>
    <text x="22" y="72" font-family="var(--font-mono)" font-size="12" fill="var(--fg)">"user clueless, pw is</text>
    <text x="22" y="92" font-family="var(--font-mono)" font-size="12" fill="var(--fg)">Summer2026, junk PC"</text>
  </g>
  <g data-cue="good">
    <rect x="300" y="20" width="250" height="100" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="312" y="46" font-family="var(--font-mono)" font-size="12" fill="var(--fg)" font-weight="700">THIS</text>
    <text x="312" y="72" font-family="var(--font-mono)" font-size="12" fill="var(--fg)">"Customer could not log in.</text>
    <text x="312" y="92" font-family="var(--font-mono)" font-size="12" fill="var(--fg)">Password reset, tested ok."</text>
  </g>
</svg>
```

```narrate
[[bad]] This note has an insult, an opinion, and a password written in plain text. Never write this. [[good]] This note states only the facts, names the action taken, and keeps private data out. It could be read to the customer, the manager, or an auditor without any trouble.
```

> **Why:** a note is permanent and shared. Anything in it can come back to you, so write it as if the customer is reading over your shoulder.

```quiz
q: Which note is correct?
options:
  - "Dumb user forgot password again"
  - "Customer's password is Summer2026, reset by me"
  - "Customer could not sign in. Password reset completed and sign-in tested"
  - "Fixed"
answer: 2
why: It is factual, respectful and keeps the secret out of the record.
```

## From ticket to knowledge base

When many notes are clear and consistent, the best ones become **knowledge base** articles that the whole team and even customers can search.

What the organization gains:

- **Consistency**: every customer gets the same standard, whoever answers
- **Time saved**: a proven fix means no re-diagnosis
- **Improvement**: each fault becomes an asset, and repeat faults show what to fix for good

```svg A documented fix becomes a searchable article, and the next ticket is solved from it
<svg viewBox="0 0 560 150" role="img" aria-label="Ticket to knowledge base to next ticket">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="ticket">
      <rect x="10" y="40" width="140" height="60" fill="var(--surface-2)"/>
      <text x="80" y="75" stroke="none">solved ticket</text>
    </g>
    <g data-cue="article">
      <rect x="210" y="40" width="140" height="60" fill="var(--primary-container)"/>
      <text x="280" y="75" stroke="none">KB article</text>
    </g>
    <g data-cue="next">
      <rect x="410" y="40" width="140" height="60" fill="var(--surface-3)"/>
      <text x="480" y="68" stroke="none">next ticket</text>
      <text x="480" y="86" stroke="none">fixed fast</text>
    </g>
  </g>
  <g stroke="var(--fg)" stroke-width="2" fill="none">
    <path d="M150 70 L210 70"/>
    <path d="M350 70 L410 70"/>
  </g>
  <circle class="pkt" cx="150" cy="70" r="6" fill="var(--accent-2)" style="--dx: 60px; --delay: 0ms"/>
  <circle class="pkt" cx="350" cy="70" r="6" fill="var(--ok)" style="--dx: 60px; --delay: 2000ms"/>
</svg>
```

```narrate
[[ticket]] A solved ticket with a clear note is a small piece of knowledge. [[article]] The best ones are turned into knowledge base articles the whole team can search. [[next]] The next time the same fault appears, the technician finds the proven fix and skips the diagnosis. Personal notes become the engine of organizational knowledge.
```

> **Not this:** a private notebook of fixes. It dies with the person who wrote it, and the next technician starts from zero.

```quiz
q: A technician spends an hour on a fault that was solved last month. What was most likely missing?
options:
  - A faster computer
  - A clear ticket note or knowledge base article for the earlier fix
  - A bigger team
  - A longer SLA
answer: 1
why: Documented, findable fixes prevent re-diagnosis, which is the main payoff of good notes.
```
