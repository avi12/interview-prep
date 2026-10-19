---
title: pytest - fixtures and parametrize
lang: py
minutes: 25
level: junior
roles: [backend, analyst, ai]
files: [test_pricing.py]
sources:
  - https://docs.pytest.org/en/stable/how-to/fixtures.html
  - https://docs.pytest.org/en/stable/how-to/parametrize.html
  - https://docs.pytest.org/en/stable/how-to/tmp_path.html
  - https://docs.pytest.org/en/stable/how-to/monkeypatch.html
  - https://stryker-mutator.io/docs/
---

## Fixtures: setup you ask for by name

A **fixture** is setup code that pytest runs for you. A test asks for it by writing the fixture's name as a parameter. Each test gets a fresh one, because the default scope is `function`: destroyed after every test.

```python
@pytest.fixture
def cart():
    return pricing.Cart()


def test_empty_cart_has_a_subtotal_of_zero(cart):
    assert cart.subtotal_cents() == 0
```

Fixtures can ask for other fixtures, so setup is built in layers.

```svg The test asks by name, pytest builds the chain, the test receives a fresh value
<svg viewBox="0 0 520 190" role="img" aria-label="A test requests a fixture chain">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <g data-cue="ask">
      <rect x="20" y="30" width="150" height="90" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="95" y="58" fill="var(--fg)">test asks for</text>
      <text x="95" y="84" fill="var(--fg-muted)">cart_with_items</text>
    </g>
    <path d="M172 75 L196 75 M188 68 L196 75 L188 82" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="build">
      <rect x="200" y="30" width="150" height="90" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="275" y="58" fill="var(--fg)">pytest builds</text>
      <text x="275" y="80" fill="var(--fg-muted)">1. cart</text>
      <text x="275" y="100" fill="var(--fg-muted)">2. cart_with_items</text>
    </g>
    <path d="M352 75 L376 75 M368 68 L376 75 L368 82" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="fresh">
      <rect x="380" y="30" width="120" height="90" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="440" y="58" fill="var(--fg)">fresh value</text>
      <text x="440" y="84" fill="var(--fg-muted)">for this test</text>
    </g>
    <text x="20" y="160" text-anchor="start" fill="var(--fg)">next test: build everything again</text>
  </g>
</svg>
```

```narrate
Follow the steps in order. [[ask]] A test lists the fixture it needs as a parameter. [[build]] Pytest sees that name, builds the fixtures it depends on first, then the one you asked for. [[fresh]] The test receives a brand new value. When the next test runs, everything is built again, so no test can leak state into another.
```

> **Why:** setup lives in one place, and each test starts clean.

> **Not this:** one `cart = Cart()` at the top of the file. Items added by one test show up in the next, and results depend on the order.

## Parametrize: one test, many rows

When only the data changes, don't copy the test. List the rows.

```python
@pytest.mark.parametrize(
    "weight_grams, expected_cents",
    [(1, 400), (500, 400), (501, 800)],
)
def test_shipping_tiers(weight_grams, expected_cents):
    assert pricing.shipping_cents(weight_grams) == expected_cents
```

Each row becomes its own test, like `test_shipping_tiers[501-800]`. Put the **borders** in the rows: 500 and 501. For errors, use `with pytest.raises(ValueError):`.

> **Not this:** a `for` loop inside one test. It stops at the first bad row and never says which input failed.

```narrate
Parametrize turns a table into tests. You write the test once and list the rows of input and expected output. Pytest runs each row as its own test and puts the values in the name, so a failure tells you exactly which input broke. Put the borders in the rows, five hundred and five hundred one, because that is where bugs live. A loop inside one test hides all of that.
```

```quiz
q: A parametrized test has 6 rows and row 3 is wrong. What does pytest report?
options:
  - one failure for the whole test
  - one failure named for row 3, and 5 passes
  - nothing until row 1 is fixed
answer: 1
why: Each row runs as an independent test, so only the bad row fails, and its values are in the test name.
```

## tmp_path and monkeypatch

Code that reads files or environment variables depends on the machine. Two built-in fixtures remove that:

