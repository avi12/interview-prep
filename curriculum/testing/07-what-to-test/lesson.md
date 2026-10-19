---
title: What to test, and what to say
lang: none
minutes: 10
level: junior
roles: [backend, analyst, ai]
files: []
sources:
  - https://martinfowler.com/bliki/TestPyramid.html
  - https://martinfowler.com/articles/practical-test-pyramid.html
  - https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications
  - https://martinfowler.com/articles/nonDeterminism.html
  - https://martinfowler.com/bliki/TestCoverage.html
  - https://martinfowler.com/articles/mocksArentStubs.html
---

## The question behind "how do you test?"

Testing is named in most junior backend job posts: about 35 of the 45 we read. The interviewer is not after a tool name. They listen for four things. One is the **level** of a test:

- **Unit:** one small piece alone, like a function
- **Integration:** several pieces together, like code plus a real database
- **End-to-end (e2e):** the whole app, driven the way a user would

```svg The four things a good answer touches. Say one sentence for each
<svg viewBox="0 0 520 200" role="img" aria-label="What, level, trust, enough">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="what">
      <rect x="20" y="30" width="112" height="110" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="76" y="56" fill="var(--fg)" font-size="15">WHAT</text>
      <text x="76" y="84" fill="var(--fg-muted)">behavior at</text>
      <text x="76" y="102" fill="var(--fg-muted)">the public edge</text>
    </g>
    <g data-cue="level">
      <rect x="148" y="30" width="112" height="110" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="204" y="56" fill="var(--fg)" font-size="15">LEVEL</text>
      <text x="204" y="84" fill="var(--fg-muted)">many unit, some</text>
      <text x="204" y="102" fill="var(--fg-muted)">integration, few e2e</text>
    </g>
    <g data-cue="trust">
      <rect x="276" y="30" width="112" height="110" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="332" y="56" fill="var(--fg)" font-size="15">TRUST</text>
      <text x="332" y="84" fill="var(--fg-muted)">fast, repeatable,</text>
      <text x="332" y="102" fill="var(--fg-muted)">no sleeps</text>
    </g>
    <g data-cue="enough">
      <rect x="404" y="30" width="96" height="110" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="452" y="56" fill="var(--fg)" font-size="15">ENOUGH</text>
      <text x="452" y="84" fill="var(--fg-muted)">few escaped</text>
      <text x="452" y="102" fill="var(--fg-muted)">bugs</text>
    </g>
  </g>
</svg>
```

```narrate
Interviewers ask how you test to hear how you think. A unit test checks one small piece alone, an integration test checks pieces together, and an end to end test drives the whole app. [[what]] First, what you test: behavior, seen from the outside, not internal details. [[level]] Second, at which level: mostly small fast tests, some integration tests, very few end to end ones. [[trust]] Third, whether you can trust the suite: fast, repeatable, and free of sleeps. [[enough]] Fourth, how you know it is enough: bugs rarely escape, and changing code feels safe.
```

> **Why:** Fowler judges "enough" by two signs: bugs rarely reach production, and developers rarely fear changing code.

## Pyramid or trophy?

Two pictures of how to spread your tests across levels.

- **Pyramid** (Fowler): many unit tests, fewer coarse tests, very few end-to-end
- **Trophy** (Kent C. Dodds): the middle is widest. He builds on a tweet by Guillermo Rauch: "Write tests. Not too many. Mostly integration."

Both keep end-to-end tests at the top and few. Fowler's reason: they are slow, flaky and costly to maintain.

```svg Pyramid: wide base of unit tests. Trophy: the widest part is integration, with static checks underneath
<svg viewBox="0 0 520 230" role="img" aria-label="Test pyramid next to testing trophy">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="pyramid">
      <text x="130" y="20" fill="var(--fg)" font-size="14">PYRAMID</text>
      <polygon points="130,34 156,70 104,70" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="64" fill="var(--fg)">e2e</text>
      <polygon points="104,76 156,76 190,126 70,126" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="108" fill="var(--fg)">integration</text>
      <polygon points="70,132 190,132 230,184 30,184" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="164" fill="var(--fg)">unit</text>
    </g>
    <g data-cue="trophy">
      <text x="390" y="20" fill="var(--fg)" font-size="14">TROPHY</text>
      <rect x="360" y="32" width="60" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="52" fill="var(--fg)">e2e</text>
      <rect x="310" y="68" width="160" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="98" fill="var(--fg)">integration</text>
      <rect x="340" y="124" width="100" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="144" fill="var(--fg)">unit</text>
      <rect x="320" y="160" width="140" height="24" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="177" fill="var(--fg)">static (types)</text>
    </g>
  </g>
</svg>
```

