---
title: Chunking and retrieval
lang: py
minutes: 25
level: junior
roles: [ai, backend]
files: [retrieval.py]
sources:
  - https://www.anthropic.com/news/contextual-retrieval
  - https://www.pinecone.io/learn/chunking-strategies/
  - https://platform.claude.com/docs/en/build-with-claude/context-windows
  - https://platform.claude.com/docs/en/build-with-claude/embeddings
  - https://developers.openai.com/api/docs/guides/embeddings
  - https://numpy.org/doc/stable/reference/generated/numpy.argsort.html
---

## Why we cut documents up

**Retrieval-augmented generation (RAG)** finds the few passages that matter, and puts only those in the prompt.

Why not paste everything? Embedding models have a limited input size, and Pinecone's guide notes that text beyond it is truncated. One vector for a whole book is also too vague to match a precise question.

```svg Documents are cut into chunks and embedded once; each question is embedded, matched against the chunks, and the top k go into the prompt
<svg viewBox="0 0 640 190" role="img" aria-label="Retrieval pipeline from documents to prompt">
  <defs>
    <marker id="arrow-rag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="13">
    <text x="10" y="16" fill="var(--fg-muted)" font-size="11">ONCE, AHEAD OF TIME</text>
    <text x="10" y="106" fill="var(--fg-muted)" font-size="11">FOR EACH QUESTION</text>
    <g data-cue="docs">
      <rect x="10" y="26" width="100" height="48" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="55" fill="var(--fg)">documents</text>
    </g>
    <path d="M112 50 L138 50" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="chunks">
      <rect x="140" y="26" width="110" height="48" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="150" y="47" fill="var(--fg)">chunks</text>
      <text x="150" y="64" fill="var(--fg-muted)" font-size="11">small pieces</text>
    </g>
    <path d="M252 50 L278 50" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="vectors">
      <rect x="280" y="26" width="160" height="48" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="290" y="47" fill="var(--fg)">vectors</text>
      <text x="290" y="64" fill="var(--fg-muted)" font-size="11">embed + store</text>
    </g>
    <g data-cue="question">
      <rect x="10" y="116" width="120" height="48" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="137" fill="var(--fg)">question</text>
      <text x="20" y="154" fill="var(--fg-muted)" font-size="11">embed it too</text>
    </g>
    <path d="M132 140 L278 140" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="topk">
      <path d="M360 76 L360 114" stroke="var(--accent-2)" stroke-width="2" marker-end="url(#arrow-rag)"/>
      <text x="368" y="100" fill="var(--fg-muted)" font-size="11">search</text>
      <rect x="280" y="116" width="160" height="48" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="290" y="137" fill="var(--fg)">top k</text>
      <text x="290" y="154" fill="var(--fg-muted)" font-size="11">nearest chunks</text>
    </g>
    <path d="M442 140 L468 140" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-rag)"/>
    <g data-cue="prompt">
      <rect x="470" y="116" width="160" height="48" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="480" y="137" fill="var(--fg)">prompt</text>
      <text x="480" y="154" fill="var(--fg-muted)" font-size="11">chunks + question</text>
    </g>
  </g>
</svg>
```

```narrate
There are two phases. [[docs]] Before any question arrives, take your documents. [[chunks]] Cut them into small chunks. [[vectors]] Embed every chunk and store the vectors. [[question]] When a question comes in, embed it with the same model. [[topk]] Search for the k chunks whose vectors are nearest. [[prompt]] Put those chunks and the question into the prompt. The model then answers from your text, not from memory.
```

> **Why:** a big context window is not a free pass. Anthropic's docs warn that as token count grows, accuracy and recall degrade ("context rot").

> **Not this:** pasting every document into the prompt "because 1M tokens fits". You pay for all of it on every call, and the answer gets worse.

## Size and overlap

A **chunk** is a window of text. Two knobs: `size` (how long) and `overlap` (how much the next chunk repeats).

- **Small chunks**: precise matches, but they lose surrounding context
- **Large chunks**: more context, but noisier matches and a bigger prompt
- Anthropic keeps chunks "usually no more than a few hundred tokens"; Pinecone suggests testing a range, such as 128 to 256 for fine detail and 512 to 1024 for context

```svg A fact that falls across a chunk boundary is cut in two without overlap, and kept whole by one chunk with overlap
<svg viewBox="0 0 640 276" role="img" aria-label="Twelve words in chunks, without and with overlap">
  <g font-family="var(--font-mono)" font-size="12">
    <text x="44" y="22" fill="var(--fg-muted)" font-size="11">NO OVERLAP</text>
    <g data-cue="fact">
      <rect x="44" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="67" y="48" text-anchor="middle" fill="var(--fg)">1</text>
      <rect x="90" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="113" y="48" text-anchor="middle" fill="var(--fg)">2</text>
      <rect x="136" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="159" y="48" text-anchor="middle" fill="var(--fg)">3</text>
      <rect x="182" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="205" y="48" text-anchor="middle" fill="var(--fg)">4</text>
      <rect x="228" y="30" width="46" height="26" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/><text x="251" y="48" text-anchor="middle" fill="var(--fg)">5</text>
      <rect x="274" y="30" width="46" height="26" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/><text x="297" y="48" text-anchor="middle" fill="var(--fg)">6</text>
      <rect x="320" y="30" width="46" height="26" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/><text x="343" y="48" text-anchor="middle" fill="var(--fg)">7</text>
      <rect x="366" y="30" width="46" height="26" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/><text x="389" y="48" text-anchor="middle" fill="var(--fg)">8</text>
      <rect x="412" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="435" y="48" text-anchor="middle" fill="var(--fg)">9</text>
      <rect x="458" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="481" y="48" text-anchor="middle" fill="var(--fg)">10</text>
      <rect x="504" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="527" y="48" text-anchor="middle" fill="var(--fg)">11</text>
      <rect x="550" y="30" width="46" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/><text x="573" y="48" text-anchor="middle" fill="var(--fg)">12</text>
    </g>
    <g data-cue="split">
      <rect x="44" y="64" width="276" height="18" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="52" y="77" fill="var(--fg)" font-size="11">chunk 1: words 1 to 6</text>
      <rect x="320" y="64" width="276" height="18" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="328" y="77" fill="var(--fg)" font-size="11">chunk 2: words 7 to 12</text>
      <text x="44" y="104" fill="var(--danger)" font-size="12">the fact (words 5 to 8) is cut in two</text>
    </g>
    <text x="44" y="146" fill="var(--fg-muted)" font-size="11">OVERLAP OF 3 WORDS</text>
    <g data-cue="overlap">
      <rect x="182" y="156" width="138" height="46" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
      <rect x="44" y="160" width="276" height="18" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="52" y="173" fill="var(--fg)" font-size="11">chunk 1: words 1 to 6</text>
      <rect x="320" y="204" width="276" height="18" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="328" y="217" fill="var(--fg)" font-size="11">chunk 3: words 7 to 12</text>
    </g>
    <g data-cue="whole">
      <rect x="182" y="182" width="276" height="18" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="3"/>
      <text x="190" y="195" fill="var(--fg)" font-size="11">chunk 2: words 4 to 9</text>
      <text x="44" y="250" fill="var(--ok)" font-size="12">chunk 2 holds the whole fact</text>
    </g>
  </g>
</svg>
```

