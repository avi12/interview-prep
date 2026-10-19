---
title: Retrieval metrics
lang: py
minutes: 20
level: junior
roles: [ai]
files: [retrieval_metrics.py]
sources:
  - https://www.evidentlyai.com/ranking-metrics/precision-recall-at-k
  - https://www.evidentlyai.com/ranking-metrics/mean-reciprocal-rank-mrr
  - https://www.anthropic.com/news/contextual-retrieval
  - https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/
  - https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
---

## Grade the retriever, not the answer

In a RAG system the model can only use the passages you hand it. If the right passage never arrives, no prompt can fix the answer.

So grade retrieval **on its own**. You need a **golden set**: questions, each with the ids of the passages that truly answer it. The retriever returns ids ranked best first.

```python
golden_set = [{"query": "refund window", "relevant": ["d2", "d7"]}]
retrieved = ["d9", "d2", "d4", "d7", "d1"]
```

> **Why:** a bad final answer has two possible causes, retrieval or generation. Retrieval metrics need no model call, run in milliseconds, and tell you which half broke.

> **Not this:** judging the system by reading a few final answers. You cannot tell a missed passage from a confused model.

```narrate
In a retrieval-augmented system, the model can only use the passages you hand it. If the right passage never arrives, no prompt can save the answer. So we grade the retriever on its own. We keep a golden set: questions, each with the ids of the passages that truly answer it. The retriever returns ranked ids, best first, and the metrics compare the two.
```

## One query, four numbers

Same query, same ranking. Pass only the top **k = 3** to the model.

```svg Five ranked passages, two of them relevant; with k = 3 the retriever found one of the two, and the first good one sits at rank 2
<svg viewBox="0 0 640 250" role="img" aria-label="Ranked passages with a top three cutoff and the four metrics">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="20" y="22" fill="var(--fg-muted)">RANKED RESULTS, BEST FIRST</text>
    <g data-cue="ranked">
      <rect x="20" y="34" width="100" height="48" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="70" y="55" text-anchor="middle" fill="var(--fg)">d9</text>
      <text x="70" y="73" text-anchor="middle" fill="var(--fg-muted)" font-size="11">rank 1</text>
      <rect x="132" y="34" width="100" height="48" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="182" y="55" text-anchor="middle" fill="var(--fg)">d2</text>
      <text x="182" y="73" text-anchor="middle" fill="var(--fg)" font-size="11">rank 2, relevant</text>
      <rect x="244" y="34" width="100" height="48" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="294" y="55" text-anchor="middle" fill="var(--fg)">d4</text>
      <text x="294" y="73" text-anchor="middle" fill="var(--fg-muted)" font-size="11">rank 3</text>
      <rect x="356" y="34" width="100" height="48" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="406" y="55" text-anchor="middle" fill="var(--fg)">d7</text>
      <text x="406" y="73" text-anchor="middle" fill="var(--fg)" font-size="11">rank 4, relevant</text>
      <rect x="468" y="34" width="100" height="48" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="518" y="55" text-anchor="middle" fill="var(--fg)">d1</text>
      <text x="518" y="73" text-anchor="middle" fill="var(--fg-muted)" font-size="11">rank 5</text>
    </g>
    <g data-cue="cut">
      <path d="M20 98 L20 108 L344 108 L344 98" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="182" y="126" text-anchor="middle" fill="var(--fg)">top k = 3 goes to the model</text>
      <path d="M350 30 L350 90" stroke="var(--danger)" stroke-width="2" stroke-dasharray="5 4"/>
    </g>
    <g data-cue="numbers">
      <text x="20" y="162" fill="var(--fg)">hit@3 = 1          one relevant passage in the top 3</text>
      <text x="20" y="184" fill="var(--fg)">precision@3 = 1/3  one of three slots is useful</text>
      <text x="20" y="206" fill="var(--fg)">recall@3 = 1/2     found d2, missed d7</text>
      <text x="20" y="228" fill="var(--fg)">reciprocal rank = 1/2   first relevant at rank 2</text>
    </g>
  </g>
</svg>
```

