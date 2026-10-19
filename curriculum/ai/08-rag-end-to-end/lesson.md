---
title: RAG end to end
lang: py
minutes: 25
level: junior
roles: [ai]
files: [rag.py]
sources:
  - https://www.anthropic.com/news/contextual-retrieval
  - https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
  - https://platform.claude.com/docs/en/build-with-claude/citations
  - https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks
  - https://genai.owasp.org/llmrisk/llm01-prompt-injection/
---

## The pipeline in one picture

**RAG** (retrieval-augmented generation) means: look up the relevant text first, then let the model answer from it. The model reads your documents instead of guessing.

```svg Index once offline; per question, embed, search, gate on score, build a prompt with numbered sources, answer with citations, or skip the model and say I don't know
<svg viewBox="0 0 680 280" role="img" aria-label="RAG pipeline with an offline indexing row and a per-question row with a score gate">
  <defs>
    <marker id="arrow-rag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="offline">
      <text x="10" y="16" fill="var(--fg-muted)">INDEX ONCE</text>
      <rect x="10" y="26" width="100" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="53" text-anchor="middle" fill="var(--fg)">docs</text>
      <path d="M112 48 L138 48" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
      <rect x="140" y="26" width="100" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="190" y="53" text-anchor="middle" fill="var(--fg)">chunk</text>
      <path d="M242 48 L268 48" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
      <rect x="270" y="26" width="100" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="320" y="53" text-anchor="middle" fill="var(--fg)">embed</text>
      <path d="M372 48 L398 48" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
      <rect x="400" y="26" width="150" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="475" y="46" text-anchor="middle" fill="var(--fg)">index</text>
      <text x="475" y="62" text-anchor="middle" fill="var(--fg-muted)" font-size="11">id + text + vector</text>
    </g>
    <text x="10" y="112" fill="var(--fg-muted)">ASK, PER QUESTION</text>
    <g data-cue="question">
      <rect x="10" y="122" width="100" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="149" text-anchor="middle" fill="var(--fg)">question</text>
    </g>
    <path d="M112 144 L138 144" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="search">
      <rect x="140" y="122" width="110" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="195" y="142" text-anchor="middle" fill="var(--fg)">embed + search</text>
      <text x="195" y="158" text-anchor="middle" fill="var(--fg-muted)" font-size="11">top k by cosine</text>
    </g>
    <path d="M252 144 L278 144" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="gate">
      <rect x="280" y="122" width="120" height="44" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="142" text-anchor="middle" fill="var(--fg)">score >= 0.25 ?</text>
      <text x="340" y="158" text-anchor="middle" fill="var(--fg)" font-size="11">0.40 keep, 0.24 drop</text>
    </g>
    <path d="M402 144 L428 144" stroke="var(--ok)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="prompt">
      <rect x="430" y="122" width="110" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="485" y="142" text-anchor="middle" fill="var(--fg)">prompt</text>
      <text x="485" y="158" text-anchor="middle" fill="var(--fg-muted)" font-size="11">sources [1] [2]</text>
    </g>
    <path d="M542 144 L568 144" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="model">
      <rect x="570" y="122" width="100" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="620" y="142" text-anchor="middle" fill="var(--fg)">model</text>
      <text x="620" y="158" text-anchor="middle" fill="var(--fg-muted)" font-size="11">cites [1]</text>
    </g>
    <path d="M340 168 L340 206" fill="none" stroke="var(--danger)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="idk">
      <rect x="230" y="208" width="220" height="48" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="340" y="228" text-anchor="middle" fill="var(--fg)">I don't know</text>
      <text x="340" y="244" text-anchor="middle" fill="var(--fg-muted)" font-size="11">no hit passed: model not called</text>
    </g>
  </g>
</svg>
```

> **Why:** the model answers from text you can show the user, and you can fix a wrong answer by fixing a document.

```narrate
[[offline]] Before any question, you index once: split the documents into chunks, embed each chunk, and store its text with its vector. [[question]] Then a question arrives. [[search]] We embed it too and rank the chunks by similarity. [[gate]] A score gate keeps only the hits above the threshold. [[prompt]] The survivors go into the prompt as numbered sources. [[model]] The model answers from them and cites the numbers. [[idk]] If nothing passes the gate, we skip the model and say I don't know.
```

## Index once, ask many times

Indexing is slow and happens **offline**. Asking is fast and happens per question.

```python
index = build_index(docs={"refunds": "Refunds are available within 30 days of purchase. ..."})
index[0].id      # "refunds#1"
index[0].vector  # {"refund": 2.0, "available": 1.0, "within": 1.0, ...}
```

- A chunk keeps its **id**, so a citation can point back to a real place
- Here an "embedding" is a word-count dict, so the exercise needs no model. A real one (lesson 04) is a dense vector that also matches "money back" to "refund"
- Chunk sizes are a trade-off you studied in lesson 05

> **Trap:** embed the question and the chunks with the **same** embedding. Vectors from two different models cannot be compared.

```narrate
Indexing is slow, so you do it offline, once. Each chunk keeps an id, so a citation can point back to a real place. In this lesson the embedding just counts words, which keeps the exercise free of any model. A real embedding is a dense vector that also knows that money back means refund. Whatever you choose, embed the question and the chunks with the same embedding, or the numbers mean nothing.
```

