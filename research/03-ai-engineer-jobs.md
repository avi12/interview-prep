# AI Engineer (LLM application engineer) - 2026 requirements research

Method: 13 postings fetched and read in full (tallied below, n=13) + 5 more seen only via search-result excerpts (counted for MCP only). Many other fetches returned just a title or index page and were dropped. Small sample, employer claims, mostly mid/senior; treat counts as approximate. Researched 2026-10-19.

## Postings read (n=13, full text)

| # | Role | Level asked | URL |
|---|------|-------------|-----|
| 1 | Accenture Federal - GenAI Applications Eng (Agents & RAG) | n/s | https://job-boards.greenhouse.io/accenturefederalservices/jobs/4722621006 |
| 2 | Future - Applied AI Engineer | "large prod systems" | https://job-boards.greenhouse.io/future/jobs/4683133005 |
| 3 | CoreStory - AI Engineer | 7+ yrs | https://job-boards.greenhouse.io/corestory/jobs/4984207007 |
| 4 | BLEN - AI Engineer | 5+ yrs | https://jobs.lever.co/blencorp/4b2e3689-9720-4785-b0fe-d09bd5325f74 |
| 5 | AppZen - AI/ML Engineer | **1-3 yrs** | https://jobs.lever.co/appzen/cce93662-196a-4814-b80c-bfa0b37384af |
| 6 | Netomi - Staff Agentic AI Eng | 5-7+ yrs | https://jobs.lever.co/netomi/3fe31ab4-1e79-4b1c-8493-dfec68e69ba7 |
| 7 | Brevo - Sr AI Engineer (Forward-Deployed) | tech lead | https://jobs.lever.co/brevo/43c7cd04-30eb-4a0d-9fc2-666800069dbb |
| 8 | Cloudflare - Software Eng, AI Agents | 5-10 yrs | https://job-boards.greenhouse.io/cloudflare/jobs/8259402 |
| 9 | WITHIN - AI Engineer | n/s | https://job-boards.greenhouse.io/agencywithin/jobs/5056863007 |
| 10 | Rocket Money - Staff Applied AI Eng | staff | https://job-boards.greenhouse.io/truebill/jobs/8004786003 |
| 11 | Lynx Analytics - AI Engineer (India) | **2-4 yrs** | https://job-boards.greenhouse.io/lynxanalytics/jobs/8647303002 |
| 12 | HeyGen - Applied AI Eng, Video Agent | **2+ yrs** | https://job-boards.greenhouse.io/heygen/jobs/5255664007 |
| 13 | Future/others via search digests (Auctor, Tessera, LangChain, TLDR, Traba, Datadog, data.org, JPMorgan, Precept Labs, Starfish) | title/excerpt only | https://jobs.ashbyhq.com/auctor/ca5b0c44-cafb-48ad-99fa-84aa3cfc5179 , https://data.org/jobs/ai-engineer/ , https://builtin.com/jobs/remote/dev-engineering/search/artificial-intelligence-engineer |

(Row 13 is context only; not in the tallies except MCP.) Entry-level-ish seen via search only: Binance Junior SWE (AI&LLM) https://jobs.lever.co/binance/88fe7933-859b-47e7-a1a0-29c5e14de573 ; Asurion AI Engineer (Entry-Level); aggregator https://agentic-engineering-jobs.com/jobs/junior

## Ranked requirements (count of 12 readable postings; 13 where noted)

### 1. LLM APIs / prompting
| Skill | ~Postings |
|---|---|
| Calling LLM APIs (OpenAI/Anthropic/Gemini/Bedrock), prompt design | 11/12 |
| Tool/function calling + structured output (Pydantic/JSON Schema) | 9/12 |
| Streaming, SSE, async | 2/12 (Future, Cloudflare) |
| Cost/latency/token budgets, caching, retries | 4/12 (+ heavy in interview sources) |

### 2. RAG / embeddings / vector DBs
| Skill | ~Postings |
|---|---|
| RAG pipeline (chunking, retrieval, rerank) | 7/12 |
| Vector DB named (pgvector, Pinecone, Qdrant, Weaviate, FAISS, Milvus, Chroma) | 6/12; pgvector most named |
| Embeddings / semantic search | 7/12 |
| Retrieval metrics (NDCG, recall@k) | 1-2/12 (Accenture) |

Note: RAG is NOT universal; agent roles (Future, Cloudflare, HeyGen, Rocket Money, Brevo) skip it. Still the #1 interview topic.

