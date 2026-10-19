# AI engineer postings - wider sample, junior focus (2026-10-19)

Supplements `03-ai-engineer-jobs.md`. Method: public JSON APIs scanned by script + keyword regex (not human reading), plus a few pages read in full. Counts are posting text mentions, approximate; regex noise is possible (marked ~).

## Sample size (all NEW vs. file 03)

| Source | Scanned | AI/LLM/ML-engineer postings kept | How |
|---|---|---|---|
| Greenhouse / Lever / Ashby public board APIs (~290 company boards) | 21,117 jobs | 962 unique (co+title); 17 entry-level, 42 asking <=2 yrs, 65 asking 3-4 yrs, 68 asking 5+, 80 no years, 336 senior/staff titles | boards-api.greenhouse.io, api.lever.co, api.ashbyhq.com |
| HN "Who is hiring" Aug/Sep/Oct 2026 (Algolia API) | 745 top-level comments | 118 | hn.algolia.com |
| Arbeitnow API (EU/DACH) | 1,500 | 81 | arbeitnow.com/api/job-board-api |
| RemoteOK + Remotive APIs | 100 + 12 | 4 | remoteok.com/api, remotive.com/api |
| Pages read in full (junior/automation) | 5 | 5 | see below |
| **Total** | ~23,500 | **~1,170 AI-ish; 40+ entry/junior-flavoured** | |

Caveat: ATS sample is biased to companies I guessed (OpenAI, Sierra, Anthropic, Decagon, Waymo, Pinterest over-represented); AI labs inflate "agents/evals". Sierra/Waymo/Lyft/Pinterest duplicates are by city.

## Entry-level / early-career postings (n=~26)

| Group | Examples (URL) |
|---|---|
| Big-tech/AI new-grad + intern (mostly ML/AI platform; CS degree, "graduating 2026-28") | Notion SWE Early Career (AI) https://jobs.ashbyhq.com/notion/85947779-6b87-466a-98bc-30a640448c28 ; Sierra SWE Agent New Grad 2027 https://jobs.ashbyhq.com/sierra/149f368c-52d5-408f-ba26-ad888f318a00 ; Sierra SWE Intern Agent https://jobs.ashbyhq.com/sierra/34b31b67-268c-4270-b48f-72e59064c96e ; Elastic SWE I AI Observability https://jobs.elastic.co/jobs?gh_jid=8260767 ; Nuro SWE AI Platform New Grad https://nuro.ai/careersitem?gh_jid=7351066 ; Pinterest Univ Grad MLE https://www.pinterestcareers.com/jobs/?gh_jid=8267930 ; Affirm ML SWE Intern https://job-boards.greenhouse.io/affirm/jobs/8008645003 ; Coinbase MLE Intern https://www.coinbase.com/careers/positions/8175441 ; Lyft SWE Intern ML https://app.careerpuck.com/job-board/lyft/job/8802332002 ; Waymo MLE intern/new grad (7 posts, MS/PhD) https://careers.withwaymo.com/jobs?gh_jid=8223735 ; Quora MLE New Grad https://jobs.lever.co/jobgether/29828a8c-ee48-475f-8cfd-34b389de5dda |
| Startups, LLM-app flavour | Eudia AI Engineer Intern (LLMs, RAG, MLflow) https://job-boards.greenhouse.io/eudia/jobs/4020078009 ; Cresta FDE Intern (AI Agent) https://job-boards.greenhouse.io/cresta/jobs/5106468008 ; Cresta MLE Intern https://job-boards.greenhouse.io/cresta/jobs/4123863008 |
| Junior, read in full | NamiTech Junior AI Engineer (agentic voice/chatbot, Vietnam, 0-2 yrs or strong projects) https://topdev.vn/viec-lam/junior-ai-engineer-agentic-voicebot-chatbot-namitech-2090927 ; Flowmetrica AI Automation Engineer (n8n/Make/OpenAI) https://djinni.co/jobs/824552-ai-automation-engineer/ ; n8n community AI Automation Developer https://community.n8n.io/t/n8n-ai-automation-developer-remote/299818 |
| Seen via search snippets only | TCS AI Engineer Entry Level (Python, API, RAG, prompting; BSc) https://cdo.business.rice.edu/jobs/tata-consultancy-services-tcs-ai-engineer-21/ ; Abalobi AI Engineer Entry (LLMs, RAG, prompting, Python, Git) https://www.pnet.co.za/jobs--AI-Engineer-Entry-LLMs-RAG-Prompt-Engineering-Python-Git-NLP-ML-AI-Testing-Midrand-Menlyn-Rosslyn-Home-Office-Rotation-Abalobi-Solutions--4259256-inline.html ; Junior AI Developer (pgvector, Docker, Ollama/vLLM) https://www.wearedevelopers.com/jobs/ext/6954873/junior-ai-developer ; YC Product Engineer (new grads ok) https://www.ycombinator.com/companies/y-combinator/jobs/cpEymTr-product-engineer-new-products |
| EU working-student / junior (Arbeitnow) | Tracium Working Student AI Eng & Document Intelligence https://www.arbeitnow.com/jobs/companies/tracium-gmbh/working-student-ai-engineering-document-intelligence-berlin-357203 ; EggAI AI Builder Working Student https://www.arbeitnow.com/jobs/companies/eggai/ai-builder-working-student-tubingen-189697 ; Almedia Junior Data Scientist https://www.arbeitnow.com/jobs/companies/almedia/junior-data-scientist-berlin-448340 |

