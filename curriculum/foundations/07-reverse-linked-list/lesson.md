---
title: Reverse a Linked List
lang: py
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [reverse_linked_list.py]
sources:
  - https://designgurus.io/answers/detail/206-reverse-linked-list-nahl89
  - https://docs.python.org/3/library/sys.html#sys.getrecursionlimit
---

## The problem

A **singly linked list** is a chain of nodes. Each node holds a value, `val`, and a link to the node after it, `next`. The last node's `next` is `None`. You are given only the **head**, the first node.

Reverse the list and return the new head: `1 -> 2 -> 3` becomes `3 -> 2 -> 1`.

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

The starter gives you this class. Change the **links**. Do not build new nodes.

```narrate
A linked list is a chain of nodes. Each node knows its value and the node after it, and nothing else. You are given only the first node, and you must return the first node of the reversed chain. Interviewers use this to test one thing: can you rewire links without losing the rest of the list?
```

## Why it is tricky

A node only knows the node **after** it. To reverse an arrow you point a node at the one **before** it, so you must remember that one.

And the moment you change `current.next`, you lose the only road to the rest of the list. Each round needs three things:

- `previous`: the node before
- `current`: the node you are on
- the node after, **saved before** you change anything

> **Trap:** overwrite `current.next` before saving it, and every node after it is gone for good.

> **Not this:** copy the values into a Python list, reverse that, and write them back. It works, but it uses `O(n)` extra memory. The interviewer will ask for `O(1)`.

```narrate
Here is why it is tricky. A node only knows the node after it. To reverse an arrow, you need to remember the node before it. And the moment you change a next link, you lose the only road to the rest of the list. So before you flip anything, save what comes next.
```

## Watch the pointers move

Two markers walk the list: `prev` trails right behind `curr`. Each round flips **one** arrow, then slides both markers right.

```svg Reversing 1, 2, 3: each round flips one arrow (shown in color) and moves prev and curr one node to the right
<svg viewBox="0 0 520 290" role="img" aria-label="Three nodes whose arrows flip one at a time as prev and curr move right">
  <defs>
    <marker id="rev-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--fg)"/></marker>
    <marker id="rev-arrow-flip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--accent-2)"/></marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="16" text-anchor="middle">
    <g data-cue="start">
      <text x="8" y="56" text-anchor="start" font-size="12" fill="var(--fg-muted)">start</text>
      <text x="107" y="56" font-size="14" fill="var(--fg-muted)">None</text>
      <text x="473" y="56" font-size="14" fill="var(--fg-muted)">None</text>
      <rect x="176" y="34" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="202" y="56" fill="var(--fg)">1</text>
      <rect x="276" y="34" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="302" y="56" fill="var(--fg)">2</text>
      <rect x="376" y="34" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="402" y="56" fill="var(--fg)">3</text>
      <path d="M230 51 L274 51" stroke="var(--fg)" stroke-width="2" marker-end="url(#rev-arrow)"/>
      <path d="M330 51 L374 51" stroke="var(--fg)" stroke-width="2" marker-end="url(#rev-arrow)"/>
      <path d="M430 51 L452 51" stroke="var(--fg)" stroke-width="2" marker-end="url(#rev-arrow)"/>
      <text x="107" y="20" font-size="12" font-weight="700" fill="var(--fg)">prev</text>
      <path d="M102 24 L112 24 L107 31 z" fill="var(--cat-1)"/>
      <text x="202" y="20" font-size="12" font-weight="700" fill="var(--fg)">curr</text>
      <path d="M197 24 L207 24 L202 31 z" fill="var(--cat-2)"/>
    </g>
    <g data-cue="round1">
      <text x="8" y="124" text-anchor="start" font-size="12" fill="var(--fg-muted)">round 1</text>
      <text x="107" y="124" font-size="14" fill="var(--fg-muted)">None</text>
      <text x="473" y="124" font-size="14" fill="var(--fg-muted)">None</text>
      <rect x="176" y="102" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="202" y="124" fill="var(--fg)">1</text>
      <rect x="276" y="102" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="302" y="124" fill="var(--fg)">2</text>
      <rect x="376" y="102" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="402" y="124" fill="var(--fg)">3</text>
      <path d="M174 119 L128 119" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#rev-arrow-flip)"/>
      <path d="M330 119 L374 119" stroke="var(--fg)" stroke-width="2" marker-end="url(#rev-arrow)"/>
      <path d="M430 119 L452 119" stroke="var(--fg)" stroke-width="2" marker-end="url(#rev-arrow)"/>
      <text x="202" y="88" font-size="12" font-weight="700" fill="var(--fg)">prev</text>
      <path d="M197 92 L207 92 L202 99 z" fill="var(--cat-1)"/>
      <text x="302" y="88" font-size="12" font-weight="700" fill="var(--fg)">curr</text>
      <path d="M297 92 L307 92 L302 99 z" fill="var(--cat-2)"/>
    </g>
    <g data-cue="round2">
      <text x="8" y="192" text-anchor="start" font-size="12" fill="var(--fg-muted)">round 2</text>
      <text x="107" y="192" font-size="14" fill="var(--fg-muted)">None</text>
      <text x="473" y="192" font-size="14" fill="var(--fg-muted)">None</text>
      <rect x="176" y="170" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="202" y="192" fill="var(--fg)">1</text>
      <rect x="276" y="170" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="302" y="192" fill="var(--fg)">2</text>
      <rect x="376" y="170" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="402" y="192" fill="var(--fg)">3</text>
      <path d="M174 187 L128 187" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#rev-arrow-flip)"/>
      <path d="M274 187 L230 187" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#rev-arrow-flip)"/>
      <path d="M430 187 L452 187" stroke="var(--fg)" stroke-width="2" marker-end="url(#rev-arrow)"/>
      <text x="302" y="156" font-size="12" font-weight="700" fill="var(--fg)">prev</text>
      <path d="M297 160 L307 160 L302 167 z" fill="var(--cat-1)"/>
      <text x="402" y="156" font-size="12" font-weight="700" fill="var(--fg)">curr</text>
      <path d="M397 160 L407 160 L402 167 z" fill="var(--cat-2)"/>
    </g>
    <g data-cue="done">
      <text x="8" y="260" text-anchor="start" font-size="12" fill="var(--fg-muted)">done</text>
      <text x="107" y="260" font-size="14" fill="var(--fg-muted)">None</text>
      <text x="473" y="260" font-size="14" fill="var(--fg-muted)">None</text>
      <rect x="176" y="238" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="202" y="260" fill="var(--fg)">1</text>
      <rect x="276" y="238" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="302" y="260" fill="var(--fg)">2</text>
      <rect x="376" y="238" width="52" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="402" y="260" fill="var(--fg)">3</text>
      <path d="M174 255 L128 255" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#rev-arrow-flip)"/>
      <path d="M274 255 L230 255" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#rev-arrow-flip)"/>
      <path d="M374 255 L330 255" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#rev-arrow-flip)"/>
      <text x="402" y="224" font-size="12" font-weight="700" fill="var(--fg)">prev</text>
      <path d="M397 228 L407 228 L402 235 z" fill="var(--cat-1)"/>
      <text x="473" y="224" font-size="12" font-weight="700" fill="var(--fg)">curr</text>
      <path d="M468 228 L478 228 L473 235 z" fill="var(--cat-2)"/>
    </g>
  </g>
</svg>
```