### 3. Agents / tool use / MCP
| Skill | ~Postings |
|---|---|
| Agents with tool use, multi-step orchestration | 12/12 |
| Agent frameworks (LangChain/LangGraph/LlamaIndex/Agent SDK) | 4/12 |
| MCP (build servers/clients) | 2/12 read (BLEN, Cloudflare); ~6/17 incl. excerpts (data.org, Datadog, Starfish) - rising, AI-native firms |
| Guardrails, human approval, bounded loops | 3/12 |

### 4. Evals / observability
| Skill | ~Postings |
|---|---|
| Building evals (golden sets, LLM-as-judge, regression suites) | 12/12 |
| Observability / tracing / monitoring (Langfuse, LangSmith, OpenTelemetry, Arize, Datadog) | 10/12 |
| A/B experiments, quality gates in CI | 3/12 |

### 5. Backend foundations
| Skill | ~Postings |
|---|---|
| Python (FastAPI, async, Pydantic) | 9/12 (TS-only roles: Cloudflare, Rocket Money) |
| Cloud (AWS most; Bedrock; GCP/Azure) | 8/12 |
| Testing (unit/regression/CI) | 7/12 |
| TypeScript / React | 5/12 |
| REST/HTTP API design | 4/12 explicit |
| Docker / K8s / CI-CD | 4/12 (usually "nice") |
| SQL / Postgres | 3/12 explicit |
| Auth/security | ~0-2/12 (Cognito, trust scoping; regulated roles want Zero Trust) |
| Experience asked | junior-ish 1-4 yrs: 3/12; 5+ yrs: 6/12 |

### 6. Interview loop (sources below)
- Shape: recruiter screen -> technical screen -> take-home or live build -> system design -> hiring manager/behavioral; 3-5 rounds, 2-6 weeks.
- Coding: LeetCode-style is common but shrinking; AI-roles add practical tasks (build a RAG answer endpoint in ~40 min, cosine similarity in NumPy, debug a looping agent, validate/retry malformed structured output). Some loops allow AI assistants; signal = how you direct and verify.
- System design (60 min): RAG over N docs, support agent, doc-extraction pipeline, agent with human approval. Graded on trade-offs: chunking (200-800 tokens, 10-20% overlap), BM25 vs dense vs hybrid, reranking, stale data, hallucination control, timeouts, cost, latency.
- LLM design judgment: prompt vs RAG vs fine-tune (fine-tune last); why big context does not replace retrieval.
- Evals round: golden set (100-500 triples), recall@k/MRR, faithfulness, LLM-as-judge, logging of prompt/latency/tokens/cost.
- Take-home: 2-3h typical (up to days), build small RAG or agent, then a walkthrough; code quality and evals count. Junior/mid: under 2h suggested.
- Behavioral: ambiguity, weak demos, stakeholder expectations.

## Study priority (derived)
1. Tool-calling agent loop + structured output + guardrails (12/12)
2. Evals: golden set, LLM-as-judge, regression, tracing (12/12)
3. LLM API fluency, prompting, cost/latency (11/12)
4. RAG + pgvector + hybrid search + chunking + retrieval metrics (7/12, top interview topic)
5. Python FastAPI/async/Pydantic + tests + Docker + one cloud (AWS)
6. SQL/Postgres basics, REST design, TypeScript basics
7. MCP server basics (rising)
8. Auth: low frequency in postings; learn JWT/OAuth basics only for general backend screens.

## Interview-process sources
- Field guide (aggregates ~80 processes from 1,765 JDs; anecdotal): https://github.com/alexeygrigorev/ai-engineering-field-guide/blob/main/interview/01-interview-process.md
- KORE1 (staffing firm; 4-hour onsite block structure): https://www.kore1.com/ai-engineer-interview-questions-2026/
- Medium, "100+ real interviews" (via search excerpt only; fetch blocked): https://adilshamim8.medium.com/every-ai-engineer-interview-question-you-need-to-know-in-2026-from-100-real-interviews-b5b7ae4b961a
- Also seen: https://techscreen.app/articles/ai-engineer-llm-interview-questions-2026 , https://www.calibrd.com/interview-prep/ai-engineer

## Caveats
- Hot-linked ATS pages often return only titles; counts rest on 12 readable postings.
- Sample skews senior; junior roles (AppZen, Lynx, HeyGen, Binance) show the same stack, with fewer infra items.
