---
title: Design a RAG chatbot
lang: none
minutes: 25
level: junior
roles: [ai, backend]
sources:
  - https://arxiv.org/abs/2005.11401
  - https://www.anthropic.com/news/contextual-retrieval
  - https://www.pinecone.io/learn/chunking-strategies/
  - https://platform.claude.com/docs/en/build-with-claude/embeddings
  - https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
  - https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/
  - https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/
  - https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/
---

## The question and its two flows

"Design a chatbot that answers questions from our company documents."

A model only knows what it was trained on. **RAG** (retrieval-augmented generation) adds an outside memory you can update without retraining: **find** the right passages, then answer **from them**.

- **Ingest** (offline): prepare the documents, and redo it when they change
- **Query** (online): for each question, retrieve, then generate

Say this early: under about 200,000 tokens (500 pages), Anthropic suggests skipping RAG and putting everything in the prompt.

```svg Two flows, one store: ingest fills it offline, the query flow reads it for every question
<svg viewBox="0 0 640 252" role="img" aria-label="RAG architecture: an ingest flow fills the vector store, a query flow retrieves from it and asks the model" font-family="var(--font-mono)" font-size="13">
<text x="10" y="22" font-size="12" fill="var(--fg-muted)" text-anchor="start">INGEST (offline)</text>
<g data-cue="docs">
<rect x="10" y="34" width="104" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="62" y="64.2" font-size="12" fill="var(--fg)" text-anchor="middle">Documents</text>
</g>
<g data-cue="ingest">
<path d="M114 60 L148 60" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="148,60 138,65 138,55" fill="var(--fg)"/>
<rect x="148" y="34" width="96" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="196" y="64.2" font-size="12" fill="var(--fg)" text-anchor="middle">Chunk</text>
<path d="M244 60 L278 60" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="278,60 268,65 268,55" fill="var(--fg)"/>
<rect x="278" y="34" width="96" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="326" y="64.2" font-size="12" fill="var(--fg)" text-anchor="middle">Embed</text>
</g>
<g data-cue="store">
<path d="M374 60 L408 60" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="408,60 398,65 398,55" fill="var(--fg)"/>
<rect x="408" y="34" width="190" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="503" y="56.2" font-size="12" fill="var(--fg)" text-anchor="middle">Vector store</text>
<text x="503" y="72.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">text + vector + metadata</text>
</g>
<text x="10" y="156" font-size="12" fill="var(--fg-muted)" text-anchor="start">QUERY (online, per question)</text>
<g data-cue="question">
<rect x="10" y="168" width="104" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="62" y="198.2" font-size="12" fill="var(--fg)" text-anchor="middle">Question</text>
<path d="M114 194 L148 194" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="148,194 138,199 138,189" fill="var(--fg)"/>
<rect x="148" y="168" width="96" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="196" y="190.2" font-size="12" fill="var(--fg)" text-anchor="middle">Embed</text>
<text x="196" y="206.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">same model</text>
</g>
<g data-cue="retrieve">
<path d="M244 194 L278 194" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="278,194 268,199 268,189" fill="var(--fg)"/>
<rect x="278" y="168" width="96" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="326" y="190.2" font-size="12" fill="var(--fg)" text-anchor="middle">Retrieve</text>
<text x="326" y="206.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">+ rerank</text>
<path d="M326 168 L326 126 L503 126 L503 88" fill="none" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="503,88 508,98 498,98" fill="var(--ok)"/>
<text x="336" y="118" font-size="12" fill="var(--fg)" text-anchor="start">similar chunks</text>
</g>
<g data-cue="generate">
<path d="M374 194 L408 194" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="408,194 398,199 398,189" fill="var(--fg)"/>
<rect x="408" y="168" width="96" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="456" y="190.2" font-size="12" fill="var(--fg)" text-anchor="middle">LLM</text>
<text x="456" y="206.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">reads chunks</text>
</g>
<g data-cue="answer">
<path d="M504 194 L526 194" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="526,194 516,199 516,189" fill="var(--fg)"/>
<rect x="526" y="168" width="104" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="578" y="190.2" font-size="12" fill="var(--fg)" text-anchor="middle">Answer</text>
<text x="578" y="206.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">with sources</text>
</g>
</svg>
```

```narrate
Two flows share one store. [[docs]] On the ingest side we start from the company documents. [[ingest]] They are chunked, and each chunk is embedded. [[store]] The chunks and their vectors are saved in a vector store. That all happens offline. [[question]] On the query side, a question arrives and is embedded with the same model. [[retrieve]] We retrieve the most similar chunks and rerank them. [[generate]] The language model reads the chunks and the question. [[answer]] And it answers, with sources.
```

