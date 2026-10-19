# 01 - Backend / Full-Stack SWE requirements (2026)

Method: 45 live postings pulled 2026-10-19 from public ATS APIs (Greenhouse, Lever, Ashby) at 19 companies, early/mid-level titles only (SWE I/II, "Software Engineer", Backend, Full Stack, New Grad). Counts are keyword hits in the posting text, so "SQL" undercounts (many postings say only "databases"). Plus 4 interview-process sources. Full posting URLs at the bottom.

Experience asked: 2 yrs (about 14 postings), 3 yrs (6), 4-5 yrs (8), 6+ (6), none stated (about 10; includes New Grad). Reality: "SWE II / mid" means 2-4 yrs.

## 1. Languages / tools (n=45)
| Item | Postings |
|---|---|
| Python | 25 |
| REST / HTTP APIs | 24 |
| React (full-stack roles) | 19 |
| Go | 16 |
| TypeScript | 16 |
| Java | 13 |
| JavaScript / Node.js | 12 |
| AWS | 12 |
| Kubernetes | 10 |
| GCP / Azure | 8 |
| Docker | 7 |
| GraphQL | 6 |
| Kafka / queues | 6 |
| Ruby / Rails | 5 |
| Rust | 5 |
| CI/CD | 5 |
| gRPC | 4 |
| Terraform | 4 |
| Git | 3 (assumed, rarely written) |

Takeaway: pick Python or TypeScript/Node (or Go/Java) deeply; know HTTP/REST, Docker, one cloud basics.

## 2. CS concepts
| Item | Postings |
|---|---|
| Scalability / performance / reliability | 42 |
| Microservices / distributed systems | 17 |
| Computer science degree / fundamentals | 22 |
| Data structures and algorithms (explicit) | 8 |
| Concurrency / async | 5 |
| OOP / design patterns | 5 |

DSA is rarely written in postings but is still tested in loops (section 8).

## 3. Databases / SQL
| Item | Postings |
|---|---|
| Any database mention | 19 |
| NoSQL (Mongo/Dynamo/Cassandra) | 11 |
| SQL / relational (explicit) | 10 |
| Redis / caching | 8 |
| PostgreSQL | 7 |
| MySQL | 3 |

Interview sources add: joins, indexes, transactions, normalization, EXPLAIN, window functions, ACID vs BASE, sharding, replication.

## 4. Auth / security
| Item | Postings |
|---|---|
| Security / privacy / compliance (general) | 29 |
| Auth (OAuth/JWT/SSO/authz) | 6 |

Interview sources add: JWT vs sessions, OAuth2, hashing, SQL injection, XSS, CSRF, TLS, rate limiting.

## 5. Testing
Testing / unit / integration: 26 of 45. Monzo pair exercise ships with pre-written unit tests.

## 6. System design / architecture
Mentioned in 30 of 45 (design, architecture, "designing systems"). Interview level for junior/mid: "small to medium scale" (URL shortener, rate limiter, chat, e-commerce backend, money transfer): load balancer, cache, queue, SQL vs NoSQL, monolith vs microservices. Deep design is weighted for senior.

## 7. Soft / process
| Item | Postings |
|---|---|
| Collaboration / communication / cross-functional | 42 |
| Ownership / end-to-end / autonomy | 39 |
| AI / LLM tooling mentioned (mostly AI-company roles; also "use AI tools") | 38 |
| Observability / on-call / incidents | 18 |
| Problem solving / debugging | 15 |
| Code review / agile | 12 |
| Mentoring | 10 |

## 8. Interview loop (sources)
Typical junior/mid loop (3-5 rounds, 3-6 weeks):
1. Recruiter screen, 15-30 min (motivation, pay).
2. Coding: take-home (about 2 h effort, about 1 week window) OR live pair/online-assessment, 45-60 min.
3. System design, about 60 min (junior: light, often a single scenario).
4. Behavioral, 45-60 min (conflict, ownership, failure, mentoring).
5. Hiring committee / team match.