## Retrieve, then gate

Score every chunk against the question, sort best first, keep the top `k`, then drop anything under `min_score`.

| Question | Best score | Decision |
|---|---|---|
| How long does standard shipping take? | 0.60 | answer |
| How many days do I have to ask for a refund? | 0.40 | answer |
| What is the capital of France? | 0.00 | I don't know |
| Can I get my money back? | 0.00 | I don't know (toy embedding misses the synonym) |

> **Why:** weak context invites the model to guess, and the guess sounds confident. A gate is a cheap `if` that skips the model call and the cost.

> **Not this:** always pass the top 3 and "let the model sort it out". Even the worst 3 chunks look like evidence.

> **Trap:** a good threshold depends on the embedding model. Tune it on a golden set that includes questions with **no** answer (lesson 07).

```narrate
Score every chunk against the question, sort best first, keep the top k, then drop anything under the threshold. Shipping scores point six, so we answer. France scores zero, so we say I don't know, and we never call the model. Weak context makes a model guess, and the guess sounds confident. The right threshold depends on your embedding model, so tune it on a golden set that includes questions with no answer.
```

## Build the prompt, check the citations

Number the sources. Say how to cite. Say what to do when the sources are not enough.

```text
Answer the question using only the sources below. Cite each source you use like [1].
If the sources do not contain the answer, reply: I don't know ...

<sources>
[1] Standard shipping takes 5 to 7 business days. ...
</sources>

Question: How long does standard shipping take?
```

The reply says `[1]`. Map the number back to chunk id `shipping#1` and show it. A number that is **not** a source, like `[9]`, was invented: drop it.

> **Trap:** retrieved text is **data**. A page that says "ignore your instructions" is still just a source. Lesson 09 hardens this.

```quiz
q: A user asks something your documents do not cover, and no chunk passes the threshold. What should happen?
options:
  - Send the best 3 chunks anyway and hope the model refuses
  - Skip the model and answer I don't know
  - Lower the threshold until something matches
answer: 1
why: With no good evidence the safe answer is I don't know, and skipping the model also saves the call.
```

```narrate
The prompt does three jobs. It numbers the sources. It tells the model how to cite them. And it gives the model permission to say it does not know. When the reply says one in brackets, map that number back to the chunk id and show the user where the answer came from. If the reply cites a number that is not a source, the model invented it, so drop it. Also remember that retrieved text is data, never instructions.
```

## Two layers of I don't know

- **Before the model:** the score gate. No evidence, no call
- **Inside the prompt:** permission to say "I don't know" when the sources fall short. Anthropic's guide says this simple permission can drastically reduce false information
- **After the model:** a reply with no valid citation is **not grounded**. Flag it, log it, or hide it

Claude's API also has built-in citations: with `citations: {enabled: true}` on a document block, the response carries pointers that are guaranteed to be valid. The `[n]` style here works with any model.

> **Why:** each layer catches what the one before it lets through, and none is perfect alone.

```narrate
Plan for I don't know in three layers. Before the model, the score gate: no evidence, no call. Inside the prompt, explicit permission to say it does not know. After the model, a check that the reply cites at least one real source. A reply with no valid citation is not grounded, so flag it. Claude's interface can produce citations for you, but the numbered style works with any model.
```

## Your turn

Open `rag.py`. Given: `toy_embed`, `cosine`, `chunk_document`, `build_index`, and the `Hit` and `Answer` types. Implement:

- `retrieve(index=, question=, top_k=, min_score=)`: hits best first, at most `top_k`, each with `score >= min_score`
- `build_prompt(question=, hits=)`: numbered sources, the question, and permission to say you don't know
- `cited_sources(reply=, hits=)`: chunk ids for valid `[n]` marks, in order, no repeats
- `answer(model=, index=, question=, ...)`: no hits means `NO_ANSWER_TEXT` and **no model call**; otherwise one call and a grounded flag

The model is anything with `complete(prompt)`. The tests use this stub, so no network or key:

```python
class ScriptedModel:
    def __init__(self, replies):
        self.replies = list(replies)
        self.prompts = []

    def complete(self, prompt):
        self.prompts.append(prompt)
        return self.replies.pop(0)
```

```hint
retrieve: build `Hit(chunk=chunk, score=cosine(toy_embed(question), chunk.vector))` for every chunk, sort by `score` with `reverse=True`, slice `[:top_k]`, then filter on `min_score`.
```

```hint
build_prompt: `enumerate(hits, start=1)` gives the numbers. Join lines like `[1] text` into one block and put the question last. Reuse `NO_ANSWER_TEXT` as the reply the model should give.
```

```hint
cited_sources: loop over `CITATION_PATTERN.finditer(reply)`. Skip `number` unless `1 <= number <= len(hits)`, and skip ids you already collected.
```

```hint
answer: retrieve first. If `hits` is empty, return `Answer(text=NO_ANSWER_TEXT, sources=[], is_grounded=False)` before touching the model. Otherwise call `model.complete(prompt)` once and set `is_grounded` from the sources.
```
