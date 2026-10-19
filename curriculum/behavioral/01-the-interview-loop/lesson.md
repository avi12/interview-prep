---
title: The interview loop
lang: none
minutes: 12
level: junior
roles: [backend, analyst, ai]
files: []
sources:
  - https://www.metacareers.com/blog/preparing-for-your-software-engineering-interview-at-meta/
  - https://monzo.com/blog/demystifying-the-backend-engineering-interview-process
  - https://rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices
  - https://amazon.jobs/en-gb/landing_pages/in-person-interview
  - https://www.jointaro.com/interviews/companies/jpmorgan-chase/experiences/junior-software-developer-israel-october-27-2020-no-offer-positive-4f272598/
---

## Why there is a loop

A hiring loop is a row of **gates**. Each gate tests **one thing**. Fail one gate and you stop, even if the others went well.

So you do not prepare for "the interview". You prepare for five different ones.

| Role | Rounds | Time |
|---|---|---|
| Backend, junior to mid | 3 to 5 | 3 to 6 weeks |
| Data analyst, startup | 2 to 3 | 1 to 2 weeks |
| Data analyst, big tech | 4 to 5 | 3 to 5 weeks |
| AI engineer | 3 to 5 | 2 to 6 weeks |

These are estimates from interview guides and candidate reports. Small samples. Use them as a rough map.

```narrate
A hiring loop is a row of gates, and each gate tests one thing. Fail one and you stop, even if the others went well. Guides report three to five rounds over three to six weeks for backend roles, and shorter loops at startups. So you are not preparing for one interview. You are preparing for five different ones.
```

## The five gates

Same order at most companies. The names change. The jobs of the gates do not.

```svg Five gates in order. Each tests a different thing, so each needs a different kind of practice
<svg viewBox="0 0 520 220" role="img" aria-label="Timeline of five interview stages with what each tests and how long it takes">
  <path d="M8 42 L504 42" stroke="var(--border)" stroke-width="2" fill="none"/>
  <polygon points="502,35 514,42 502,49" fill="var(--border)"/>
  <g data-cue="recruiter" font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <rect x="8" y="20" width="92" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="54" y="46" fill="var(--fg)">1 Recruiter</text>
    <text x="54" y="88" fill="var(--fg)">fit and pay</text>
    <text x="54" y="104" fill="var(--fg-muted)">15-30 min</text>
  </g>
  <g data-cue="coding" font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <rect x="108" y="20" width="92" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="154" y="46" fill="var(--fg)">2 Coding</text>
    <text x="154" y="88" fill="var(--fg)">your code</text>
    <text x="154" y="104" fill="var(--fg-muted)">45-60 min</text>
    <text x="154" y="120" fill="var(--fg-muted)">or take-home</text>
  </g>
  <g data-cue="design" font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <rect x="208" y="20" width="92" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="254" y="46" fill="var(--fg)">3 Design</text>
    <text x="254" y="88" fill="var(--fg)">trade-offs</text>
    <text x="254" y="104" fill="var(--fg-muted)">about 60 min</text>
    <text x="254" y="120" fill="var(--fg-muted)">junior: light</text>
  </g>
  <g data-cue="behavioral" font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <rect x="308" y="20" width="92" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="354" y="46" fill="var(--fg)">4 Behavioral</text>
    <text x="354" y="88" fill="var(--fg)">how you work</text>
    <text x="354" y="104" fill="var(--fg-muted)">45-60 min</text>
  </g>
  <g data-cue="hr" font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <rect x="408" y="20" width="92" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="454" y="46" fill="var(--fg)">5 HR</text>
    <text x="454" y="88" fill="var(--fg)">the deal</text>
    <text x="454" y="104" fill="var(--fg-muted)">references</text>
  </g>
  <g data-cue="weeks" font-family="var(--font-mono)" font-size="12">
    <path d="M8 170 L360 170" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <path d="M8 162 L8 178 M360 162 L360 178" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <text x="8" y="196" fill="var(--fg)">3 to 5 rounds, 3 to 6 weeks in total</text>
  </g>
</svg>
```

```narrate
Read left to right. [[recruiter]] First, a short call with a recruiter. It checks fit and pay, and explains the process. [[coding]] Next is coding, live or as a take-home task. [[design]] Then a design or case round, which is light for juniors. [[behavioral]] After that, the behavioral round asks how you work with people. [[hr]] Last, human resources handles references and the offer. [[weeks]] All of it usually takes three to six weeks.
```

> **Why:** each gate has a different judge. One hour of practice is not worth the same at every gate. Know the gate, then spend your hours there.

> **Not this:** "I will only do LeetCode." Code is two gates of five. The others can end the loop before or after it.

## Recruiter call and HR

The **recruiter call** is a real gate, not small talk.