| Source | Finding |
|---|---|
| Monzo | Call (1 h) -> take-home OR 45-60 min pair coding (own language: Go/Python/Java; practical, not LeetCode, not a speed test, tests included) -> system design (scalability, reliability, fault tolerance, trade-offs) -> behavioral (1 h, 2 interviewers). |
| N26 (candidate reports) | Recruiter -> Codility take-home (1 debugging easy + 2 medium algo, DP seen) -> 60 min live coding (medium) -> 60 min system design (money transfer) -> behavioral. Glassdoor difficulty 2.9/5. |
| Dataford aggregate (4,365 reports; search snippet only, page returned 429) | Median 3 rounds; topics: backend 55%, system design 42%, problem solving 31%. |
| dev.to "beyond LeetCode" | DSA "clears the initial bar"; then APIs (idempotency, pagination, caching, versioning), DB, small-scale system design, Docker/CI, security, behavioral. Practical tasks: REST API with auth, rate limiter middleware, Redis cache layer. |

LeetCode difficulty: no source gave a firm number. Evidence points to Easy-Medium (N26 "medium", Monzo "not LeetCode-style"). Prepare Easy fluently, Medium in under 30 min: arrays/strings, hash maps, two pointers, sliding window, BFS/DFS, intervals, heaps, basic DP.
Take-homes: common at fintech/EU (Monzo, N26), choice-based; evaluated on clean structure, README, tests, no extra features.

## Ranked prep curriculum (by evidence)
1. One language deeply (Python or TS/Node) + HTTP/REST API building, with tests.
2. Scalability basics: caching, queues, load balancing, DB indexes, replication, latency vs throughput.
3. SQL + relational design (joins, indexes, transactions, EXPLAIN); one NoSQL contrast.
4. DSA: Easy-Medium LeetCode.
5. Auth/security: JWT/sessions/OAuth2, OWASP top, hashing.
6. Testing: unit/integration, mocks.
7. Docker, one cloud (AWS), CI/CD, logging/monitoring.
8. Small-scale system design (3-4 canonical prompts).
9. Behavioral: ownership, conflict, production incident stories (STAR).

## Sources
Interview: https://monzo.com/blog/demystifying-the-backend-engineering-interview-process ; https://www.designgurus.io/answers/detail/what-is-the-n26-interview-process-like-round-by-round ; https://dataford.io/roles/backend-engineer ; https://dev.to/rakeshreddy512/backend-interview-prep-beyond-leetcode-for-3-years-experience-7gf ; https://www.upwork.com/hire/back-end-developers/interview-questions/

