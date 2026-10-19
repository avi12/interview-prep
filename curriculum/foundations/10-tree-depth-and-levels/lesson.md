---
title: Tree Depth and Levels
lang: ts
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [treeTraversal.ts]
sources:
  - https://en.wikipedia.org/wiki/Tree_traversal
  - https://www.designgurus.io/answers/detail/104-maximum-depth-of-binary-tree
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion
---

## The problem

Two questions about one binary tree. The starter already gives you the `TreeNode` class: `val`, `left`, `right`, and `null` where a child is missing.

- `maxDepth(root)`: how many nodes lie on the longest path from the root down to a leaf
- `levelOrder(root)`: the values grouped by level, top to bottom, left to right

For the tree `3, 9, 20, null, null, 15, 7`, the depth is `3` and the levels are `[[3], [9, 20], [15, 7]]`. An empty tree (`null`) gives `0` and `[]`.

```narrate
Here are two small questions about the same binary tree. How deep is it? And what are the values, level by level? Together they cover the two ways of walking a tree, and interviewers ask for both all the time.
```

## Two ways to walk a tree

- **DFS**, depth first: go as deep as you can, then back up. Recursion does this for free, because the call stack remembers the way back
- **BFS**, breadth first: finish a whole level before the next one. A **queue** remembers who comes next

```svg DFS dives down and the answers come back up. BFS reads one level at a time through a queue.
<svg viewBox="0 0 520 270" role="img" aria-label="Depth first and breadth first walks of the same five node tree">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="dfs">
      <text x="20" y="16" fill="var(--fg)" font-size="15">DFS: deep first</text>
      <path d="M130 66 L70 106 M130 66 L190 106 M190 134 L150 174 M190 134 L230 174" stroke="var(--border)" stroke-width="2" fill="none"/>
      <circle cx="130" cy="50" r="16" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="55" text-anchor="middle" fill="var(--fg)">3</text>
      <circle cx="70" cy="118" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="70" y="123" text-anchor="middle" fill="var(--fg)">9</text>
      <circle cx="190" cy="118" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="190" y="123" text-anchor="middle" fill="var(--fg)">20</text>
      <circle cx="150" cy="186" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="150" y="191" text-anchor="middle" fill="var(--fg)">15</text>
      <circle cx="230" cy="186" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="230" y="191" text-anchor="middle" fill="var(--fg)">7</text>
      <text x="100" y="40" fill="var(--accent-2)" font-size="12">1st</text>
      <text x="40" y="108" fill="var(--accent-2)" font-size="12">2nd</text>
      <text x="212" y="108" fill="var(--accent-2)" font-size="12">3rd</text>
      <text x="108" y="176" fill="var(--accent-2)" font-size="12">4th</text>
      <text x="252" y="176" fill="var(--accent-2)" font-size="12">5th</text>
    </g>
    <g data-cue="back">
      <text x="86" y="140" fill="var(--ok)" font-size="12">d=1</text>
      <text x="206" y="152" fill="var(--ok)" font-size="12">d=2</text>
      <text x="120" y="212" fill="var(--ok)" font-size="12">d=1</text>
      <text x="244" y="212" fill="var(--ok)" font-size="12">d=1</text>
      <text x="152" y="72" fill="var(--ok)" font-size="12">d=3</text>
      <text x="20" y="250" fill="var(--fg-muted)" font-size="13">answers return up: 1 + deeper child</text>
    </g>
    <g data-cue="bfs">
      <text x="280" y="16" fill="var(--fg)" font-size="15">BFS: level by level</text>
      <rect x="270" y="30" width="240" height="40" fill="var(--cat-1)" fill-opacity="0.25"/>
      <rect x="270" y="98" width="240" height="40" fill="var(--cat-2)" fill-opacity="0.25"/>
      <rect x="270" y="166" width="240" height="40" fill="var(--cat-3)" fill-opacity="0.25"/>
      <path d="M390 66 L330 106 M390 66 L450 106 M450 134 L410 174 M450 134 L490 174" stroke="var(--border)" stroke-width="2" fill="none"/>
      <circle cx="390" cy="50" r="16" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="55" text-anchor="middle" fill="var(--fg)">3</text>
      <circle cx="330" cy="118" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="330" y="123" text-anchor="middle" fill="var(--fg)">9</text>
      <circle cx="450" cy="118" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="450" y="123" text-anchor="middle" fill="var(--fg)">20</text>
      <circle cx="410" cy="186" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="410" y="191" text-anchor="middle" fill="var(--fg)">15</text>
      <circle cx="490" cy="186" r="16" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="490" y="191" text-anchor="middle" fill="var(--fg)">7</text>
    </g>
    <g data-cue="queue">
      <text x="276" y="55" fill="var(--fg)" font-size="12">q: 3</text>
      <text x="276" y="123" fill="var(--fg)" font-size="12">q: 9 20</text>
      <text x="276" y="191" fill="var(--fg)" font-size="12">q: 15 7</text>
    </g>
  </g>
</svg>
```

