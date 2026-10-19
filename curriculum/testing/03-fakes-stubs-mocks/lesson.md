---
title: Fakes, stubs and mocks
lang: ts
minutes: 25
level: junior
roles: [backend, ai]
files: [fakeUserRepository.ts]
sources:
  - https://martinfowler.com/bliki/TestDouble.html
  - https://martinfowler.com/articles/mocksArentStubs.html
  - https://martinfowler.com/bliki/UnitTest.html
  - https://vitest.dev/api/vi
  - https://vitest.dev/guide/mocking
---

## Test doubles, in plain words

`registerUser` talks to a database and an email service. In a test you do not want the real ones: slow, shared, unpredictable. So you swap in a **test double**. Fowler names five kinds:

| Kind | What it does | Example |
|---|---|---|
| Dummy | passed in, never used | `{}` as an unused logger |
| Stub | returns canned answers | `hashPassword` returns `"hashed:" + password` |
| Fake | really works, with a shortcut | a user repository in memory |
| Spy | a stub that records its calls | `vi.fn()` |
| Mock | pre-set expectations, fails if the calls differ | strict mock objects |

```svg The service in the middle, each real helper swapped for a different kind of double
<svg viewBox="0 0 520 220" role="img" aria-label="registerUser with three test doubles">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <g data-cue="service">
      <rect x="185" y="80" width="150" height="56" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="104" fill="var(--fg)" font-size="15">registerUser</text>
      <text x="260" y="124" fill="var(--fg-muted)">code under test</text>
    </g>
    <g data-cue="fake">
      <rect x="20" y="16" width="160" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="100" y="40" fill="var(--fg)">FAKE users</text>
      <text x="100" y="60" fill="var(--fg-muted)">works, in memory</text>
      <path d="M150 74 L188 96 M178 96 L188 96 L184 87" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    </g>
    <g data-cue="stub">
      <rect x="20" y="148" width="160" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="100" y="172" fill="var(--fg)">STUB hashPassword</text>
      <text x="100" y="192" fill="var(--fg-muted)">canned answer</text>
      <path d="M150 146 L188 122 M178 122 L188 122 L184 131" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    </g>
    <g data-cue="spy">
      <rect x="340" y="16" width="160" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="420" y="40" fill="var(--fg)">SPY mailer</text>
      <text x="420" y="60" fill="var(--fg-muted)">records its calls</text>
      <path d="M372 74 L332 96 M342 96 L332 96 L336 87" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    </g>
  </g>
</svg>
```

```narrate
The service under test sits in the middle. [[service]] The function register user needs three helpers. [[fake]] The user repository becomes a fake: it really works, just in memory. [[stub]] Password hashing becomes a stub: it returns a canned answer. [[spy]] The mailer becomes a spy: it remembers how it was called, so the test can ask afterwards.
```

> **Why:** a double makes the test fast and repeatable, and lets you create situations that are hard to trigger for real.

> **Trap:** people say "mock" for all five. In an interview, name the kind you mean.

## State or interaction?

Two ways to check the result:

- **State:** run the code, then look at what is stored. "Is Ana in the repository?"
- **Interaction:** check which calls were made. "Was `sendWelcome` called once?"

```ts
expect(await users.findByEmail("ana@example.com")).toBeDefined();
expect(mailer.sendWelcome).toHaveBeenCalledWith("ana@example.com");
```

Prefer state. Use interaction only for an outgoing effect with nothing to inspect afterwards, like an email.

```narrate
There are two ways to check a result. State testing runs the code and then looks at what is stored. Interaction testing checks which calls were made. Prefer state, because it only cares about the outcome. Keep interaction checks for effects you cannot look at afterwards, such as sending an email.
```

```quiz
q: Which is the better check that registration saved the user?
options:
  - the save spy was called once
  - find the user in the fake repository
  - count how many internal helpers ran
answer: 1
why: The user being findable is the real outcome. A call count only proves a method ran, not that the data is right.
```

## Why mocking everything breaks

A mock-heavy test pins **how** the service works. Refactor it to call `list()` instead of `findByEmail`: same behavior, but the test goes red. A test on a fake only asks **what ended up stored**, so it stays green. Fowler: mockist tests are "more coupled to the implementation".

```svg Same refactor, two tests: the mock-based one breaks for no reason, the fake-based one survives
<svg viewBox="0 0 520 200" role="img" aria-label="Refactor breaks the mock test but not the fake test">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="refactor">
      <rect x="20" y="10" width="480" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="32" text-anchor="middle" fill="var(--fg)">refactor: same behavior, different calls inside</text>
    </g>
    <g data-cue="mocked">
      <rect x="20" y="62" width="230" height="118" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="84" fill="var(--fg)" font-size="14">MOCK TEST: red</text>
      <text x="32" y="110" fill="var(--fg-muted)">findByEmail called once?</text>
      <text x="32" y="130" fill="var(--fg-muted)">save called with {...}?</text>
      <text x="32" y="156" fill="var(--fg)">nothing is wrong, still fails</text>
    </g>
    <g data-cue="fakeTest">
      <rect x="270" y="62" width="230" height="118" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="282" y="84" fill="var(--fg)" font-size="14">FAKE TEST: green</text>
      <text x="282" y="110" fill="var(--fg-muted)">is Ana stored?</text>
      <text x="282" y="130" fill="var(--fg-muted)">only the outcome matters</text>
    </g>
  </g>
</svg>
```

```narrate
[[refactor]] Imagine a refactor that changes which repository methods the service calls inside, with no change in behavior. [[mocked]] The mock test asserts those exact calls, so it goes red even though nothing is wrong. [[fakeTest]] The fake test only asks whether Ana ended up stored, so it stays green. Tests that survive refactors are the ones worth keeping.
```

> **Not this:** a mock for every dependency, then an assert for every call. You end up testing the wiring, and each refactor breaks tests that were never about behavior.

## A fake must act like the real thing

A fake earns trust only if it keeps the promises of a real repository:

- `save` then `findByEmail` returns the same data
- saving the same `id` twice keeps **one** row
- results are **copies**, so a caller cannot edit stored data
- two fakes never share data

```ts
type UserRepository = {
  findByEmail: (email: string) => Promise<User | undefined>;
  save: (user: User) => Promise<void>;
  list: () => Promise<User[]>;
};
```

> **Why:** a lazy fake that hands out the stored object itself hides bugs a real database would show.

```narrate
Your fake only helps if it keeps the promises of a real repository. Saving then finding returns the same data. Saving the same id twice keeps one row. Results are copies, so a caller cannot edit what is stored. And two fakes never share data. The tests in this lesson check exactly those promises.
```

## Your turn

Open `fakeUserRepository.ts` and implement `createInMemoryUserRepository()`. It returns an object with `findByEmail`, `save` and `list`.

`registerUser.ts` is the service. Read it, do not change it. The tests first check your fake alone, then run the service on top of it.

Run `pnpm lesson test testing/03-fakes-stubs-mocks`.

```hint
Keep a `Map` inside the function, keyed by user `id`.
```

```hint
`findByEmail` searches the map's values for the email and returns a copy made with the spread operator. `save` stores a copy too.
```

```hint
`list` returns copies of the values. A `Map` keeps insertion order, and saving an existing id replaces that entry.
```