Postings analyzed (45):
1. anthropic - Full Stack Engineer, Education Labs - https://job-boards.greenhouse.io/anthropic/jobs/5097186008
2. asana - Backend Software Engineer - https://www.asana.com/jobs/apply/7964297?gh_jid=7964297
3. asana - Fullstack Engineer - https://www.asana.com/jobs/apply/8264089?gh_jid=8264089
4. brex - Software Engineer II, Backend - https://www.brex.com/careers/8815438002?gh_jid=8815438002
5. brex - Software Engineer II, Backend - https://www.brex.com/careers/8815512002?gh_jid=8815512002
6. databricks - Software Engineer - Backend - https://databricks.com/company/careers/open-positions/job?gh_jid=8012650002
7. databricks - Software Engineer - Backend - https://databricks.com/company/careers/open-positions/job?gh_jid=7737233002
8. figma - Software Engineer - Full Stack - https://boards.greenhouse.io/figma/jobs/5691911004?gh_jid=5691911004
9. gitlab - Backend Engineer, Create: Repository Management - https://job-boards.greenhouse.io/gitlab/jobs/8843512002
10. gitlab - Backend Engineer, Create: Source Code Experience (Ruby) - https://job-boards.greenhouse.io/gitlab/jobs/8687926002
11. pinterest - Software Engineer II, Full Stack - https://www.pinterestcareers.com/jobs/?gh_jid=5459622
12. robinhood - Full Stack Software Engineer, Credit Cards & Banking - https://boards.greenhouse.io/robinhood/jobs/8008723?t=gh_src=&gh_jid=8008723
13. robinhood - Software Engineer 1, Backend - https://boards.greenhouse.io/robinhood/jobs/7263578?t=gh_src=&gh_jid=7263578
14. stripe - Backend/API Engineer, Money as a Service - https://stripe.com/jobs/search?gh_jid=6176758
15. stripe - Backend/API Engineer, Money as a Service (Product) - https://stripe.com/jobs/search?gh_jid=7369543
16. airbnb - Software Engineer, Tech Foundations - https://careers.airbnb.com/positions/8154749?gh_jid=8154749
17. cloudflare - Software Engineer - https://boards.greenhouse.io/cloudflare/jobs/8212060?gh_jid=8212060
18. coinbase - Software Engineer - https://www.coinbase.com/careers/positions/8003605?gh_jid=8003605
19. coinbase - Software Engineer, CDP - Foundations - https://www.coinbase.com/careers/positions/8241522?gh_jid=8241522
20. discord - Software Engineer, Consumer Revenue - https://job-boards.greenhouse.io/discord/jobs/8846732002
21. discord - Software Engineer, Notifications - https://job-boards.greenhouse.io/discord/jobs/8642213002
22. instacart - Software Engineer II, CRM & SEO - https://instacart.careers/job/?gh_jid=8244914
23. lyft - Software Engineer - https://app.careerpuck.com/job-board/lyft/job/8896679002?gh_jid=8896679002
24. lyft - Software Engineer - https://app.careerpuck.com/job-board/lyft/job/8772571002?gh_jid=8772571002
25. mongodb - Software Engineer - https://www.mongodb.com/careers/job/?gh_jid=8065483
26. mongodb - Software Engineer 2 - https://www.mongodb.com/careers/job/?gh_jid=7613695
27. pinterest - Software Engineer II, EPD Ads - https://www.pinterestcareers.com/jobs/?gh_jid=8227344
28. samsara - Software Engineer II - https://www.samsara.com/company/careers/roles/8036387?gh_jid=8036387
29. scaleai - Software Engineer, ARC Team - https://job-boards.greenhouse.io/scaleai/jobs/4673771005
30. toast - Software Engineer II, Earnings - https://careers.toasttab.com/jobs?gh_jid=8147829
31. twilio - Software Engineer L3 - https://job-boards.greenhouse.io/twilio/jobs/8009057
32. wealthfront - Backend Engineer - https://jobs.lever.co/wealthfront/f5a0963a-ca1a-4140-b9e6-dbf6072093fe
33. notion - Software Engineer, Early Career - https://jobs.ashbyhq.com/notion/297b4ece-765f-4eea-b1b8-46057cb6501f
34. notion - Software Engineer, New Grad (Dec 2026) - https://jobs.ashbyhq.com/notion/e32799d2-8ef8-4803-8189-c72514afa816
35. ramp - Software Engineer, Developer API - https://jobs.ashbyhq.com/ramp/42527ca9-03b9-499e-a5c4-18e4245af138
36. ramp - Backend Engineer, Ops Engineering - https://jobs.ashbyhq.com/ramp/7bfa613e-151c-469b-9973-c89ee3d14838
37. ramp - Software Engineer, Backend, Growth - https://jobs.ashbyhq.com/ramp/428f41e2-48e8-409d-b5e3-8053f7fc7a27
38. ramp - Software Engineer, Onboarding - https://jobs.ashbyhq.com/ramp/f1b3ca8d-d55f-4159-9a3b-f69ad0d981bc
39. openai - Backend Software Engineer, Gov - https://jobs.ashbyhq.com/openai/a90cdb7c-1c33-4fca-9a96-26c236006f14
40. openai - Backend Engineer, Consumer Devices - https://jobs.ashbyhq.com/openai/8e301350-62fb-4251-bc34-c7036498f08c
41. openai - Backend Software Engineer, Applied Foundations - https://jobs.ashbyhq.com/openai/b398e1c6-0c32-4464-bb34-6ccda901b688
42. openai - Full-Stack Software Engineer, Applied Foundations - https://jobs.ashbyhq.com/openai/f873dd71-46c9-4be1-8580-bc67c56b4cad
43. openai - Full Stack Software Engineer, API Experience - https://jobs.ashbyhq.com/openai/66288824-8b77-4774-bc57-6825d3e6221e
44. palantir - Backend Software Engineer - Application Development - https://jobs.lever.co/palantir/10dfc8bc-99ad-4ca2-ab76-853cb90a92c2
45. palantir - Software Engineer, New Grad - https://jobs.lever.co/palantir/2458ba08-de79-4e8f-b553-060f9568727e