Salary signal (secondary, unverified): new-grad applied AI ~$135-155K base (betonai.net/?p=1896); Scoutify says entry 0-2 yrs, portfolio can outweigh degree.

## Per-skill counts by seniority (ATS board postings; each column's n in header)

| Skill | Entry (17) | Asks <=2 yrs (42) | 3-4 yrs (65) | 5+ yrs (68) | Senior-titled (336) |
|---|---|---|---|---|---|
| LLM APIs / prompting | 10 (59%) | 29 (69%) | 52 (80%) | 61 (90%) | 235 (70%) |
| RAG / vector DB / embeddings | 10 (59%) | 11 (26%) | 24 (37%) | 29 (43%) | 146 (43%) |
| Agents / tool use / MCP | 10 (59%) | 24 (57%) | 51 (78%) | 58 (85%) | 233 (69%) |
| Evals | 10 (59%) | 23 (55%) | 44 (68%) | 48 (71%) | 218 (65%) |
| Fine-tuning | 2 | 13 (31%) | 19 (29%) | 7 (10%) | 103 (31%) |
| MLOps / serving / CI-CD | 8 (47%) | 11 (26%) | 9 (14%) | 6 (9%) | 98 (29%) |
| Python | 12 (71%) | 26 (62%) | 49 (75%) | 32 (47%) | 207 (62%) |
| TypeScript / JS / React | 5 (29%) | 5 (12%) | 28 (43%) | 35 (51%) | 72 (21%) |
| Cloud (AWS/GCP/Azure/K8s) | 2 | 6 (14%) | 19 (29%) | 7 (10%) | 113 (34%) |
| SQL / Postgres | 3 | 9 (21%) | 10 (15%) | 7 (10%) | 69 (21%) |
| Auth / security (strict: OAuth/SSO/JWT/RBAC) | 1 | 4 (10%) | 8 (12%) | 4 (6%) | 29 (9%) |
| Testing (unit/pytest) | 8 (47%) | 16 (38%) | 17 (26%) | 12 (18%) | 134 (40%) |
| Docker | 0 | 4 (10%) | 10 (15%) | 0 | 56 (17%) |
| PyTorch / TF / HF | 7 (41%) | 11 (26%) | 12 (18%) | 8 (12%) | 92 (27%) |
| Java / Go / C++ / Rust (~) | 5 | 14 | 21 | 7 | 110 |

Entry column is skewed to ML/platform new-grad programs (Waymo, Pinterest, Lyft) where "evals/LLM" mentions are generic company boilerplate; the rest of the table is the better signal for LLM-app roles.

### Other sources (smaller, short text, so lower counts)

| Skill | HN Aug-Oct 2026 (n=118) | Arbeitnow EU (n=81) |
|---|---|---|
| LLM APIs / prompting | 55 | 47 |
| Agents / tool use / MCP | 75 | 35 |
| RAG / vector / embeddings | 20 | 30 |
| Evals | 24 | 30 |
| Python | 39 | 35 |
| TypeScript / JS / React | 40 | 13 |
| Cloud | 31 | 27 |
| SQL / Postgres | 31 | 12 |
| MLOps / deploy | 36 | 48 |
| Testing | 4 | 13 |
| Auth (strict) | 2 | 2 |
| Fine-tuning | 5 | 8 |

HN posts are 3-10 lines, so absence means little; HN skews TypeScript/full-stack and agents; EU skews RAG, MLOps, Python.

## How entry-level differs

