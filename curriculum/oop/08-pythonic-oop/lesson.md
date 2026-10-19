---
title: Pythonic OOP
lang: py
minutes: 30
level: junior
roles: [backend, analyst, ai]
files: [inventory.py]
sources:
  - https://docs.python.org/3/library/dataclasses.html
  - https://docs.python.org/3/reference/datamodel.html#object.__hash__
  - https://docs.python.org/3/library/functions.html#property
  - https://docs.python.org/3/library/typing.html
  - https://peps.python.org/pep-0544/
  - https://docs.python.org/3/library/abc.html
  - https://docs.python.org/3/glossary.html#term-duck-typing
---

## A record without the boilerplate

The bookstore needs a `Sku` (a product code). Write it by hand and two `Sku("BK-001")` are still different objects until you add `__eq__`, `__repr__` and `__hash__`.

```python
class Sku:
    def __init__(self, code): self.code = code
    def __repr__(self): return f"Sku(code={self.code!r})"
    def __eq__(self, other): return isinstance(other, Sku) and self.code == other.code
    def __hash__(self): return hash(self.code)
```

`@dataclass` writes all of that from the field list. Two flags matter here:

- `frozen=True`: assigning to a field raises an error, and `__hash__` is generated
- `order=True`: adds `<`, `<=`, `>`, `>=`, comparing fields in order

```python
@dataclass(frozen=True, order=True)
class Sku:
    code: str
```

```narrate
By hand, a small value class needs four methods before two equal codes count as equal. The dataclass decorator writes them from the list of fields. Frozen means no assignment after creation, and it also gives you a hash. Order means you can sort them. Four lines instead of ten.
```

> **Not this:** a plain `dict` as the record (`item["sku"]`). A typo in a key fails late, and there is no one place to put validation.

## Equal things must hash alike

A `dict` finds a key by its **hash** first, then by equality. Python's rule: objects that compare equal must have the same hash, and a key's hash must **never change** while it is in the dict.

```svg Mutate a key and the dict looks in the wrong bucket: the entry is still there, but unreachable
<svg viewBox="0 0 520 230" role="img" aria-label="A mutated key hashes to a different bucket">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="stored">
      <rect x="95" y="100" width="50" height="40" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="120" y="125" text-anchor="middle" fill="var(--fg)">p</text>
      <text x="14" y="176" fill="var(--fg)">first: stored under hash(1) = bucket 1</text>
    </g>
    <g data-cue="buckets">
      <rect x="40" y="100" width="50" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="150" y="100" width="50" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="205" y="100" width="50" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="260" y="100" width="50" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="315" y="100" width="50" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="370" y="100" width="50" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="65" y="158" text-anchor="middle" fill="var(--fg-muted)">0</text>
      <text x="120" y="158" text-anchor="middle" fill="var(--fg-muted)">1</text>
      <text x="175" y="158" text-anchor="middle" fill="var(--fg-muted)">2</text>
      <text x="230" y="158" text-anchor="middle" fill="var(--fg-muted)">3</text>
      <text x="285" y="158" text-anchor="middle" fill="var(--fg-muted)">4</text>
      <text x="340" y="158" text-anchor="middle" fill="var(--fg-muted)">5</text>
      <text x="395" y="158" text-anchor="middle" fill="var(--fg-muted)">6</text>
    </g>
    <g data-cue="mutate">
      <rect x="14" y="12" width="200" height="34" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="26" y="34" fill="var(--fg)">p.x = 2   (mutated)</text>
    </g>
    <g data-cue="lost">
      <path d="M200 46 L176 96 M170 86 L176 96 L184 90" fill="none" stroke="var(--danger)" stroke-width="2"/>
      <path d="M156 106 L194 134 M194 106 L156 134" stroke="var(--danger)" stroke-width="3"/>
      <text x="14" y="198" fill="var(--fg)">then: lookup hashes to bucket 2, empty, not found</text>
      <text x="14" y="220" fill="var(--fg-muted)">len(d) is still 1, the entry is lost</text>
    </g>
  </g>
</svg>
```