- **`tmp_path`:** a fresh temporary folder (a `pathlib.Path`) for each test
- **`monkeypatch`:** change an env var or attribute. Pytest **undoes it** when the test ends

```python
def test_total_adds_tax_from_the_environment(cart_with_items, monkeypatch):
    monkeypatch.setenv("TAX_PERCENT", "20")

    assert cart_with_items.total_cents() == 960
```

Use `monkeypatch.delenv("TAX_PERCENT", raising=False)` to prove the "not set" path, even on a machine where it is set.

```svg The test works in a sandbox. Real files and the real environment stay untouched
<svg viewBox="0 0 520 190" role="img" aria-label="Sandbox for files and environment variables">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="world">
      <rect x="20" y="16" width="480" height="158" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2" stroke-dasharray="8 5"/>
      <text x="34" y="40" fill="var(--fg-muted)">your machine: real files, real env vars</text>
    </g>
    <g data-cue="sandbox">
      <rect x="40" y="64" width="250" height="90" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="54" y="90" fill="var(--fg)">test sandbox</text>
      <text x="54" y="112" fill="var(--fg-muted)">tmp_path: empty folder</text>
      <text x="54" y="132" fill="var(--fg-muted)">monkeypatch: TAX_PERCENT=20</text>
    </g>
    <g data-cue="undo">
      <path d="M294 100 L360 100 M352 93 L360 100 L352 107" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="368" y="90" fill="var(--fg)">test ends:</text>
      <text x="368" y="110" fill="var(--fg)">env restored,</text>
      <text x="368" y="130" fill="var(--fg)">new folder next</text>
    </g>
  </g>
</svg>
```

```narrate
[[world]] The outer box is your real machine, with real files and real environment variables. [[sandbox]] Inside it, the test gets a sandbox: an empty temporary folder, and a patched environment variable. The code under test cannot tell the difference. [[undo]] When the test ends, pytest restores the variable, and the next test gets its own new folder, so every test starts from the same place.
```

> **Trap:** `os.environ["TAX_PERCENT"] = "20"` in a test. Nothing restores it, so it leaks into every later test.

## Share fixtures, carefully

- Fixtures in a `conftest.py` file are visible to every test file in that folder, with no import
- `scope="module"` builds a fixture once for many tests
- `autouse=True` runs a fixture for every test without being asked, handy for "start with no `TAX_PERCENT`"

> **Why:** scope trades isolation for speed. Pay that price only for setup that is expensive **and** read-only, such as a database connection.

> **Not this:** a `session`-scoped `cart`. One test's items now sit in every other test's cart.

```narrate
Fixtures can be shared. Put them in a file called conftest and every test in the folder can use them. A wider scope builds a fixture once instead of every time, which is faster but gives up isolation. Reserve it for expensive things you only read, like a database connection. Never for something tests change, like a cart.
```

## Your turn

Open `test_pricing.py`. `pricing.py` sits beside it; read it, do not change it. **You write the tests.**

| Function | Behavior |
|---|---|
| `shipping_cents(weight_grams)` | up to 500 g: 400, up to 2000 g: 800, heavier: 1500. Zero or less: `ValueError` |
| `Cart.add(name, unit_cents, quantity=1)` | quantity below 1: `ValueError` |
| `Cart.subtotal_cents()` | sum of price times quantity |
| `Cart.total_cents(discount=0)` | discount percent first, then tax from env var `TAX_PERCENT` (unset means 0) |
| `discount_percent(code, path)` | reads a JSON file like `{"SAVE10": 10}`. Codes ignore case. Unknown code or missing file: 0 |

Run `pnpm lesson test testing/06-pytest-fixtures-and-parametrize`. You need 10 or more tests, using a fixture, `parametrize`, `tmp_path` and `monkeypatch`. They must pass on the correct code and fail on **13 buggy copies**.

```hint
Start by moving `Cart()` into a fixture, then a second fixture that adds a few items to it.
```

```hint
Shipping and bad quantities are tables: use parametrize with rows on both sides of 500 and 2000, and for 0 and -1.
```

```hint
Write the discounts JSON into `tmp_path` inside a fixture. Use `monkeypatch.setenv` and `monkeypatch.delenv` for the tax. When a bug gets through, the check prints its name.
```