> **Why:** keeping ingest apart from query takes the slow work, reading and embedding, out of the user's wait.

> **Not this:** fine-tune the model to teach it the documents. Facts in the weights are hard to update and hard to cite. Retrieval gives you both.

## Ingest: chunk, embed, store

Read the documents, cut them into **chunks**, turn each chunk into an **embedding** (a list of numbers that captures meaning), and save chunk, vector and **metadata** in a **vector store** (a database that finds the nearest vectors fast).

Chunk size is a trade-off. Small chunks (128 to 256 tokens) are precise. Larger ones (512 to 1,024) keep more context. Start simple, test on real questions, then adjust.

Let neighbors **overlap** a little, so a sentence cut at an edge still appears whole in one chunk.

Keep metadata: source, page, last updated, and who may read it.

```svg Overlap protects the sentences at the cut. Each chunk gets its own vector
<svg viewBox="0 0 640 252" role="img" aria-label="A document is cut into overlapping chunks, and each chunk becomes a vector" font-family="var(--font-mono)" font-size="13">
<g data-cue="doc">
<rect x="20" y="26" width="600" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="30" y="46" font-size="12" fill="var(--fg)" text-anchor="start">refund-policy.pdf, one long text</text>
</g>
<g data-cue="chunks">
<rect x="20" y="76" width="230" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="135" y="96" font-size="12" fill="var(--fg)" text-anchor="middle">chunk 1</text>
<rect x="210" y="112" width="230" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="325" y="132" font-size="12" fill="var(--fg)" text-anchor="middle">chunk 2</text>
<rect x="400" y="76" width="230" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="515" y="96" font-size="12" fill="var(--fg)" text-anchor="middle">chunk 3</text>
</g>
<g data-cue="overlap">
<rect x="210" y="70" width="40" height="78" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="400" y="70" width="40" height="78" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
<text x="230" y="164" font-size="12" fill="var(--fg)" text-anchor="middle">overlap</text>
<text x="420" y="164" font-size="12" fill="var(--fg)" text-anchor="middle">overlap</text>
</g>
<g data-cue="vectors">
<path d="M135 106 L135 178" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="135,178 130,168 140,168" fill="var(--fg-muted)"/>
<rect x="50" y="178" width="170" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="135" y="196.9" font-size="11" fill="var(--fg)" text-anchor="middle">[0.12, -0.80, 0.33, ...]</text>
<path d="M325 142 L325 178" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="325,178 320,168 330,168" fill="var(--fg-muted)"/>
<rect x="240" y="178" width="170" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="325" y="196.9" font-size="11" fill="var(--fg)" text-anchor="middle">[0.12, -0.80, 0.33, ...]</text>
<path d="M515 106 L515 178" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="515,178 510,168 520,168" fill="var(--fg-muted)"/>
<rect x="430" y="178" width="170" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="515" y="196.9" font-size="11" fill="var(--fg)" text-anchor="middle">[0.12, -0.80, 0.33, ...]</text>
<text x="20" y="232" font-size="12" fill="var(--fg-muted)" text-anchor="start">one embedding per chunk: similar meaning, nearby numbers</text>
</g>
</svg>
```

```narrate
Take one long document. [[doc]] Here is a refund policy as a single text. [[chunks]] Cut it into chunks of a few hundred tokens, because a whole document is too big to embed or to fit in a prompt. [[overlap]] Let neighbors overlap a little, so a sentence cut at the edge still appears whole in one chunk. [[vectors]] Each chunk then becomes a vector, a list of numbers where similar meaning means nearby numbers.
```

> **Why:** the right chunk size depends on your content and questions. Measure it. Do not guess.

## Retrieve: find the right chunks

Embed the question with the **same model**, then find the nearest chunk vectors.

Embeddings capture meaning but can **miss exact words**, such as an error code. So also run a keyword search (**BM25**) and merge both lists: **hybrid search**.

Then a **reranker** re-scores the shortlist more carefully. Anthropic's example: take about 150 candidates, rerank, and pass the top 20. Rerankers add some latency.

