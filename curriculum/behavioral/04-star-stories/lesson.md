---
title: STAR stories
lang: none
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: []
sources:
  - https://www.techinterviewhandbook.org/behavioral-interview/
  - https://successworks.wisc.edu/the-basics/preparing-for-your-interview-2/the-star-method/
  - https://rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices
  - https://www.metacareers.com/blog/preparing-for-your-software-engineering-interview-at-meta/
  - https://monzo.com/blog/demystifying-the-backend-engineering-interview-process
  - https://www.dayone.careers/blog/amazon-interview-preparation-comprehensive-guide/
---

## What the question really tests

"Tell me about a time you..."

The interviewer is not curious about the story. They are looking for **evidence** of how you behave.

- Past behavior shows patterns (Google)
- Follow-up questions dig for detail: "What exactly did you do?" (Google plans them in advance)
- Answers are scored against a rubric (lesson 01)

> **Why:** a story you really lived survives the follow-ups. An invented one breaks at the second "and then what did you do?"

```narrate
Tell me about a time you. The interviewer is not curious about the story itself. They are looking for evidence of how you behave. Google says behavioral questions reveal patterns, and its follow-up questions are planned in advance to dig for detail. So pick a story you really lived. It survives the follow-ups.
```

## STAR in four steps

```svg STAR as time. Action and Result take most of your two minutes, because they hold the proof
<svg viewBox="0 0 520 200" role="img" aria-label="Four STAR parts sized by how much of the answer each should take">
  <g data-cue="situation" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="12" y="20" width="70" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="47" y="49" font-size="20" fill="var(--fg)">S</text>
    <text x="47" y="82" font-size="11" fill="var(--fg-muted)">15%</text>
    <text x="47" y="102" font-size="11" fill="var(--fg)">Situation</text>
    <text x="47" y="118" font-size="10" fill="var(--fg-muted)">1 sentence</text>
  </g>
  <g data-cue="task" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="86" y="20" width="46" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="109" y="49" font-size="20" fill="var(--fg)">T</text>
    <text x="109" y="82" font-size="11" fill="var(--fg-muted)">10%</text>
    <text x="109" y="102" font-size="11" fill="var(--fg)">Task</text>
    <text x="109" y="118" font-size="10" fill="var(--fg-muted)">my goal</text>
  </g>
  <g data-cue="action" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="136" y="20" width="216" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="244" y="49" font-size="20" fill="var(--fg)">A</text>
    <text x="244" y="82" font-size="11" fill="var(--fg-muted)">45%</text>
    <text x="244" y="102" font-size="11" fill="var(--fg)">Action: what I did</text>
    <text x="244" y="118" font-size="10" fill="var(--fg-muted)">steps in order, with "I"</text>
    <text x="244" y="134" font-size="10" fill="var(--fg-muted)">and why I chose them</text>
  </g>
  <g data-cue="result" font-family="var(--font-mono)" text-anchor="middle">
    <rect x="356" y="20" width="152" height="44" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="432" y="49" font-size="20" fill="var(--fg)">R</text>
    <text x="432" y="82" font-size="11" fill="var(--fg-muted)">30%</text>
    <text x="432" y="102" font-size="11" fill="var(--fg)">Result: what changed</text>
    <text x="432" y="118" font-size="10" fill="var(--fg-muted)">a number, and</text>
    <text x="432" y="134" font-size="10" fill="var(--fg-muted)">what I learned</text>
  </g>
</svg>
```

```narrate
Four steps. [[situation]] Situation: one sentence on where and when. Keep it short. [[task]] Task: what you had to achieve, in a few words. [[action]] Action is the biggest part. Say what you did, step by step, and why you chose it. [[result]] Result comes next: what changed, with a number, and what you learned. The percentages are a rule of thumb, not a law.
```

> **Why:** Situation and Task only set the stage. The Tech Interview Handbook says the **Actions** show the repeatable behaviors that interviewers evaluate. The Result proves it worked.

> **Trap:** saying "Situation... Task..." out loud sounds like a form. Use STAR as a checklist in your head.

## Action: say "I"

"We" hides what **you** did. The interviewer must score you, not your team.

| Weak | Strong |
|---|---|
| We decided to add an index. | I compared two query plans, saw a full table scan, and added an index. |
| We fixed the bug. | I reproduced the bug, wrote a failing test, then fixed it. |

- "We" is fine for context: "our team of four"
- "I" is for your steps
- Never present team work as your own

Monzo: "distinguish the things you led personally". The University of Wisconsin: "use the word I, not we".

