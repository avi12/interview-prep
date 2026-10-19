---
title: Anatomy of a test
lang: ts
timeoutSeconds: 300
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [slugify.test.ts]
sources:
  - https://martinfowler.com/bliki/GivenWhenThen.html
  - https://martinfowler.com/articles/practical-test-pyramid.html
  - https://vitest.dev/api/test.html
  - https://stryker-mutator.io/docs/
---

## Arrange, act, assert

Every good test has three beats:

- **Arrange:** build the input
- **Act:** call the code, once
- **Assert:** check one result

The same beats go by another name, Given, When, Then (Martin Fowler explains the link).

```ts
it("joins two words with a hyphen", () => {
  const title = "hello world";

  const slug = slugify(title);

  expect(slug).toBe("hello-world");
});
```

```svg Three beats in a fixed order. One act and one claim means one reason to fail
<svg viewBox="0 0 520 170" role="img" aria-label="Arrange, act, assert">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="arrange">
      <rect x="20" y="24" width="140" height="80" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="90" y="52" text-anchor="middle" fill="var(--fg)" font-size="15">ARRANGE</text>
      <text x="90" y="80" text-anchor="middle" fill="var(--fg-muted)">title = "hello world"</text>
    </g>
    <path d="M162 64 L186 64 M178 57 L186 64 L178 71" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="act">
      <rect x="190" y="24" width="140" height="80" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="52" text-anchor="middle" fill="var(--fg)" font-size="15">ACT</text>
      <text x="260" y="80" text-anchor="middle" fill="var(--fg-muted)">slugify(title)</text>
    </g>
    <path d="M332 64 L356 64 M348 57 L356 64 L348 71" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="assert">
      <rect x="360" y="24" width="140" height="80" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="430" y="52" text-anchor="middle" fill="var(--fg)" font-size="15">ASSERT</text>
      <text x="430" y="80" text-anchor="middle" fill="var(--fg-muted)">"hello-world"</text>
    </g>
    <text x="20" y="146" fill="var(--fg)">red test = exactly one promise is broken</text>
  </g>
</svg>
```

```narrate
A test has three beats. [[arrange]] First, arrange: build the input, here the text hello world. [[act]] Then act: call the function once and keep the result. [[assert]] Last, assert: check one thing about that result. Because there is one act and one claim, a red test points at exactly one broken promise.
```

> **Why:** one reason to fail means one bug, one red test, one place to look.

> **Not this:** one long test that checks five rules. The first wrong assert stops the test and hides the other four.

## A name is the error message

When a test goes red, the name is the first thing you read. Write it as a sentence about behavior: **what happens, in which situation**.

| Weak | Strong |
|---|---|
| `test1` | `drops separators at the end` |
| `works` | `keeps digits in the slug` |
| `slugify` | `merges a run of separators into one hyphen` |

A teammate should know which rule broke without opening the file.

> **Not this:** names that describe the code, like `calls replace twice`. They break when you refactor and say nothing about behavior.

```narrate
When a test fails, the name is the first thing anyone reads. So write it as a sentence: what happens, and in which situation. Compare the weak names with the strong ones. A teammate should know which rule broke without opening the file. Never name a test after the code it calls, because that tells nobody what the user would see.
```

## One rule, one test

The function under test is `slugify(text)`. It turns a title into a web address part. Its rules:

- Letters become lowercase, accents are removed
- Digits stay
- Anything else, in any run, becomes **one** hyphen
- No hyphen at the start or the end
- Nothing usable left gives `""`

Turn each rule into its own test. Start with the happy path (a normal input that should just work), then **attack each rule** with an input built to break it.

> **Trap:** testing only the example from the spec. Bugs hide in the inputs nobody wrote down.

```narrate
Here are the rules of the function you will test. Each rule becomes its own small test. Begin with the happy path, then for each rule, pick an input made to break it. The trap is to test only the example from the description, because real bugs hide in the inputs nobody wrote down.
```

## Break the code, do your tests notice?

How do you know your tests are good? **Break the code on purpose.** Change one thing, such as removing `.toLowerCase()`. This broken copy is a **mutant**. Then run your tests.

- Some test goes red: the mutant is **killed**. Good
- Everything stays green: the mutant **survived**. A real bug like this would ship

```svg A mutant is the code with one small bug. Red tests kill it. Green tests mean a gap
<svg viewBox="0 0 520 190" role="img" aria-label="Code, mutant, test results">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="code">
      <rect x="20" y="20" width="150" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="95" y="46" text-anchor="middle" fill="var(--fg)">correct code</text>
      <text x="95" y="66" text-anchor="middle" fill="var(--fg-muted)">.toLowerCase()</text>
    </g>
    <path d="M172 50 L214 50 M206 43 L214 50 L206 57" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="mutant">
      <rect x="218" y="20" width="150" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="293" y="46" text-anchor="middle" fill="var(--fg)">mutant</text>
      <text x="293" y="66" text-anchor="middle" fill="var(--fg-muted)">(removed)</text>
    </g>
    <g data-cue="killed">
      <rect x="20" y="116" width="220" height="50" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="130" y="146" text-anchor="middle" fill="var(--fg)">a test goes red: killed</text>
    </g>
    <g data-cue="survived">
      <rect x="260" y="116" width="220" height="50" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="370" y="146" text-anchor="middle" fill="var(--fg)">all green: survived</text>
    </g>
  </g>
</svg>
```

```narrate
Start with the correct code. [[code]] It has a lowercase step. [[mutant]] Now make a mutant: the same code with that step removed, one small bug. Run your tests against it. [[killed]] If a test goes red, the mutant is killed, which is what you want. [[survived]] If everything stays green, the mutant survived, and a real bug like that would slip through your tests.
```

> **Why:** line coverage (the share of lines your tests ran) only proves a line ran. A killed mutant proves a test would notice the bug. Stryker, a mutation testing tool, is built on this idea.

```quiz
q: You delete the lowercase step from slugify and every test still passes. What does that mean?
options:
  - slugify is fine without it
  - no test checks letter case, so that bug could ship
  - the tests are too slow
answer: 1
why: A green run on broken code means no test depends on that behavior, so add one that does.
```

## Your turn

Open `slugify.test.ts` in your copy. `slugify.ts` sits next to it. Read it, but do not change it: **you write the tests**.

Run `pnpm lesson test testing/01-anatomy-of-a-test`. The check runs your file against the correct code, which must pass. Then it runs 8 buggy copies, each with one bug. Your tests must go red on every one.

- At least 6 tests
- Names of 3 or more words, all different
- Each test: arrange, act, assert

```hint
One rule, one test. Copy the example test and change only the input and the expected value.
```

```hint
When a bug gets through, the check prints its name. Read that name as the rule you have not tested yet.
```

```hint
Inputs worth a test: a capital letter, a comma followed by spaces, an ampersand, a digit, an accented letter, junk at the start, junk at the end, an empty string, and a string of only symbols.
```
