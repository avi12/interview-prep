---
title: Thinking aloud while coding
lang: none
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: []
sources:
  - https://www.metacareers.com/blog/preparing-for-your-software-engineering-interview-at-meta/
  - https://monzo.com/blog/demystifying-the-backend-engineering-interview-process
  - https://formation.dev/blog/5-common-mistakes-engineers-make-in-technical-interviews
  - https://www.techinterviewhandbook.org/coding-interview-cheatsheet/
  - https://www.techinterviewhandbook.org/coding-interview-prep/
  - https://prachub.com/resources/what-to-do-when-you-get-stuck-in-a-coding-interview-hints-recovery-and-communication
  - https://www.codecademy.com/resources/blog/what-to-say-if-you-dont-know-interview-answer
  - https://leaddev.com/hiring-onboarding-retention/how-spot-high-potential-junior-talent-during-interviews
---

## Silence tells them nothing

In a coding round the interviewer grades **how you think**, not only the final code.

- Meta: "We pay a lot of attention to the way you solve problems"
- Monzo wants to see your approach and how you build step by step
- Formation: "Silence deprives interviewers of signal"
- A hiring manager for juniors watches if you ask questions and work **with** the interviewer (LeadDev)

> **Not this:** code in silence, then explain at the end. Formation says a correct solution can score lower if the explanation is hard to follow.

Say your **decisions and reasons**, not every passing thought. Plain English is enough.

```narrate
In a coding round, the interviewer grades how you think, not only the final code. Meta says it pays a lot of attention to the way you solve problems. If you go silent, the interviewer has nothing to score. So say your decisions and your reasons, not every passing thought. Plain, simple English is enough.
```

## Five steps, five sentences

```svg Five steps for any problem. Each has one sentence you can say almost word for word
<svg viewBox="0 0 520 190" role="img" aria-label="Five steps of a coding interview with a sample phrase for each">
  <g data-cue="restate" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="8" y="16" width="92" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="54" y="38" font-size="11" fill="var(--fg)">1 Restate</text>
    <text x="54" y="72" font-size="10" fill="var(--fg-muted)">So I get a list</text>
    <text x="54" y="86" font-size="10" fill="var(--fg-muted)">and a target,</text>
    <text x="54" y="100" font-size="10" fill="var(--fg-muted)">and return two</text>
    <text x="54" y="114" font-size="10" fill="var(--fg-muted)">indexes. Right?</text>
  </g>
  <g data-cue="ask" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="108" y="16" width="92" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="154" y="38" font-size="11" fill="var(--fg)">2 Ask</text>
    <text x="154" y="72" font-size="10" fill="var(--fg-muted)">Can the list be</text>
    <text x="154" y="86" font-size="10" fill="var(--fg-muted)">empty? Can</text>
    <text x="154" y="100" font-size="10" fill="var(--fg-muted)">numbers repeat?</text>
    <text x="154" y="114" font-size="10" fill="var(--fg-muted)">How big is it?</text>
  </g>
  <g data-cue="plan" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="208" y="16" width="92" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="254" y="38" font-size="11" fill="var(--fg)">3 Plan</text>
    <text x="254" y="72" font-size="10" fill="var(--fg-muted)">Brute force is</text>
    <text x="254" y="86" font-size="10" fill="var(--fg-muted)">two loops, slow.</text>
    <text x="254" y="100" font-size="10" fill="var(--fg-muted)">A map needs one</text>
    <text x="254" y="114" font-size="10" fill="var(--fg-muted)">pass. I pick it.</text>
  </g>
  <g data-cue="code" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="308" y="16" width="92" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="354" y="38" font-size="11" fill="var(--fg)">4 Code</text>
    <text x="354" y="72" font-size="10" fill="var(--fg-muted)">I look up the</text>
    <text x="354" y="86" font-size="10" fill="var(--fg-muted)">partner first,</text>
    <text x="354" y="100" font-size="10" fill="var(--fg-muted)">then store this</text>
    <text x="354" y="114" font-size="10" fill="var(--fg-muted)">number.</text>
  </g>
  <g data-cue="test" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="408" y="16" width="92" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="454" y="38" font-size="11" fill="var(--fg)">5 Test</text>
    <text x="454" y="72" font-size="10" fill="var(--fg-muted)">Let me try an</text>
    <text x="454" y="86" font-size="10" fill="var(--fg-muted)">empty list, a</text>
    <text x="454" y="100" font-size="10" fill="var(--fg-muted)">repeat, and a</text>
    <text x="454" y="114" font-size="10" fill="var(--fg-muted)">normal case.</text>
  </g>
  <text x="8" y="160" font-family="var(--font-mono)" font-size="12" fill="var(--fg)">Start coding only after the interviewer says yes to your plan</text>
</svg>
```

```narrate
Follow five steps. [[restate]] First, restate the problem in your own words and check it. [[ask]] Second, ask two or three clarifying questions. [[plan]] Third, say the slow brute force way and its cost, then pick a better plan. [[code]] Fourth, code while you explain each step. [[test]] Last, test an empty case, a repeat, and a normal case. Start coding only after the interviewer agrees with your plan.
```

> **Why:** the Tech Interview Handbook says to discuss the trade-offs of each approach and get the interviewer's go-ahead before you code. A wrong plan is cheap to fix before the first line, expensive after.

## Ask clarifying questions

Ask **two or three** before you type (Tech Interview Handbook). It is "a sign of maturity, not uncertainty" (Formation).