```svg Each stage narrows the list, and each stage costs time
<svg viewBox="0 0 640 264" role="img" aria-label="Retrieval funnel: many chunks narrowed by hybrid search and reranking to a few for the prompt" font-family="var(--font-mono)" font-size="13">
<g data-cue="all">
<rect x="40" y="14" width="560" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="38" font-size="13" fill="var(--fg)" text-anchor="middle">every chunk in the store</text>
</g>
<g data-cue="search">
<path d="M320 52 L320 76" fill="none" stroke="var(--fg-muted)" stroke-width="2"/>
<polygon points="320,76 315,66 325,66" fill="var(--fg-muted)"/>
<rect x="110" y="76" width="420" height="38" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="100" font-size="13" fill="var(--fg)" text-anchor="middle">hybrid search: about 150 candidates</text>
</g>
<g data-cue="rerank">
<path d="M320 114 L320 138" fill="none" stroke="var(--fg-muted)" stroke-width="2"/>
<polygon points="320,138 315,128 325,128" fill="var(--fg-muted)"/>
<rect x="180" y="138" width="280" height="38" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="162" font-size="13" fill="var(--fg)" text-anchor="middle">reranker: top 20</text>
</g>
<g data-cue="prompt">
<path d="M320 176 L320 200" fill="none" stroke="var(--fg-muted)" stroke-width="2"/>
<polygon points="320,200 315,190 325,190" fill="var(--fg-muted)"/>
<rect x="235" y="200" width="170" height="38" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="224" font-size="13" fill="var(--fg)" text-anchor="middle">into the prompt</text>
</g>
</svg>
```

```narrate
Retrieval is a funnel. [[all]] The store may hold a hundred thousand chunks. [[search]] Hybrid search, meaning vectors plus keywords, picks a shortlist of about one hundred fifty candidates. [[rerank]] A reranker reads each candidate against the question and keeps the best twenty. [[prompt]] Only those go into the prompt, because every extra chunk costs tokens and time.
```

> **Not this:** send the top 100 chunks to the model. Every chunk costs tokens and time, and noise can bury the answer.

```quiz
q: A user searches for the error code E4021, but the vector search returns general error pages. What helps most?
options:
  - A bigger model
  - Add keyword search (BM25) next to the vectors
  - Shorter chunks only
answer: 1
why: Embeddings capture meaning, not exact strings. Keyword search matches the exact code, and hybrid search merges both.
```

## Generate: answer only from the chunks

Build a prompt with rules, the retrieved chunks (each with its source), and the question.

- Answer **only** from the chunks
- Allow **"I don't know"**
- Ask for **citations**, so users can check
- Treat chunk text as **data, not orders**. A document can say "ignore your rules"

Anthropic notes these steps reduce hallucinations. They do not remove them.

```text
Answer using ONLY the context below.
If it does not contain the answer, say "I don't know".
Cite the source id for every claim.

<context>
[doc-7, p2] Refunds are accepted within 30 days of purchase...
</context>

Question: Can I return a gift?
```

```svg The app retrieves first, then asks the model with a grounded prompt
<svg viewBox="0 0 640 326" role="img" aria-label="Query path: retrieve chunks, build a grounded prompt, return the answer with sources" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 320" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">User</text>
<path d="M235.3 38 L235.3 320" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="175.3" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="235.3" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">App</text>
<path d="M404.7 38 L404.7 320" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="344.7" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="404.7" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Vector store</text>
<path d="M574 38 L574 320" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">LLM</text>
<g data-cue="ask">
<path d="M68 77.9 L233.3 77.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="233.3,77.9 223.3,82.9 223.3,72.9" fill="var(--fg)"/>
<text x="150.7" y="70.9" font-size="12" fill="var(--fg)" text-anchor="middle">question</text>
</g>
<g data-cue="search">
<path d="M237.3 113.9 L402.7 113.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="402.7,113.9 392.7,118.9 392.7,108.9" fill="var(--fg)"/>
<text x="320" y="106.9" font-size="12" fill="var(--fg)" text-anchor="middle">top chunks?</text>
</g>
<g data-cue="search">
<path d="M402.7 149.9 L237.3 149.9" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="237.3,149.9 247.3,144.9 247.3,154.9" fill="var(--fg)"/>
<text x="320" y="142.9" font-size="12" fill="var(--fg)" text-anchor="middle">chunks + sources</text>
</g>
<g data-cue="prompt">
<path d="M237.3 185.9 L572 185.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,185.9 562,190.9 562,180.9" fill="var(--fg)"/>
<text x="320" y="178.9" font-size="12" fill="var(--fg)" text-anchor="middle">chunks + question</text>
</g>
<g data-cue="answer">
<path d="M572 221.9 L237.3 221.9" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="237.3,221.9 247.3,216.9 247.3,226.9" fill="var(--fg)"/>
<text x="320" y="214.9" font-size="12" fill="var(--fg)" text-anchor="middle">answer + citations</text>
</g>
<g data-cue="answer">
<path d="M233.3 257.9 L68 257.9" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="68,257.9 78,252.9 78,262.9" fill="var(--ok)"/>
<text x="150.7" y="250.9" font-size="12" fill="var(--fg)" text-anchor="middle">answer + sources</text>
</g>
<g data-cue="rules">
<rect x="86.4" y="276.5" width="549.6" height="27" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="361.2" y="293.5" font-size="12" fill="var(--fg)" text-anchor="middle">Rules in the prompt: answer only from the chunks, else say I do not know.</text>
</g>
</svg>
```