- It checks motivation, pay, availability
- It explains the process (Monzo promises next steps, so you are not left hanging)
- In Israel, reports say it also asks about army service and degree

**HR** comes last. References, then the offer.

> **Trap:** a vague answer to "why this role?" can end the loop before any code. Lesson 03 gives you the answer.

```narrate
The recruiter call is a real gate, not small talk. It checks why you want this role, what pay you expect, and when you can start. In Israel, reports say it can also ask about army service and your degree. Human resources comes at the end, with references and the offer.
```

```quiz
q: A recruiter call is booked for tomorrow. What is it mostly for?
options:
  - Solving a hard algorithm
  - Checking fit, motivation and pay, and explaining the process
  - Designing a system
answer: 1
why: The first gate is about you and the logistics. Technical depth comes in later rounds.
```

## Coding: take-home or live

| Format | What it looks like | Judged on |
|---|---|---|
| Take-home | About 2 hours of work, about 1 week to send it back, then a walkthrough | Clean structure, a README, tests, no extra features |
| Live | 45 to 60 minutes with an engineer | How you think, not only the answer |

Monzo says its pair exercise is not a speed test and not LeetCode style. Meta's is 45 minutes: 35 of coding.

In Israel: Check Point sends 3 online LeetCode questions. Others send a 1 to 3 day task, then a walkthrough.

```narrate
Coding comes in two shapes. A take-home task gives you about a week to send back two hours of work, and then you walk through it. A live session lasts forty-five to sixty minutes. Monzo says its pair exercise is not a speed test. Meta gives thirty-five minutes of coding. In Israel, some firms start with an online test of three easy to medium questions.
```

## Design, case or build

Every role has one round that is **not** plain coding.

| Role | The round | At junior level |
|---|---|---|
| Backend | System design, about 60 min | One small scenario, say the trade-offs |
| Analyst | Live SQL, 45 to 60 min, plus a case | "Why did this metric drop?" |
| AI | Build a small RAG endpoint, about 40 min | Show how you check the output |

In Israel, junior design is often a talk about the architecture of **your own** take-home.

> **Not this:** "I am junior, so I will skip it." The round is lighter, not missing. About 4 in 10 junior backend postings mention it.

```narrate
Every role has one round that is not plain coding. Backend roles get a system design talk of about an hour, but for juniors it is one small scenario. Analysts get live S Q L and a case, like why a metric dropped. A I roles may build a small retrieval endpoint in about forty minutes. In Israel, juniors are often asked to explain the design of their own take-home.
```

## Behavioral round

You are asked about the **past**: "Tell me about a time when..."

- Google asks every candidate the same questions and scores them on one rubric. The rubric lists what a poor, borderline, solid and outstanding answer covers
- Meta's is 45 minutes. Use STAR, be honest about failures
- Monzo's is 1 hour, 2 interviewers. Separate what **you** led from what others did
- Amazon: each interviewer in the loop checks different things

```quiz
q: How does Google score a behavioral answer?
options:
  - By gut feeling
  - Against a rubric with example answers from poor to outstanding
  - By how long you speak
answer: 1
why: Google describes standardized rubrics so all reviewers share one view of what a good answer covers.
```

```narrate
The behavioral round asks about the past. Tell me about a time when. At Google every candidate gets the same questions and is scored on one rubric. At Meta it lasts forty-five minutes, and honesty about failure is valued. At Monzo, you must separate what you led from what others did. This round is where your story, not your code, is graded.
```

## Israel: what changes

- "Junior" often means one to two years. Students and interns are the real entry door
- Interviews are usually Hebrew with English tech terms. Ads at product firms are English
- Reports show a junior loop at a large bank as two steps: a data structures interview, then a manager talk about team fit and your interests
- Larger firms may run a full day with many candidates for one or two seats

> **Why:** you cannot control the market. You can control how ready you are at each gate.

These are anecdotes from candidate reports, not rules.

```narrate
Israel has a few differences. A junior role often asks for one to two years, and student jobs are the real way in. Interviews are usually in Hebrew with English technical words. Reports show some junior loops with just two steps, a data structures interview and a talk with the manager. These are stories from candidates, not rules, so ask the recruiter about your loop.
```

## Say it out loud

Stand up. Set a timer for 60 seconds. Explain the five gates to an imaginary friend. No notes.

- Name each gate in order
- Say what each one tests
- Say how long the whole loop takes

Then look at the diagram and fix what you missed. Next, open the careers page of one company you want and write down its **real** stages.

```narrate
Stand up and set a timer for sixty seconds. Explain the five gates to an imaginary friend, with no notes. Name each gate in order, say what it tests, and say how long the whole loop takes. Then check the diagram and fix what you missed. After that, find one company you want and write down its real stages.
```