```narrate
Picture the dict as numbered buckets. [[stored]] You store the key p, and its hash sends it to bucket one. [[buckets]] The other buckets stay empty. [[mutate]] Now you change a field that the hash uses. [[lost]] The next lookup computes a new hash and goes to bucket two, which is empty. The entry is still in bucket one, but nothing can reach it.
```

| `@dataclass(...)` | `hash(obj)` |
|---|---|
| default (`eq=True`, not frozen) | `None`: unhashable, `TypeError` |
| `frozen=True` | generated from the fields |
| `eq=False` | inherited from `object`: by identity |

> **Trap:** `unsafe_hash=True` on a mutable class forces a hash and brings the lost-key bug back. The docs call it "not recommended".

```quiz
q: Which class can safely be used as a dict key?
options:
  - "@dataclass"
  - "@dataclass(frozen=True)"
  - "@dataclass(unsafe_hash=True)"
answer: 1
why: Frozen fields never change, so the generated hash never changes. The default dataclass is unhashable, and unsafe_hash on a mutable class risks lost keys.
```

## Validate once, in __post_init__

The generated `__init__` assigns the fields, then calls `__post_init__`. Put the checks there. A bad `Sku` can then **never exist**, and frozen keeps it valid.

```python
@dataclass(frozen=True, order=True)
class Sku:
    code: str

    def __post_init__(self):
        if not SKU_PATTERN.fullmatch(self.code):
            raise ValueError(f"invalid sku {self.code!r}")
```

To normalise a field (say, upper-case it) in a frozen class, plain assignment raises `FrozenInstanceError`. Use `object.__setattr__(self, "code", ...)`, the same trick the generated `__init__` uses.

```narrate
Validation belongs in the one place every object passes through: after the fields are set. If the code is bad, raise right there. Then nobody downstream needs to check again, because a bad Sku cannot exist. Freezing makes sure it stays good. One check, one place.
```

> **Not this:** an `if not re.match(...)` at the top of every function that receives a `Sku`. Forget one and a bad value reaches the database.

## @property guards the field that changes

`Sku` is a value: it never changes. An `Item` is different. Its stock goes up and down, so it is mutable, and some values must still never be invalid.

```python
class Item:
    def __init__(self, sku, name, unit_price_cents, quantity=0):
        self.quantity = quantity

    @property
    def quantity(self):
        return self._quantity

    @quantity.setter
    def quantity(self, value):
        if not isinstance(value, int) or value < 0:
            raise ValueError("quantity must be zero or more")
        self._quantity = value
```

`item.quantity = -1` now raises, in `__init__` too, because the assignment runs the setter. A property with no setter is read-only.

> **Why:** start with a plain attribute. Promote it to a property the day you need a rule. Callers still write `item.quantity`, so nothing else changes.

```narrate
Some things must change, like stock. A property lets you keep the plain dot syntax while a setter checks every assignment. Even the assignment inside the constructor goes through it. A property without a setter is read only. That is how you protect the price of an item without writing get and set methods.
```

> **Not this:** Java-style `get_quantity()` and `set_quantity()` from day one. It adds noise before there is any rule to guard.

## Protocol or ABC?

The inventory needs a pricing hook: "given an item, what does it cost?". How does it say so?

```svg Left: the class must name its parent. Right: any class with the right method fits
<svg viewBox="0 0 520 230" role="img" aria-label="Nominal ABC versus structural Protocol">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="nominal">
      <rect x="10" y="10" width="240" height="210" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="32" fill="var(--fg)" font-size="14">ABC: BY NAME</text>
      <rect x="40" y="48" width="180" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="69" fill="var(--fg)">PricingHook(ABC)</text>
      <path d="M130 118 L130 84 M124 94 L130 84 L136 94" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <rect x="40" y="118" width="180" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="139" fill="var(--fg)">ListPrice(PricingHook)</text>
      <text x="130" y="176" fill="var(--fg-muted)">must name the parent</text>
      <text x="130" y="198" fill="var(--fg-muted)">TypeError if a method is missing</text>
    </g>
    <g data-cue="structural">
      <rect x="270" y="10" width="240" height="210" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="32" fill="var(--fg)" font-size="14">PROTOCOL: BY SHAPE</text>
      <rect x="300" y="48" width="180" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="390" y="69" fill="var(--fg)">PricingHook(Protocol)</text>
      <path d="M390 118 L390 84 M384 94 L390 84 L396 94" fill="none" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4"/>
      <rect x="300" y="118" width="180" height="32" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="390" y="139" fill="var(--fg)">HalfPrice</text>
      <text x="390" y="176" fill="var(--fg-muted)">no parent, has price_for</text>
      <text x="390" y="198" fill="var(--fg-muted)">fits: checked by mypy</text>
    </g>
  </g>
</svg>
```