```narrate
Follow one question. [[ask]] The user asks the app. [[search]] The app asks the vector store for the top chunks, and gets them back with their sources. [[prompt]] It builds a prompt from the chunks and the question, and sends it to the model. [[answer]] The model replies with an answer and citations, and the app returns both to the user. [[rules]] The prompt carries the rules: answer only from the chunks, and say I do not know otherwise.
```

> **Why:** a grounded prompt turns "what the model remembers" into "what our documents say", which a human can check.

> **Not this:** let the model fill gaps from its own knowledge. That is where confident, made-up answers come from.

## Evaluate: which part broke?

A wrong answer has two possible causes, so **check retrieval first**.

Build a **golden set**: a few hundred real questions, each with the right source chunk and a good answer.

- **Context recall**: did retrieval return the information the answer needs? Think recall at k
- **Faithfulness**: the share of the answer's claims that the retrieved context supports (0 to 1)

Run both after every change, to chunk size, model, or prompt. Then you know if you improved, or just changed.

```svg Walk the wrong answer through three questions
<svg viewBox="0 0 640 292" role="img" aria-label="Debugging a wrong answer: check retrieval first, then generation, then the data" font-family="var(--font-mono)" font-size="13">
<g data-cue="wrong">
<rect x="250" y="8" width="140" height="36" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="320" y="30.2" font-size="12" fill="var(--fg)" text-anchor="middle">Wrong answer</text>
<path d="M320 44 L320 70" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="320,70 315,60 325,60" fill="var(--fg)"/>
</g>
<g data-cue="first">
<rect x="220" y="70" width="200" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="89.2" font-size="12" fill="var(--fg)" text-anchor="middle">Was the right chunk</text>
<text x="320" y="105.2" font-size="12" fill="var(--fg)" text-anchor="middle">in the top k?</text>
</g>
<g data-cue="retrieval">
<path d="M220 93 L110 93 L110 214" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="110,214 105,204 115,204" fill="var(--danger)"/>
<text x="160" y="86" font-size="12" fill="var(--fg)" text-anchor="middle" font-weight="700">no</text>
<rect x="10" y="214" width="200" height="66" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="110" y="235.2" font-size="12" fill="var(--fg)" text-anchor="middle">RETRIEVAL problem</text>
<text x="110" y="251.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">chunking, hybrid, rerank,</text>
<text x="110" y="267.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">metadata</text>
</g>
<g data-cue="second">
<path d="M320 116 L320 136" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="320,136 315,126 325,126" fill="var(--fg)"/>
<text x="330" y="130" font-size="12" fill="var(--fg)" text-anchor="start" font-weight="700">yes</text>
<rect x="220" y="136" width="200" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="155.2" font-size="12" fill="var(--fg)" text-anchor="middle">Is the answer backed</text>
<text x="320" y="171.2" font-size="12" fill="var(--fg)" text-anchor="middle">by the chunks?</text>
</g>
<g data-cue="generation">
<path d="M320 182 L320 214" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="320,214 315,204 325,204" fill="var(--danger)"/>
<text x="330" y="202" font-size="12" fill="var(--fg)" text-anchor="start" font-weight="700">no</text>
<rect x="225" y="214" width="190" height="66" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="235.2" font-size="12" fill="var(--fg)" text-anchor="middle">GENERATION problem</text>
<text x="320" y="251.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">tighter prompt, cite,</text>
<text x="320" y="267.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">say I do not know</text>
</g>
<g data-cue="data">
<path d="M420 159 L530 159 L530 214" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="530,214 525,204 535,204" fill="var(--ok)"/>
<text x="470" y="152" font-size="12" fill="var(--fg)" text-anchor="middle" font-weight="700">yes</text>
<rect x="440" y="214" width="190" height="66" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="535" y="235.2" font-size="12" fill="var(--fg)" text-anchor="middle">DATA problem</text>
<text x="535" y="251.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">document missing,</text>
<text x="535" y="267.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">stale or wrong</text>
</g>
</svg>
```

