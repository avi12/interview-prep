---
title: Your twelve-week plan
lang: none
minutes: 10
level: junior
roles: [backend, analyst, ai]
files: []
sources:
  - https://www.techinterviewhandbook.org/coding-interview-study-plan/
  - https://www.frontiersin.org/articles/10.3389/feduc.2021.581216/full
  - https://www.sciencedaily.com/releases/2013/01/130110111734.htm
  - https://www.metacareers.com/blog/preparing-for-your-software-engineering-interview-at-meta/
---

## Pick your order by role

This course has ten tracks. You will not do all of them. Pick by the job you want.

| Role | First | Next | Light touch |
|---|---|---|---|
| Backend | foundations, sql | backend, testing | auth, systemdesign |
| Data analyst | sql, analyst | foundations | testing |
| AI engineer | foundations, ai | backend, testing | sql, systemdesign |

Everyone does **behavioral** from week 1.

> **Why:** the orders follow what junior ads ask most. Backend: SQL, REST and tests (58%, 71% and 78% of 45 junior ads). Analyst: SQL. AI: Python, one LLM API, basic RAG.

> **Not this:** all ten tracks, top to bottom. It does not fit in twelve weeks, and half of it will not match your target job.

```narrate
This course has ten tracks, and you will not do all of them. Pick by the job you want. Backend starts with foundations and S Q L. Analysts start with S Q L and the analyst track. A I engineers start with foundations in Python, then the A I track. Everyone does the behavioral track from the first week.
```

## One week

```svg One week: a lesson every day, three coding problems, one mock interview, one review. About five to six hours
<svg viewBox="0 0 520 190" role="img" aria-label="Seven day week with lessons, problems, a mock interview and a review">
  <g font-family="var(--font-mono)" font-size="11" text-anchor="middle" fill="var(--fg-muted)">
    <text x="45" y="22">Day 1</text>
    <text x="116" y="22">Day 2</text>
    <text x="187" y="22">Day 3</text>
    <text x="258" y="22">Day 4</text>
    <text x="329" y="22">Day 5</text>
    <text x="400" y="22">Day 6</text>
    <text x="471" y="22">Day 7</text>
  </g>
  <g data-cue="lesson" font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)">
    <rect x="14" y="34" width="63" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="45" y="56">lesson</text>
    <rect x="85" y="34" width="63" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="116" y="56">lesson</text>
    <rect x="156" y="34" width="63" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="187" y="56">lesson</text>
    <rect x="227" y="34" width="63" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="258" y="56">lesson</text>
    <rect x="298" y="34" width="63" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="329" y="56">lesson</text>
  </g>
  <g data-cue="problem" font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)">
    <rect x="14" y="76" width="63" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="45" y="98">problem</text>
    <rect x="156" y="76" width="63" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="187" y="98">problem</text>
    <rect x="298" y="76" width="63" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="329" y="98">problem</text>
  </g>
  <g data-cue="mock" font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)">
    <rect x="369" y="34" width="63" height="34" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="3"/>
    <text x="400" y="56">mock</text>
  </g>
  <g data-cue="review" font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)">
    <rect x="440" y="34" width="63" height="34" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="5 3"/>
    <text x="471" y="56">review</text>
  </g>
  <text x="14" y="160" font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">about 5 to 6 hours a week</text>
</svg>
```

```narrate
Look at one week. [[lesson]] Days one to five each have one lesson. [[problem]] On days one, three and five, add one LeetCode problem. [[mock]] Day six is a mock interview, recorded or with a person. [[review]] Day seven is a short review of your mistakes, and then rest.
```

- 5 lessons, 10 to 25 minutes each
- 3 LeetCode problems, easy or medium, 30 to 45 minutes each
- Say your thoughts out loud while you solve (lesson 05)

The Tech Interview Handbook suggests about 11 hours a week for broad prep. This plan is lighter on purpose. Short and regular beats long and rare.

## Twelve weeks, three phases

| Weeks | Phase | What you do |
|---|---|---|
| 1 to 4 | Core | foundations and your first track. Behavioral 01 to 03 |
| 5 to 8 | Role | finish your track. Behavioral 04 and 05. Write 5 stories |
| 9 to 12 | Mix | redo your mistake log. Behavioral 06. Mocks with a real person |

**Mocks:** record yourself in weeks 1 to 6. From week 7, use a real person. The Tech Interview Handbook says to start booking mocks about 60% of the way through a plan.

> **Why:** apply around week 8. A loop takes 3 to 6 weeks (lesson 01). If you wait for week 12, your first offer arrives in week 15 to 18.

```narrate
The twelve weeks have three phases. Weeks one to four are the core: foundations and your first track. Weeks five to eight are your role track and your stories. Weeks nine to twelve mix everything and add mock interviews with a real person. Start applying around week eight, because a loop takes three to six weeks.
```

## The mistake log

Every wrong quiz answer and every failed problem gets **one row**.

| Date | Task | What went wrong | Rule to remember | Retry on |
|---|---|---|---|---|
| Mon | Valid Parentheses | popped an empty stack | check empty first | Tue |

Retry **tomorrow**, then after **a week**, then after **about three weeks**. Do it without looking. Pass three times and the row retires.

```narrate
Keep a mistake log. Every wrong answer and every failed problem gets one row: what went wrong, and the rule to remember. Then retry without looking, the next day, after a week, and after about three weeks. When you pass three times, retire the row.
```

```quiz
q: You failed a window-function problem on Monday. When do you retry it first?
options:
  - Never, move on to new problems
  - Tomorrow, then in a week, then in about three weeks
  - Right now, five times in a row
answer: 1
why: Spreading tries over time and testing yourself without notes are the two techniques that ranked highest.
```

## Why this works

A 2021 review of ten learning techniques ranked two at the top:

- **Spreading practice over time** (effect size 0.85)
- **Testing yourself** (0.74)

An earlier review rated rereading and highlighting low. In the 2021 review they also sat near the bottom (0.47 and 0.44).

The exact days (1, 7, 21) are a rule of thumb, not a result. Most studies measured facts, not interview skills.

> **Not this:** reread the lesson. It feels like work, but it ranked low in the older review and in the lower half of the 2021 one. Cover the answer and try to say it instead.

```narrate
Why does the log work? A big review of ten learning techniques ranked two at the top: spreading practice over time, and testing yourself. Rereading and highlighting were rated low. The exact days are only a rule of thumb, because most studies measured facts, not interview skills. So cover the answer and say it, instead of reading it again.
```

## Say it out loud

Say your plan in 30 seconds. Fill the blanks:

- "My target role is ___."
- "My first two tracks are ___ and ___."
- "My mock interview day is ___."
- "I apply in week ___."

Then write it on a sticky note and put it where you study.

```narrate
Say your plan out loud in thirty seconds. My target role is blank. My first two tracks are blank and blank. My mock interview day is blank. I start applying in week blank. Then write it on a sticky note and put it where you study.
```