```narrate
Picture twelve words in a row, with an important fact on words five to eight. [[fact]] Here are the words, with the fact highlighted. [[split]] Without overlap, chunk one ends at word six and chunk two starts at word seven, so the fact is cut in two and neither chunk matches the question well. [[overlap]] With an overlap of three words, neighbouring chunks share their edges. [[whole]] Now chunk two runs from word four to word nine, and it holds the whole fact.
```

> **Why:** overlap gives a fact that sits on a boundary a second chance to appear whole in one chunk.

> **Trap:** `overlap >= size` never moves forward. Reject it.

```quiz
q: A text has 10 words. Chunks are size 4 with overlap 1. How many chunks?
options:
  - 2
  - 3
  - 4
answer: 1
why: The window moves 3 words each time (size minus overlap). Chunks start at words 1, 4 and 7, and the last one ends at word 10.
```

## Fixed, sentence-aware, or smarter?

| Method | Cuts at | Trade-off |
|---|---|---|
| Fixed size + overlap | every N words | simple and predictable, may cut a sentence in half |
| Sentence or recursive | paragraph, then sentence, then word | clean edges, uneven sizes |
| Semantic | where the topic shifts | needs embeddings to chunk; Pinecone calls it experimental |

Start with fixed size and overlap, then **measure** retrieval before adding anything fancier.

Two gaps in plain chunks, from Anthropic's contextual retrieval post:

- A chunk can lose its source: "revenue grew by 3%", but whose?
- Embeddings can miss exact terms, so **embeddings plus BM25** beat embeddings alone

> **Not this:** semantic chunking on day one. It adds cost and moving parts before you know where retrieval fails.

```narrate
Fixed size chunks with overlap are the simple default, and Pinecone says they work best in most cases. Sentence aware or recursive splitters give cleaner edges but uneven sizes. Semantic chunking is newer and costs more. Measure before you add complexity. Anthropic points out two gaps. A chunk can forget where it came from, and embeddings alone can miss exact terms, so adding keyword search with BM25 helps.
```

## Retrieval is embed plus top k

`retrieve(query, chunks, embed, k)` is the heart of RAG:

1. Embed every chunk and the query with the **same** `embed` function
2. Score each chunk by cosine similarity (last lesson's maths)
3. Keep the best `k`, best first

> **Why:** keep only chunks with a score above zero. Returning `k` chunks no matter what hands the model junk to answer from. Real embeddings rarely score exactly zero, so there you tune a score cutoff.

> **Trap:** embedding the query with one model and the chunks with another. The numbers live in different spaces and the scores mean nothing.

Anthropic's tests found that passing the top 20 chunks beat the top 10 or top 5. So `k` is a setting to measure, not a constant.

```narrate
Retrieval has three steps. Embed every chunk and the query with the same embedding function. Score each chunk with cosine similarity. Keep the best k, best first. Two cautions. Drop chunks with no similarity at all, otherwise the model gets junk to answer from. And never mix embedding models between chunks and queries. As for k, Anthropic found twenty chunks worked better than ten or five, so measure it.
```

## Your turn

Open `retrieval.py`. Two functions. Your `embed` is the toy from lesson 4: `from toy_embedding import embed` (`curriculum/_kit/toy_embedding.py`).

- `chunk_text(text, size, overlap)`: split on whitespace, windows of `size` words, each next window starts `size - overlap` words later. Join with one space. No extra tail chunk made only of repeated words. Empty text gives `[]`. Raise `ValueError` when `size < 1` or `overlap` is negative or `>= size`
- `retrieve(query, chunks, embed, k=3)`: the top `k` chunk **strings**, best first, ties keep the earlier chunk, only chunks with a score above zero

Tests include a fact that straddles a boundary: overlap must rescue it.

```hint
Step is `size - overlap`. Use `range(0, last_start, step)` and slice `words[start:start + size]`.
```

```hint
The last start must satisfy `start + overlap < len(words)`, or you add a chunk of only repeated words. With few words, still emit one chunk.
```

```hint
For `retrieve`: build a matrix with `embed(chunk)` per chunk, divide dot products by length products where the length is not 0, `np.argsort(-scores, kind="stable")[:k]`, then keep scores above 0.
```
