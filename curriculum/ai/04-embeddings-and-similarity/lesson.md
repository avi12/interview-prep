---
title: Embeddings and similarity
lang: py
minutes: 25
level: junior
roles: [ai, backend]
files: [similarity.py]
sources:
  - https://platform.claude.com/docs/en/build-with-claude/embeddings
  - https://developers.openai.com/api/docs/guides/embeddings
  - https://www.pinecone.io/learn/vector-similarity/
  - https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html
  - https://numpy.org/doc/stable/reference/generated/numpy.argsort.html
  - https://numpy.org/doc/stable/reference/generated/numpy.divide.html
---

## What an embedding is

An **embedding** is a list of numbers that stands for a piece of text. Texts with similar meaning get vectors that point the same way.

- OpenAI describes it as "a vector (list) of floating point numbers"; small distance means related
- Anthropic offers no embedding model of its own and points to Voyage AI
- Real vectors have 1,000+ dimensions (Voyage defaults to 1024)

In this lesson `embed(text)` is a **toy**: one slot per word in a 50-word vocabulary, counting how often each word appears. Look at `curriculum/_kit/toy_embedding.py`.

```python
embed("the dog loves to fetch")
```

> **Why:** a toy keeps the maths visible and the tests free of network and keys.

> **Trap:** the toy has no meaning. "cat" and "kitten" are different slots, so they look unrelated. A real model puts them close.

```narrate
An embedding turns text into a list of numbers, so a computer can measure how close two texts are. Real models give lists of a thousand numbers or more, and similar meanings point in similar directions. Here we use a toy that just counts words, because it is simple and needs no network. The catch: it knows no meaning, so cat and kitten look unrelated.
```

## Three ways to compare two vectors

The **dot product** multiplies matching slots and adds them up: `[1, 2] . [3, 4] = 1x3 + 2x4 = 11`. Bigger means more alike, but long vectors score high too.

```svg Vector A points the same way as q but is longer; B is nearer to q but points elsewhere. Cosine and dot pick A, distance picks B
<svg viewBox="0 0 640 300" role="img" aria-label="Two vectors compared to a query with cosine, dot product and distance">
  <defs>
    <marker id="arrow-vec" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="12">
    <path d="M50 260 L50 20" stroke="var(--border)" stroke-width="2"/>
    <path d="M50 250 L290 250" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="query">
      <path d="M50 250 L128 190" stroke="var(--primary)" stroke-width="3" marker-end="url(#arrow-vec)"/>
      <text x="122" y="228" fill="var(--fg)">q (4, 3)</text>
    </g>
    <g data-cue="same">
      <path d="M50 250 L246 100" stroke="var(--cat-1)" stroke-width="3" marker-end="url(#arrow-vec)"/>
      <text x="196" y="90" fill="var(--fg)">A (10, 7.5)</text>
    </g>
    <g data-cue="other">
      <path d="M50 250 L70 150" stroke="var(--cat-2)" stroke-width="3" marker-end="url(#arrow-vec)"/>
      <text x="76" y="140" fill="var(--fg)">B (1, 5)</text>
      <path d="M86 223 A45 45 0 0 0 58.8 205.9" fill="none" stroke="var(--fg-muted)" stroke-width="2"/>
    </g>
    <g data-cue="cosine">
      <rect x="310" y="30" width="320" height="56" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="320" y="52" fill="var(--fg)">cosine: the angle only</text>
      <text x="320" y="72" fill="var(--fg-muted)" font-size="11">A 1.00, B 0.75: A is closer</text>
    </g>
    <g data-cue="dot">
      <rect x="310" y="96" width="320" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="320" y="118" fill="var(--fg)">dot product: angle and length</text>
      <text x="320" y="138" fill="var(--fg-muted)" font-size="11">A 62.5, B 19: A is closer</text>
    </g>
    <g data-cue="distance">
      <rect x="310" y="162" width="320" height="56" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="320" y="184" fill="var(--fg)">euclidean distance: straight line</text>
      <text x="320" y="204" fill="var(--fg-muted)" font-size="11">A 7.5, B 3.6: B is closer</text>
    </g>
    <g data-cue="unit">
      <text x="20" y="284" fill="var(--fg)" font-size="12">after normalizing to length 1, all three agree</text>
    </g>
  </g>
</svg>
```