```quiz
q: Which sentence is a strong Action?
options:
  - We improved the page speed.
  - I profiled the page, found one slow query, and added an index.
  - The team found the problem.
answer: 1
why: It names your own steps in order. The other two hide who did what.
```

```narrate
In the action part, say I. The word we hides what you did, and the interviewer has to score you, not your team. Use we for context, like our team of four. Use I for your steps. For example, I compared two query plans, saw a full table scan, and added an index. Never present team work as your own.
```

## Result: put a number on it

- "The page loaded in 0.8 seconds instead of 4"
- "The weekly report went from 3 hours to 20 minutes"
- "25 tests, from none"

**No obvious number?** Count something: rows, users, hours, bugs, errors, requests, time. Say "about" if you estimate. Never invent one.

Also say **what you learned**. Say the result without waiting to be asked.

> **Why:** a number lets the interviewer compare you with other candidates. A coaching site run by ex-Amazon staff says to quantify the impact in every story.

```narrate
End with the result, and put a number on it. The page loaded in under one second instead of four. The weekly report went from three hours to twenty minutes. If you have no obvious number, count something: rows, users, hours, bugs, or time. Say about if you are estimating, and never invent one. Then say what you learned, without waiting to be asked.
```

## Five stories cover most questions

Do not memorize one answer per question. Prepare **five stories** once. The Tech Interview Handbook suggests 3 to 5 projects with high impact, complexity and personal involvement. A coaching site run by ex-Amazon staff suggests 8 to 12 for Amazon's loop.

```svg Five prepared stories on the left. Each line shows a question one story can answer
<svg viewBox="0 0 520 250" role="img" aria-label="Five stories mapped to five common behavioral questions">
  <g data-cue="links" fill="none" stroke="var(--fg-muted)" stroke-width="1.5">
    <path d="M180 29 L340 29"/>
    <path d="M180 29 L340 129"/>
    <path d="M180 29 L340 229"/>
    <path d="M180 79 L340 29"/>
    <path d="M180 79 L340 79"/>
    <path d="M180 129 L340 129"/>
    <path d="M180 179 L340 179"/>
    <path d="M180 229 L340 229"/>
  </g>
  <g data-cue="stories" font-family="var(--font-mono)" font-size="12" fill="var(--fg)">
    <rect x="10" y="12" width="170" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="34">A  My own project</text>
    <rect x="10" y="62" width="170" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="84">B  A mistake I fixed</text>
    <rect x="10" y="112" width="170" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="134">C  I learned fast</text>
    <rect x="10" y="162" width="170" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="184">D  A team problem</text>
    <rect x="10" y="212" width="170" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="234">E  A tight deadline</text>
  </g>
  <g data-cue="questions" font-family="var(--font-mono)" font-size="12" fill="var(--fg)">
    <rect x="340" y="12" width="170" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="350" y="34">Show ownership</text>
    <rect x="340" y="62" width="170" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="350" y="84">A failure</text>
    <rect x="340" y="112" width="170" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="350" y="134">Learn something fast</text>
    <rect x="340" y="162" width="170" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="350" y="184">A conflict</text>
    <rect x="340" y="212" width="170" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="350" y="234">Work under pressure</text>
  </g>
</svg>
```

```narrate
[[stories]] On the left are five stories you prepare once. A, your own project. B, a mistake you fixed. C, something you learned fast. D, a team problem. E, a tight deadline. [[questions]] On the right are common questions. [[links]] Each line shows a story that can answer it. Story A answers three different questions. So five stories cover most of what they can ask.
```

> **Not this:** one memorized answer per question. The Tech Interview Handbook says drilling common questions is unlikely to be your best preparation.

```quiz
q: A question asks about a failure. Which story do you use?
options:
  - Story B, a mistake I fixed
  - Story A, my own project, but only the good parts
  - Make up a failure that sounds small
answer: 0
why: Meta says to be honest about failures and what you learned. A fixed mistake with a lesson is a strong answer.
```

## Say it out loud

1. Write five stories as **bullets**: S, T, A, R. Not a script.
2. Mark each with the questions it can answer.
3. Pick one story. Tell it in 2 minutes. Record yourself.
4. Listen for three things:
   - Did I say "I" in the Action?
   - Is there a number in the Result?
   - Did I say what I learned?

Career changer? Your old job and the switch itself are stories too.

```narrate
Write your five stories as bullets, not a script, and mark which questions each one can answer. Then pick one and tell it out loud in two minutes while you record yourself. Listen for three things. Did I say I in the action? Is there a number in the result? Did I say what I learned? If you are a career changer, remember that your old job, and the switch itself, are stories too.
```