```narrate
Two popular pictures. [[pyramid]] The pyramid has a wide base of fast unit tests, a smaller middle, and a tiny top of end to end tests. [[trophy]] The trophy keeps the tiny top, but makes the middle widest: integration tests that use several parts together, with type checking underneath. They disagree about the middle, and agree about the top: keep slow tests few.
```

> **Not this:** an upside-down pyramid (Fowler calls it the "test ice-cream cone"): mostly slow UI tests and almost no unit tests. Slow, brittle, and failures are hard to place.

In the interview: "Logic gets unit tests, the joins between parts get integration tests, and a few key journeys get end-to-end."

## Flaky tests

A **flaky** test (Fowler says "non-deterministic") "passes sometimes and fails sometimes, without any noticeable change in the code, tests, or environment". The cause is almost always a **hidden input** the test does not control.

| Cause | Fix |
|---|---|
| Shared data or test order | each test builds its own data |
| Real clock, `sleep` | fake timers, injected clock |
| Randomness | seed it, or inject it |
| Live network or API | a fake, plus a separate contract test (checks the fake still matches the real service) |
| Async timing | wait for the event, not for a guess |

> **Not this:** "re-run until green." It teaches the team that red means nothing. Quarantine the test (move it to a separate suite that does not block), then fix it quickly.

```svg A flaky test has hidden inputs. Control or fake each one
<svg viewBox="0 0 520 190" role="img" aria-label="Hidden inputs make a test flaky">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="hidden">
      <rect x="20" y="20" width="130" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="85" y="40" fill="var(--fg)">clock</text>
      <rect x="20" y="64" width="130" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="85" y="84" fill="var(--fg)">network</text>
      <rect x="20" y="108" width="130" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="85" y="128" fill="var(--fg)">other tests' data</text>
      <path d="M152 36 L200 76 M152 80 L200 84 M152 124 L200 94" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    </g>
    <g data-cue="test">
      <rect x="204" y="52" width="110" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="259" y="80" fill="var(--fg)" font-size="14">the test</text>
      <text x="259" y="100" fill="var(--fg-muted)">red? green?</text>
    </g>
    <g data-cue="fix">
      <path d="M316 84 L360 84 M352 77 L360 84 L352 91" fill="none" stroke="var(--ok)" stroke-width="2"/>
      <text x="436" y="76" fill="var(--fg)">fix: control</text>
      <text x="436" y="96" fill="var(--fg)">every input</text>
    </g>
  </g>
</svg>
```

```narrate
A flaky test is a test with hidden inputs. [[hidden]] First, the things it silently depends on: the clock, the network, data left by other tests. They change from run to run. [[test]] So the same code gives red one time and green the next. [[fix]] The cure is to take control of each input, with a fake clock, a fake service, or fresh data for every test. Rerunning until green only hides the problem.
```

## Coverage is not quality

Coverage counts the lines your tests **ran**. It does not check that they **verified** anything.

```python
def test_slugify_runs():
    slugify("Hello World")
```

This test gives full coverage of the happy path and asserts nothing. Fowler: coverage is "a useful tool for finding untested parts of a codebase" but "of little use as a numeric statement of how good your tests are". Make it a target and people will try to hit it, by the cheapest route.

> **Why:** a mutant that survives shows a bug your tests would miss. Coverage cannot show that.

```quiz
q: A team requires 90 percent coverage. What is the real risk?
options:
  - the build gets slower
  - people write tests with no assertions to hit the number
  - coverage tools are always inaccurate
answer: 1
why: A number you are rewarded for gets gamed. Lines can run without anything being checked.
```

```narrate
Coverage tells you which lines ran during the tests. It cannot tell you whether anything was checked. This test calls the function and asserts nothing, yet the lines count as covered. Use coverage as a flashlight to find code nobody tests, not as a target to reach. And when a number becomes a target, people find the cheapest way to hit it.
```

## What to say in the interview

Use this order, one sentence each: **what**, **level**, **isolation**, **trust**, **coverage**. Add one real example from your own work.

```text
I test behavior, not implementation: I call the public function
and check what comes out or what ends up stored.
Mostly fast unit tests for logic, a few integration tests where
my code meets a database or an API, and a handful of end-to-end
journeys. I swap slow or unreliable things, like email or the
clock, for fakes so tests stay fast and repeatable. When I fix a
bug, I first write a test that fails because of it. I use
coverage to find untested code, not as a goal.
```

> **Trap:** reciting tool names (pytest, vitest) with no reasoning. Tools are easy to learn. Judgment is what you are hired for.

```narrate
Answer in a fixed order, one sentence each. What you test: behavior, not internals. Which levels: mostly unit, some integration, few end to end. How you isolate: fakes for the slow and unreliable parts. How you keep trust: fast, repeatable, and a failing test written first for every bug. And how you treat coverage: a flashlight, not a goal. Finish with one real example from your own project.
```