```narrate
Look at the plot. [[query]] This arrow is the query. [[same]] Vector A points exactly the same way, but it is longer. [[other]] Vector B is short and points somewhere else. [[cosine]] Cosine looks only at the angle, so A wins. [[dot]] The dot product mixes angle and length, so A wins by a lot. [[distance]] Straight-line distance says B is closer, because A is far away. [[unit]] Shrink every vector to length one, and the three methods agree.
```

> **Why:** cosine ignores length, so a long document that repeats a word does not win just by being long.

> **Not this:** Euclidean distance on raw vectors. Here it picks B, which points the wrong way.

## Normalize, then dot

**Cosine similarity** is the dot product divided by both lengths:

`cos(a, b) = (a . b) / (|a| x |b|)` and it runs from -1 to 1.

A **normalized** vector has length 1. For those, the dot product *is* the cosine, and distance gives the same ranking. OpenAI and Voyage embeddings already come with length 1, so a plain dot product is the fast, correct choice.

```python
lengths = np.linalg.norm(matrix, axis=1)
```

> **Trap:** a zero vector (no known word) has length 0. Dividing gives `nan`. Return `0.0` instead.

> **Trap:** `matrix /= lengths` changes the caller's data. Make a new array.

```quiz
q: Your embedding model returns vectors of length 1. Which comparison is fastest and still correct?
options:
  - cosine with two norms and a division
  - the plain dot product
  - euclidean distance
answer: 1
why: For length 1 vectors the dot product equals the cosine, so the lengths and the division are wasted work.
```

```narrate
Cosine similarity is the dot product divided by the two lengths. If every vector already has length one, the division does nothing, and the plain dot product is the cosine. That is why many embedding models return vectors of length one. Two traps. A vector of zeros has length zero, so dividing gives not a number. And divide in place, and you silently change the caller's data.
```

## Top k without a loop

To find the k best documents, score **all** rows at once.

| Piece | Shape | Meaning |
|---|---|---|
| `matrix` | (n, d) | one row per document |
| `query` | (d,) | the question |
| `matrix @ query` | (n,) | one dot product per row |

Then `np.argsort(-scores, kind="stable")[:k]` gives the best first. A stable sort keeps the lower index first when scores tie.

> **Why:** NumPy runs the loop in C. The tests time a 400,000-row matrix against a plain Python loop.

> **Not this:** `for row in matrix: cosine_similarity(query, row)`. Correct, but many times slower at scale.

```narrate
To rank a whole collection, do not loop. Stack the document vectors into one matrix. One matrix times vector product gives a dot product for every row at once, and numpy does that loop in fast compiled code. Then sort the scores, best first, and take the first k. Use a stable sort, so equal scores keep the lower index first. The tests time this against a plain Python loop.
```

## Your turn

Open `similarity.py`. Two functions:

- `cosine_similarity(a, b)`: a float. Lists and arrays both work. A zero vector gives `0.0`, with no warning
- `top_k_similar(query, matrix, k)`: a list of `(index, score)` pairs, best first. Ties keep the lower index. `k` larger than the matrix returns all rows; `k` of 0 returns `[]`

Do not change `query` or `matrix`. Use the toy `embed` and `embed_many` in your own experiments: `from toy_embedding import embed, embed_many` (the file is `curriculum/_kit/toy_embedding.py`).

```hint
`np.asarray(a, dtype=float)` accepts lists and arrays. `np.linalg.norm(a)` is the length. If the product of both lengths is 0, return `0.0`.
```

```hint
For `top_k_similar`, compute `matrix @ query` and `np.linalg.norm(matrix, axis=1) * np.linalg.norm(query)`, then divide.
```

```hint
Zero lengths: `np.divide(dots, lengths, out=np.zeros_like(dots), where=lengths != 0)` keeps 0.0 where the length is 0. Sort with `np.argsort(-scores, kind="stable")[:k]`.
```