```narrate
[[nominal]] An abstract base class is nominal. A class counts only if it names the parent, and Python refuses to create an object that skips a required method. [[structural]] A protocol is structural. Any class that has the right method fits, with no parent named. A type checker such as mypy verifies it. Python itself does not enforce it at run time.
```

| | `abc.ABC` | `typing.Protocol` |
|---|---|---|
| Fit means | inherits it (or `register`) | has the methods |
| Enforced | at object creation | by a type checker only |
| Pick it for | shared code, a plugin base, runtime checks | "what I need from a collaborator" |

> **Not this:** `isinstance(pricing, PricingHook)` checks everywhere. That is Java in Python. Duck typing means: call it, and handle the failure.

> **Trap:** `@runtime_checkable` makes `isinstance` work, but it only checks that the **names exist**, not the signatures.

## What to say in the interview

Interviewers ask "what is Pythonic about your design?" Answer with four decisions, not slogans.

> **Say it out loud:** "The product code is a frozen dataclass, so it validates once, hashes by value and works as a dict key. The mutable stock count sits behind a property so it can never go negative. The pricing hook is a Protocol, so any object with a price method plugs in, even one that inherits nothing."

```narrate
Answer with decisions, not slogans. The product code is a frozen dataclass, so it validates once, hashes by value and works as a dictionary key. The stock count sits behind a property so it can never go negative. The pricing hook is a protocol, so any object with a price method plugs in, even one that inherits nothing.
```

```quiz
q: A teammate adds "implements PricingHook" by inheriting an ABC for a three-line pricing helper used in one place. What is the best reply?
options:
  - good, every interface needs an ABC
  - use a Protocol, or just a function, so the helper does not have to inherit anything
  - add isinstance checks so mistakes are caught early
answer: 1
why: A Protocol states the need without forcing inheritance, and a plain function may be enough. Inheritance should buy shared code or runtime enforcement.
```

## Your turn

Open `inventory.py`. It works for happy paths but nothing guards it. Make it:

- `Sku`: a frozen, ordered dataclass. Code is 2-4 capital letters, a hyphen, 3-5 digits. Raise `ValueError` in `__post_init__`
- `Item.quantity`: a property. Whole number, zero or more, checked on creation and on assignment. `unit_price_cents` is read-only, whole cents
- `Item.take(amount)`: raise `OutOfStock` and change nothing if short
- `Inventory`: reject a duplicate Sku, `skus()` sorted, `len()` and `in` work
- `PricingHook`: a `typing.Protocol`. The tests pass plain objects that inherit nothing

Run `pnpm lesson test oop/08-pythonic-oop`.

```hint
`@dataclass(frozen=True, order=True)` on `Sku`, then a `__post_init__` that checks `SKU_PATTERN.fullmatch(self.code)`. Define `SKU_PATTERN = re.compile(r"[A-Z]{2,4}-\d{3,5}")` once, at the top.
```

```hint
In `Item.__init__`, write `self.quantity = quantity`, not `self._quantity = quantity`. The assignment goes through the setter, so creation is checked for free.
```

```hint
`bool` is a subclass of `int` in Python. If you want `True` rejected as a quantity, check `isinstance(value, bool)` first.
```

```hint
Replace `class PricingHook(ABC)` with `class PricingHook(Protocol)` and drop `@abstractmethod`. `ListPrice` no longer needs to inherit it. `typing.is_protocol(PricingHook)` must be `True`.
```