```narrate
When an answer is wrong, walk it through this tree. [[wrong]] Start with the wrong answer. [[first]] Ask: was the right chunk in the top k? [[retrieval]] If not, retrieval is the problem. Look at chunking, hybrid search, reranking, and metadata. [[second]] If it was there, ask: is the answer backed by the chunks? [[generation]] If not, the model ignored them, so tighten the prompt and require citations. [[data]] If yes, the chunks themselves were wrong or stale, so fix the data.
```

> **Why:** one number for the whole chatbot cannot tell you what to fix. Two numbers, retrieval and faithfulness, can.

```quiz
q: The right paragraph was retrieved at rank 3, but the answer is still wrong. Where do you look next?
options:
  - The chunking
  - The prompt and the model's use of the chunks
  - The embedding model
answer: 1
why: Retrieval did its job, since the right chunk was in the top k. The fault is in generation.
```

## Cost and latency

Where does the time go? Embedding the question and the vector search are quick. A reranker adds latency. The model call is usually the biggest share. Cost grows with the **tokens in the prompt**.

```svg The model call dominates, so stream the answer
<svg viewBox="0 0 640 232" role="img" aria-label="Where the time goes in one question, not to scale: the model call is usually the biggest share" font-family="var(--font-mono)" font-size="13">
<g data-cue="embed">
<text x="10" y="33" font-size="12" fill="var(--fg)" text-anchor="start">embed the question</text>
<rect x="190" y="14" width="22" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="search">
<text x="10" y="69" font-size="12" fill="var(--fg)" text-anchor="start">vector search</text>
<rect x="212" y="50" width="27.5" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="rerank">
<text x="10" y="105" font-size="12" fill="var(--fg)" text-anchor="start">rerank (optional)</text>
<rect x="239.5" y="86" width="77" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="first">
<text x="10" y="141" font-size="12" fill="var(--fg)" text-anchor="start">LLM: first token</text>
<rect x="316.5" y="122" width="99" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
</g>
<g data-cue="stream">
<text x="10" y="177" font-size="12" fill="var(--fg)" text-anchor="start">LLM: stream the rest</text>
<rect x="415.5" y="158" width="220" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
</g>
<text x="10" y="214" font-size="12" fill="var(--fg-muted)" text-anchor="start">Illustration, not a measurement. Stream the answer so the wait feels short.</text>
</svg>
```

```narrate
Look at where one question spends its time. [[embed]] Embedding the question is fast. [[search]] So is the vector search. [[rerank]] A reranker is optional, and it adds noticeable time. [[first]] The model needs a moment before the first token. [[stream]] Then it writes the rest, which is the longest part. Stream those tokens to the user, so the wait feels short.
```

| Lever | Helps with | Trade-off |
|---|---|---|
| Fewer, shorter chunks in the prompt | Cost and time | May drop needed context |
| Prompt caching for repeated context | Cost (Anthropic: up to 90 percent) | Only helps repeated context |
| Cache answers to repeated questions | The whole call | Stale answers, needs a TTL |
| Smaller model for easy questions | Cost and time | Needs a router |
| Skip RAG for a tiny corpus | The whole pipeline | Does not scale |

## Say it in the interview

| Step | Say this |
|---|---|
| Clarify | "How many documents, how often do they change, who may see what, and how costly is a wrong answer?" |
| Ingest | "Chunk, embed, store with metadata. Re-ingest when a document changes." |
| Retrieve | "Hybrid search, then rerank, then the top k to the model." |
| Generate | "Answer only from sources, cite them, allow I don't know." |
| Evaluate | "Golden set. Recall for retrieval, faithfulness for answers." |
| Operate | "Watch cost and latency. Stream. Cache." |

Expect these follow-ups:

- **Stale data:** store `updated_at`, re-embed changed documents, delete removed ones
- **Permissions:** filter by the user's access **at retrieval**
- **Prompt injection:** chunks are data. Limit what the bot can do

```quiz
q: Some documents are only for managers. Where do you enforce that?
options:
  - In the prompt: "do not reveal manager documents"
  - At retrieval, so forbidden chunks never reach the model
  - After the answer is written
answer: 1
why: Anything the model sees can leak into its answer. Filter by access at retrieval, so the text never gets there.
```

> **Trap:** enforcing access in the prompt. A clever question can talk the model out of its instructions.

```narrate
Use the table as your script. Start by clarifying, how many documents, how often they change, who may see what. Then walk ingest, retrieve, generate, evaluate and operate, one sentence each. Be ready for three follow ups. Stale data means you store the update time and re embed changed documents. Permissions must be enforced at retrieval, so forbidden text never reaches the model. And treat every chunk as data, never as instructions.
```