```narrate
Same tree, two walks. [[dfs]] On the left, depth first. We dive from three to nine, back up, then down the right side to twenty, fifteen and seven. [[back]] The useful part is the answers coming back up: each node returns one plus its deeper child. [[bfs]] On the right, breadth first. We read the tree one level at a time. [[queue]] A queue holds the nodes waiting their turn, so a whole level leaves before any of its children.
```

## Depth: let recursion remember

The depth of a tree is **1 plus the depth of its deeper child**. A missing node has depth `0`. That is the whole idea:

```text
depth(null) = 0
depth(node) = 1 + max(depth(left), depth(right))
```

> **Why:** every node asks the same question about a smaller tree. When a node's answer is built from its children's answers, recursion is the natural fit.

> **Trap:** no base case and the function never stops: `RangeError: Maximum call stack size exceeded`. A chain of 100,000 nodes overflows even with one. For that, count the levels with BFS.

```narrate
Depth is a recursive idea. A missing node has depth zero. Any other node is one plus the deeper of its two children. Write the base case first, or the function calls itself forever and the stack overflows. Mention in the interview that a very deep chain can overflow the stack, and that the breadth first version avoids that.
```

## Levels: let a queue remember

Put the root in a queue. Then repeat until the queue is empty:

1. **Freeze the level size**: how many nodes are in the queue right now. That is exactly one level
2. Take that many nodes, record their values, add their children at the back
3. Push the finished level into the result

```ts
const levelSize = queue.length - head;
```

> **Not this:** looping while `queue.length` is positive for the inner loop. The length grows as you add children, so the next level leaks into this one. Freeze the size first.

> **Trap:** `queue.shift()` moves every remaining item one place left (MDN). Fine for small trees. For big ones keep a `head` index and move it forward.

```quiz
q: A queue holds [9, 20]. You take 9 and add its two children. Which nodes still belong to the current level?
options:
  - only 20
  - 20 and the two new children
  - nothing, the level is done
answer: 0
why: The level size was frozen at 2 before you started. Only 20 is left of those two, and the new children wait for the next round.
```

```narrate
Level order is a loop around a queue. The key move is to freeze how many nodes are in the queue when a level starts. That count is the level. Take exactly that many, add their children to the back, and the next level is ready. If you loop on the live length instead, children from the next level sneak into this one.
```

## Your turn

Open `treeTraversal.ts`. `TreeNode` is already written. Implement both functions.

- `maxDepth(root)` with recursion
- `levelOrder(root)` with a queue and a loop, no recursion
- Both accept `null`

```hint
maxDepth: return 0 for null first. Then ask both children for their depth.
```

```hint
maxDepth is one line after the base case: 1 + Math.max(left depth, right depth).
```

```hint
levelOrder: start with `const queue = [root]` and `let head = 0`. Read `queue[head]`, then move `head` forward.
```

```hint
Inside the outer loop, compute `levelSize = queue.length - head` once, then run an inner loop exactly that many times. Push each finished level into the result.
```