```narrate
Watch the two markers, prev and curr. [[start]] At the start, prev is None and curr sits on the first node. [[round1]] Round one: save what comes after curr, point the first node back at None, then slide both markers one step right. [[round2]] Round two does the same: the second node now points back at the first. [[done]] When curr falls off the end, every arrow has been flipped, and prev stands on the old last node. That is the new head.
```

> **Why:** each node is touched once and only a few variables are kept: `O(n)` time, `O(1)` extra space.

## Recursion, and the edge cases

You can also reverse the rest of the list by recursion, then point the next node back at the head. It is elegant, but every node adds a stack frame: `O(n)` space. Python stops at about 1,000 nested calls, so a list of 100,000 nodes raises `RecursionError`.

- **Empty list:** `head` is `None`. The loop never runs. Return `None`
- **One node:** nothing to flip. Its `next` is already `None`

> **Not this:** recursion as your main answer. Say "iterative, `O(n)` time, `O(1)` space", and mention that the recursive version exists but costs stack.

```narrate
Recursion also works, but every node adds a call on the stack, and Python gives up at about one thousand nested calls. A list of a hundred thousand nodes would crash. Say iterative, linear time, constant space, and mention recursion as the alternative. For an empty list or a single node, the loop needs no special case.
```

```quiz
q: The loop has finished. Which variable holds the head of the reversed list?
options:
  - current
  - previous
answer: 1
why: current has walked off the end and is None. previous is the last node you flipped, the old tail, which is the new head.
```

## Your turn

Implement `reverse_list(head)` in `reverse_linked_list.py`. `ListNode` is already in the file.

- A loop with `previous`, `current` and one saved variable
- Return the new head

The tests check the order, that you reuse the **same nodes**, and that a **100,000 node** list works.

```hint
Start with `previous = None` and `current = head`, then `while current:`.
```

```hint
First line in the loop: save `following = current.next`. Then point `current.next` at `previous`.
```

```hint
Then slide both markers: `previous = current`, then `current = following`. When the loop ends, return `previous`.
```