| Aspect | Entry / <=2 yrs | 5+ yrs |
|---|---|---|
| Asked | CS degree or "strong projects"; Python + one LLM API + basic RAG/embeddings; REST, JSON, Git; "willingness to learn production" | production ownership, agents at scale, evals infra, system design, leading |
| Tasks | "with guidance": implement RAG pipeline (chunk, embed, retrieve, rerank), tool integrations, structured outputs, logging, eval datasets, bug fixes | design agent platforms, cost/latency, safety |
| Rare at entry | cloud (14%), Docker (10%), auth (10%), K8s | cloud/infra, TypeScript/React (51%) |
| More common at entry | testing, Python fundamentals, PyTorch/HF basics, MLOps (MLflow) in intern/ML posts | LLM API + agents + evals near-universal |
| Frameworks | named only as "nice to have" (LangChain, LangGraph, CrewAI, AutoGen; Streamlit/Gradio demo UI) | LangGraph / MCP named as requirements |
| "AI automation" roles | n8n/Make/Zapier + OpenAI function calling + webhooks, OAuth, JSON; Python/JS optional; RAG/vector DB nice-to-have | n/a |
| Hiring signal | project portfolio, Loom demo, GitHub RAG project beats years | |

## Frameworks / tools named

| Tool | Entry+<=4 yrs (n=124) | All core+senior (n=~660) | Notes |
|---|---|---|---|
| MCP | 21 | 78 | fastest-rising; mostly AI-native firms |
| OpenAI / GPT | 18 | 126 | |
| Claude / Anthropic | 23 | 94 | high partly from Anthropic-adjacent boards |
| LangChain | 8 | 58 | still #1 framework by name |
| LangGraph | 9 | 39 | rising vs LangChain |
| LlamaIndex | 4 | 18 | |
| LangSmith / Langfuse | 2 | 15 | observability |
| DSPy | 0 | 8 | seniors only |
| CrewAI / AutoGen | 1 / 1 | 6 / 6 | |
| Semantic Kernel | 0 | 5 | .NET shops |
| Gemini / Vertex | 8 | 35 | |
| Bedrock | 2 | 17 | |
| Vector DBs: Pinecone, pgvector, FAISS, Weaviate/Qdrant/Chroma/Milvus, Elasticsearch/OpenSearch | 3 / 2 / 0 / 3 / 1 | 7 / 6 / 5 / 7 / 18 | pgvector + Elasticsearch most practical; vector DB names are sparse vs "RAG" |
| n8n / Make / Zapier | automation roles only (3 of 3 read) | | |

## Source scorecard

| Source | Result |
|---|---|
| Greenhouse/Lever/Ashby board APIs | WORKED, best source (full text, 21k jobs). Some slugs 404 (~10%) |
| HN Who is hiring (Algolia) | WORKED (needs `search` with `tags=comment,story_ID`; 1000 hit cap per query) |
| Arbeitnow API | WORKED (EU, noisy) |
| RemoteOK API | WORKED but only 100 jobs, almost no AI engineer roles |
| Remotive API | PARTIAL: ignores search/category params, returns 12 jobs |
| We Work Remotely RSS | returned XML (189 KB) but general programming; not analysed |
| Built In, Dice | 200 OK but JS-rendered shell, no usable job text |
| Indeed, Glassdoor, Wellfound | BLOCKED (403/captcha) |
| Y Combinator Work at a Startup | BLOCKED (empty response); only YC's own jobs seen via search |
| The Muse API | FAILED (error page / key needed) |
| ai-jobs.net (aijobs.net) | BLOCKED 403 |
| Hugging Face jobs API | FAILED (auth error) |
| Levels.fyi, Welcome to the Jungle, Adzuna | not reached (need login/API key) |
| Web search snippets | useful for junior listings (TopDev/Saramin, Djinni, TCS, pnet); some pages expired (Djinni closed, work.ua captcha, WeAreDevelopers Cloudflare) |

## Delta vs file 03 (what to change in the curriculum)

1. Junior bar is lower than 03 suggested: Python + LLM API (chat + structured output) + basic RAG/embeddings + REST/JSON/Git + tests. Frameworks, cloud, Docker, auth are "nice".
2. Agents/tool use and evals stay top (55-70% at <=2 yrs); evals remain a differentiator even for juniors ("evaluation datasets", "eval loops").
3. RAG is lower at <=2 yrs (26%) than 03's 7/12; agents/tool-calling beats RAG as the entry skill, but junior-specific postings (NamiTech, TCS, Abalobi, Eudia) all name RAG - treat it as the must-do portfolio project.
4. TypeScript matters more as seniority rises (12% -> 51%) and in HN/startup posts; Python is the junior default.
5. Add an "AI automation" micro-track: webhooks, OAuth, REST, n8n, OpenAI function calling.
6. Auth is rare (<10%) - confirmed; learn JWT/OAuth basics only.
7. Learn framework-neutral: LangGraph + MCP are the names worth recognising; LangChain still the most-named.