| Metric | Question it answers | Formula |
|---|---|---|
| hit rate@k | Did we get **any** right passage? | 1 if any relevant in top k, else 0 |
| precision@k | How much of what we fetched is useful? | relevant in top k / **k** |
| recall@k | How much of what we need did we fetch? | relevant in top k / **all relevant** |
| MRR | How high is the first right passage? | mean of 1 / rank of first relevant |

Hit rate, precision and recall are averaged over all queries. MRR is the mean of the per-query reciprocal ranks.

```narrate
Here is one query. [[ranked]] The retriever returned five passages, best first. Two of them, at ranks two and four, truly answer the question. [[cut]] We only pass the top three to the model, so k is three. [[numbers]] In the top three, one passage is relevant. Precision is one third, because one of three slots is useful. Recall is one half, because we found one of the two we need. The reciprocal rank is one half, because the first good passage sits at rank two.
```

## Which number to watch

Start with **recall@k**. A passage you did not fetch is gone for good.

Anthropic tracks retrieval as `1 - recall@20`, the share of relevant passages missing from the top 20. Their baseline missed **5.7%**. Adding context to each chunk, keyword search and reranking (a second model re-sorts the results) together cut that to **1.9%**.

- **Precision@k** next: extra passages cost tokens and can distract the model
- **MRR and hit rate** when you show one best result, like a help-widget suggestion

> **Why:** you can fix noise afterwards with reranking. You cannot fix a missing passage afterwards.

> **Not this:** one blended score. It hides whether you miss passages (low recall) or bury them in noise (low precision).

```quiz
q: Three queries. The first relevant passage is at rank 1, then rank 2, and the third query finds none. What is MRR?
options:
  - 0.5
  - 0.75
  - 1.5
answer: 0
why: The reciprocal ranks are 1, 1/2 and 0. Their mean is 1.5 / 3 = 0.5.
```

```narrate
Which number should you watch? Start with recall at k. A passage you did not fetch is gone for good, and the model cannot use it. Anthropic reports retrieval failures as one minus recall at twenty. Their baseline missed five point seven percent. Adding context to each chunk, keyword search and reranking together cut that to one point nine percent. Precision comes next, because extra passages cost tokens. Reciprocal rank matters when you show only the best result.
```

## Three traps

```narrate
Three details catch people. Precision divides by k, not by how many results came back. A repeated id must not be counted twice, or recall could climb above one. And a query with no relevant passage has no recall at all, so guard the division instead of crashing.
```

> **Trap:** precision divides by **k**, not by the number of results returned. One result that hits, at k = 5, is precision 0.2, not 1.0.

> **Trap:** a repeated id counts once, for precision and recall. Otherwise `["d2", "d2", "d2"]` gives recall above 1.

> **Trap:** a query with **no** relevant ids has no recall. Return `0.0` rather than dividing by zero, and test "no answer exists" questions separately (next lessons).

```quiz
q: k = 3. The retriever returns [d2, d9, d4]. The relevant set is {d2, d7, d8, d5}. What is recall@3?
options:
  - 1/4
  - 1/3
  - 1/2
answer: 0
why: One relevant passage was found, and recall divides by all 4 relevant passages, not by k. Precision would be 1/3.
```

## Your turn

Open `retrieval_metrics.py`. Implement five functions. All take keyword arguments.

- `hit_at_k`, `precision_at_k`, `recall_at_k` take `retrieved`, `relevant`, `k`
- `reciprocal_rank` takes `retrieved` and `relevant`
- `evaluate_retriever(retrieve=, golden_set=, k=)` calls `retrieve(query)`, keeps the first `k` ids, and returns the averages as `{"hit_rate", "precision", "recall", "mrr"}`

Interview angle: say which metric you would watch first and why (recall@k), then name one trap out loud.

```hint
Cut first: `top = retrieved[:k]`. Then count distinct hits with `len(set(top) & set(relevant))`. Every metric reuses that number.
```

```hint
Precision is `hits / k`. Recall is `hits / len(set(relevant))`, with an early return of `0.0` when `relevant` is empty.
```

```hint
For the reciprocal rank, loop with `enumerate(retrieved, start=1)` and return `1 / rank` at the first relevant id. Return `0.0` after the loop.
```

```hint
In `evaluate_retriever`, collect one value per metric per query in lists, then average each list with a small `_mean` helper that returns `0.0` for an empty list.
```