| Ask about | Example |
|---|---|
| Input | "Can the list be empty? Can numbers repeat?" |
| Size | "How many items? That decides if a slow way is fine." |
| Output | "What do I return if there is no answer?" |
| Edge cases | "Are negative numbers possible?" |

- No answer? Say your assumption: "I will assume no duplicates."
- Do not ask what the prompt already says. It looks like you did not read it

> **Trap:** typing in the first minute. You may solve the wrong problem, fast.

```narrate
Ask two or three clarifying questions before you type. Formation calls it a sign of maturity, not uncertainty. Ask about the input, like can the list be empty. Ask about the size, because it decides if a slow way is fine. Ask what to return when there is no answer. If nobody answers, say your assumption out loud. And do not ask what the prompt already says.
```

## When you are stuck

Stuck is not failure. What you do **next** is the signal.

1. Pause, and say so: "Let me think for a moment"
2. Restate the problem and your assumptions
3. Say a working slow version and its cost
4. Trace a tiny example by hand
5. Compare two directions, pick one, say why
6. Ask for the **smallest** hint, and say what you tried

| Weak | Strong |
|---|---|
| (silence for two minutes) | "Let me check this on a small input." |
| "I don't know." | "I have a working version, but it is slow. I am looking for a way to remember what I have seen." |
| "Is it dynamic programming?" | "I am weighing sorting against a hash map. Order matters, so I lean to the map. Does that fit?" |
| "Just tell me the answer." | "I tried X and ruled out Y. Could you give me a direction?" |

```quiz
q: You have been stuck for a few minutes. What is the best next sentence?
options:
  - "I give up, can you show me?"
  - "I have a slow version that works. I am looking for a way to avoid the repeated lookups. Can you give me a direction?"
  - Say nothing and keep thinking
answer: 1
why: It shows what you have, what you tried, and asks for the smallest help. That is what interviewers can score.
```

```narrate
Being stuck is not failure. What you do next is the signal. Pause and say so. Restate the problem. Say a working slow version and what it costs. Trace a tiny example by hand. Compare two directions and pick one. Then ask for the smallest hint, and say what you already tried. Look at the table. The strong sentences give the interviewer something to work with.
```

## When you do not know

It is fine to not know. It is not fine to bluff.

- One hiring manager calls pretending to know a **huge red flag**
- Monzo: it is fine to say "I don't know" and reason from first principles
- A short pause to think is fine. The same manager says about 30 seconds. Say you are thinking

| Situation | Say |
|---|---|
| A fact you do not know | "I don't know that one. Here is how I would find out." |
| No such experience | "I haven't done that exactly. Can I tell you about something close?" |

> **Why:** a junior is hired to learn. "I will figure it out, and here is how" shows the exact skill they want (curiosity, LeadDev).

```narrate
It is fine to not know. It is not fine to bluff. One hiring manager calls pretending to know a huge red flag. Monzo says it is fine to say you do not know, and reason from first principles. Say, I don't know that one, here is how I would find out. Or, I haven't done that exactly, can I tell you about something close? A junior is hired to learn, and this shows it.
```

## Taking a hint

A hint is not a failure. Interviewers use hints to steer you in the right direction (Tech Interview Handbook).

1. **Do not interrupt.** Let them finish
2. **Say it back:** "So I could track what I have seen as I scan?"
3. **Connect it** to your plan
4. **Use it right away.** Change the code
5. **Credit it:** "Thanks, that hint helped me see the map"

> **Not this:** "I know, I know" and keep the old plan. Or arguing. The Tech Interview Handbook says to stay collaborative and not argue, even if you disagree.

```narrate
A hint is not a failure. Interviewers use hints to steer you in the right direction. Do not interrupt. Say the hint back in your own words. Connect it to your plan and use it right away by changing the code. Then credit it, with something like, thanks, that hint helped me see the map. Do not say I know and keep the old plan.
```

## Say the trade-offs

Good engineers compare. Say it in this shape:

```text
I see two options.
Option A: ___. It is simple, but it costs ___.
Option B: ___. It is faster, but it uses ___.
Because ___ (input size, deadline), I pick ___.
If ___ changed, I would switch to ___.
```

Example from Two Sum: "Option A is two loops. Simple, but about n squared checks. Option B is a hash map. One pass, but extra memory. Because the list can have 200,000 numbers, I pick the map."

```narrate
Good engineers compare options, and you should say it out loud. I see two options. Option A is simple, but it costs this. Option B is faster, but it uses that. Because of the input size, I pick this one. If something changed, I would switch. For example, in Two Sum, two loops are simple but slow, and a hash map is one pass with extra memory. With two hundred thousand numbers, I pick the map.
```

## Say it out loud

Solve one easy problem (Two Sum is fine) in 20 minutes. **Talk the whole time.** Record your voice.

Listen back and count:

- Silences longer than 15 seconds
- Did you restate, and ask 2 questions?
- Did you say the slow way and its cost?
- Did you test an empty case?

Do it again next week with a different problem. If your interview may be in Hebrew, practice that way too: Hebrew sentences, English technical terms.

```narrate
Solve one easy problem in twenty minutes, and talk the whole time while you record your voice. Two Sum is fine. Listen back and count the silences longer than fifteen seconds. Did you restate and ask two questions? Did you say the slow way and its cost? Did you test an empty case? Do it again next week with a different problem.
```
