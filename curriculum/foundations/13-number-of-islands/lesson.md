---
title: Number of Islands
lang: py
minutes: 25
level: junior
roles: [backend, analyst, ai]
files: [number_of_islands.py]
sources:
  - https://en.wikipedia.org/wiki/Flood_fill
  - https://neetcode.io/solutions/number-of-islands
  - https://docs.python.org/3/library/sys.html#sys.setrecursionlimit
  - https://docs.python.org/3/library/collections.html#collections.deque
  - https://wiki.python.org/moin/TimeComplexity
---

## The problem

A `grid` is a list of rows. Each cell is `"1"` (land) or `"0"` (water). An **island** is land cells joined **up, down, left or right**. Diagonals do not join. Return how many islands there are.

```text
1 1 0 0 0
1 0 0 1 0
0 0 1 1 0
0 0 0 0 1
```

That grid has **3** islands. The lone land cell in the corner touches another island only diagonally. An empty grid has 0.

```narrate
You get a map made of land and water, and you count the islands. Land cells that touch up, down, left or right belong to the same island. Cells that only touch at a corner do not. Grid questions like this one are a favorite, because they test whether you can walk a structure without getting lost.
```

## Scan, then flood

1. Scan every cell, row by row
2. Meet land you have not seen: that is a **new island**, add 1
3. **Flood fill** from it: visit every connected land cell and mark it as seen
4. Seen cells are skipped by the scan, so no island is counted twice

```svg Scanning finds the first land cell of an island, the flood paints the whole island, and the scan then skips it
<svg viewBox="0 0 520 220" role="img" aria-label="A five by four grid with three islands colored">
  <g font-family="var(--font-mono)" font-size="15">
    <g data-cue="scan">
      <rect x="20" y="20" width="44" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="64" y="20" width="44" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="108" y="20" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="152" y="20" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="196" y="20" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="20" y="64" width="44" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="64" y="64" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="108" y="64" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="152" y="64" width="44" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="196" y="64" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="20" y="108" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="64" y="108" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="108" y="108" width="44" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="152" y="108" width="44" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="196" y="108" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="20" y="152" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="64" y="152" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="108" y="152" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="152" y="152" width="44" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="196" y="152" width="44" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <path d="M28 42 L56 42" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="270" y="40" fill="var(--fg)" font-size="14">1. scan row by row</text>
    </g>
    <g data-cue="flood">
      <rect x="20" y="20" width="44" height="44" fill="var(--cat-1)" fill-opacity="0.6" stroke="var(--border)" stroke-width="2"/>
      <rect x="64" y="20" width="44" height="44" fill="var(--cat-1)" fill-opacity="0.6" stroke="var(--border)" stroke-width="2"/>
      <rect x="20" y="64" width="44" height="44" fill="var(--cat-1)" fill-opacity="0.6" stroke="var(--border)" stroke-width="2"/>
      <rect x="152" y="64" width="44" height="44" fill="var(--cat-2)" fill-opacity="0.6" stroke="var(--border)" stroke-width="2"/>
      <rect x="108" y="108" width="44" height="44" fill="var(--cat-2)" fill-opacity="0.6" stroke="var(--border)" stroke-width="2"/>
      <rect x="152" y="108" width="44" height="44" fill="var(--cat-2)" fill-opacity="0.6" stroke="var(--border)" stroke-width="2"/>
      <text x="270" y="72" fill="var(--fg)" font-size="14">2. new land: count + 1,</text>
      <text x="270" y="92" fill="var(--fg)" font-size="14">flood the whole island</text>
    </g>
    <g data-cue="count">
      <rect x="196" y="152" width="44" height="44" fill="var(--cat-3)" fill-opacity="0.6" stroke="var(--border)" stroke-width="2"/>
      <path d="M196 152 L152 108" stroke="var(--danger)" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="270" y="124" fill="var(--fg)" font-size="14">3. flooded cells are skipped</text>
      <text x="270" y="144" fill="var(--danger)" font-size="14">diagonal does not join</text>
      <text x="270" y="164" fill="var(--ok)" font-size="14">count = 3</text>
    </g>
  </g>
</svg>
```

```narrate
Walk through the picture. [[scan]] We scan the grid row by row, and the first land cell we meet is in the top left corner. [[flood]] That is a new island, so we add one to the count and flood it, painting every land cell connected to it. The second island gets the same treatment. [[count]] The flooded cells are skipped by the scan. The last cell touches the second island only at a corner, so it is a third island. The count is three.
```

> **Why:** the flood is what makes the count correct. One island is found once, however many cells it has.

## Visited: how to remember

Without a mark the flood bounces between two neighbors forever. You need to remember what you have seen.

- **A `visited` set** of `(row, column)`: the input stays untouched. Costs `O(rows * columns)` memory
- **Sink the land**: overwrite `"1"` with `"0"`. No extra memory, but you destroy the caller's grid

> **Not this:** sinking land without asking. It is short, but a function that quietly ruins its input surprises everyone. In an interview, ask "may I change the grid?". Here the tests check the grid is unchanged.

> **Trap:** mark a cell when you **add** it to the queue, not when you take it out. Mark late and the same cell is added by each of its neighbors.

```narrate
You must remember which cells you have seen, or the flood walks back and forth forever. A set of row and column pairs keeps the input safe. Overwriting land with water is shorter, but it destroys the caller's data, so ask the interviewer first. Whichever you choose, mark a cell the moment you add it to the queue, not when you take it out.
```

## The recursion depth trap

Recursive DFS is only four lines, so it is tempting. But a grid that is all land is **one huge island**: the recursion goes as deep as the island is big. A 300 by 300 grid is 90,000 calls deep.

Python stops at about **1000** with `RecursionError`. Raising the limit is not a fix: the docs warn that "a too-high limit can lead to a crash".

The fix: replace the call stack with your own. A `deque` and a loop is **BFS**. Swap `popleft()` for `pop()` and the same loop is **DFS**.

> **Not this:** `list.pop(0)` as a queue. It moves every item (`O(n)`). A `deque` pops from the left in `O(1)`.

```quiz
q: A 300 by 300 grid is all land. You flood it with recursive DFS and the default recursion limit. What happens?
options:
  - it returns 1
  - it raises RecursionError
  - it returns 90000
answer: 1
why: The whole grid is one island, so the recursion goes about 90,000 calls deep. Python gives up at about 1000.
```

```narrate
Now the trap that catches people. Recursive depth first search is short, but on a grid that is all land, the recursion goes as deep as the island is big. Python gives up at about a thousand calls with a recursion error. Raising the limit is risky. The safe fix is to use your own queue in a loop. With a deque it is breadth first search, and the loop never goes deep.
```

## Your turn

Implement `num_islands(grid)` in `number_of_islands.py`. Cells are the strings `"1"` and `"0"`.

- Leave `grid` unchanged
- No recursion, and do not touch `sys.setrecursionlimit`
- Tests include a 300 by 300 island and 45,000 tiny islands

```hint
Scan with two loops. Skip water, and skip any cell already in the `visited` set. Each new land cell is one more island.
```

```hint
Flood with `deque([start])`. Pop a cell, look at its four neighbors, and for each one that is inside the grid, land, and not visited: add it to `visited` and to the queue.
```

```hint
Keep the four moves in a constant: `DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1))`. Then one small function can yield the land neighbors of a cell.
```
