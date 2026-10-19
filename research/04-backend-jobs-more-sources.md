# 04 - Junior / entry-level backend and full-stack roles, non-ATS sources (2026-10-19)

Sample: 45 junior/associate/entry/SWE I/new-grad backend or full-stack postings. Sources: Dice (24), Built In (13), SmartRecruiters API (4), Arbeitnow (1), HN "Who is hiring" (2), plus 1 more Built In. Mostly staffing/consulting firms, banks, defense, and mid-size non-FAANG. Not the same companies as file 01.
Method caveat: Dice/Built In page text was reduced to a skill checklist by WebFetch's summarizer model (can miss or over-report an item); SmartRecruiters/HN counted by regex. Treat counts as +/- 10%. "Cloud/Docker" lines are exact words in the posting, not inferred.

## Experience asked (19 of 45 state a number)
| Stated | Postings |
|---|---|
| 0-2 yrs (0-1, 0-2, 0-3, 0-5) | 11 |
| 1-3 yrs / 1+ | 4 |
| 2+ / 2-5 | 2 |
| 3+ or 4+ | 3 |
| 12-15 (title says "Jr Architect", mislabeled) | 1 |
| Not stated (entry level / 2027 grad class) | 26 |

"Junior" in staffing-firm titles is often 2-5 yrs. Big-company "Entry Level / 2027 Start" (IBM, TikTok, Boeing) state no number.

## 1. Languages / stack (n=45)
| Item | Postings | % |
|---|---|---|
| REST / HTTP APIs | 32 | 71 |
| Python | 25 | 56 |
| Java | 24 | 53 |
| React / frontend | 24 | 53 |
| JavaScript / TypeScript / Node | 22 | 49 |
| C# / .NET | 11 | 24 |
| C++ | 7 | 16 |
| Go | 5 | 11 |
| Kafka / queues | 5 | 11 |
| Ruby | 2 | 4 |
| GraphQL | 1 | 2 |

## 2. SQL / databases
| Item | Postings | % |
|---|---|---|
| SQL / relational (incl. Postgres/MySQL) | 26 | 58 |
| NoSQL | 6 | 13 |

## 3. Auth / security
Auth or security named: 24 (53%). Usually a bullet ("secure coding", "authentication"), rarely OAuth/JWT specifics.

## 4. Testing
Testing / unit tests / QA: 35 (78%). Highest-frequency technical item after REST.

## 5. System design / architecture
| Item | Postings | % |
|---|---|---|
| System design / architecture (any wording) | 17 | 38 |
| Microservices / distributed | 11 | 24 |
| Data structures and algorithms (explicit) | 8 | 18 |
| CS degree | 28 | 62 |

## 6. Cloud / DevOps
| Item | Postings | % |
|---|---|---|
| Any cloud (AWS/Azure/GCP/"cloud") | 21 | 47 |
| Azure | 12 | 27 |
| AWS | 11 | 24 |
| GCP | 7 | 16 |
| Docker / containers | 15 | 33 |
| Kubernetes | 12 | 27 |
| CI/CD | 22 | 49 |
| Git | 20 | 44 |
| Linux | 8 | 18 |
| Observability / on-call | 6 | 13 |

## 7. Soft / process
| Item | Postings | % |
|---|---|---|
| Communication / teamwork | 41 | 91 |
| Learning / growth mindset / curiosity | 31 | 69 |
| AI tools / ML mentioned | 24 | 53 |
| Agile / Scrum | 16 | 36 |

## How entry-level differs from file 01 (n=45, mid/senior at big tech)
| Dimension | 01 (mid/senior) | 04 (junior) |
|---|---|---|
| Top language | Python 25, Go 16, TS 16 | Python 25, Java 24, JS/TS 22, C#/.NET 11; Go only 5 |
| Frontend | React 19 of 45 (full-stack titles) | React/frontend 24: "junior backend" is often full-stack |
| SQL explicit | 10 (22%) | 26 (58%): juniors are told SQL by name |
| Testing | 26 (58%) | 35 (78%) |
| System design | 30 (67%) | 17 (38%): lighter, no "design large systems" |
| Kubernetes | 10 (22%) | 12 (27%); Docker 7 (16%) vs 15 (33%): more basic container asks |
| CI/CD, Git | 5 / 3 | 22 / 20: written out more for juniors |
| Learning mindset | not tracked | 69% |
| Security | 29 (64%) general | 24 (53%) |
| Mentoring (as a duty) | 10 | rare; juniors are the mentees |
| Ownership / autonomy | 39 | not counted; replaced by "learn, grow, collaborate" |

Takeaways: (1) Java and C#/.NET matter far more in the junior market outside big tech (banks, consulting, government). (2) SQL, REST, Git, tests, CI/CD are the baseline; system design is "know the vocabulary", not a gate. (3) Expect to be full-stack-adjacent: basic React/JS appears in half. (4) Staffing-firm "junior" often needs 2-5 yrs; new-grad programs (IBM, TikTok 2027, Boeing, Texas Instruments, Pariveda) state none. (5) Graduate hiring screens emphasize DSA, OOP, and CS degree (TikTok, Boeing, IBM).

## Sources: what worked and what failed
| Source | Result |
|---|---|
| Dice (WebFetch of search pages + job-detail pages) | Worked. 24 postings read in full. Best source for staffing/entry roles. |
| Built In (listing + job pages) | Worked. 14 postings read. Listings label everything "Entry level" even when titled Lead/Senior, so filter by title. |
| SmartRecruiters public API (api.smartrecruiters.com/v1/companies/{id}/postings) | Worked, no key. Experian, NielsenIQ, Endava, Bosch, Wise returned data; the `q` filter is loose so filter titles locally. Few junior backend hits (4 used). |
| HN Algolia API (Oct and Aug 2026 threads, 772 comments) | Worked. Only ~5 explicit junior/early-career backend posts (SerpApi, Torq, Mechanize, Qualcomm, Column); 2 used. HN skews senior. |
| Arbeitnow API | Worked, 300+ jobs, mostly German non-dev. 1 junior software role used (Prima, London). Others were Werkstudent or non-backend. |
| Himalayas API (cursor pagination) | Worked, 1,200 jobs with a `seniority` field, but 0 entry-level engineering titles. |
| Remotive, RemoteOK, WWR RSS, Jobicy, Working Nomads, The Muse | Reachable (no block) but 0 junior backend titles in the first pages; Remotive ignores search param; The Muse category/level filter returned Walmart retail. Not used. |
| ZipRecruiter | 403 on fetch; search snippets only (salary ranges $67k-$160k for junior backend). |
| Indeed | Search snippets only (typical ask 0-2 yrs, Java/C#/TS, SQL, REST, Docker/AWS as bonus). Not fetched. |
| Glassdoor, Wellfound, Welcome to the Jungle, startup.jobs, Levels.fyi, Adzuna | Not reached (login walls / API key needed); no data. |

## Postings used (45). Detail pages
Dice: IBM Tucson https://www.dice.com/job-detail/8d3a8b01-1ce6-463a-a25d-c5537171c9be ; TikTok Backend Grad https://www.dice.com/job-detail/86a538db-bafc-488b-92ec-c0034c6afd3b ; Pioneer Java Backend https://www.dice.com/job-detail/13bb8c2d-8f8f-4368-b96f-1b3db7df3179 ; SMBC Associate FS https://www.dice.com/job-detail/2d94c5b9-5e9c-488f-9ec1-80364dc60e90 ; Pioneer Java FS https://www.dice.com/job-detail/f792918a-7a72-401d-8141-d77039062fdc ; Kforce Junior Program Dev https://www.dice.com/job-detail/96019c33-c0fd-47cb-b751-5423c9b2e373 ; eSolutionsFirst https://www.dice.com/job-detail/149ee285-522a-4a06-93d0-f190e37c99a2 ; Jobot https://www.dice.com/job-detail/3c95ab7c-53ae-4e97-9752-4b0f8d202dd3 ; Brooksource https://www.dice.com/job-detail/097d119c-b5ac-4145-b658-4c5244505c61 ; Apex https://www.dice.com/job-detail/b7ba9c76-872c-4941-a414-974df8b5ddd2 ; Innominds https://www.dice.com/job-detail/bf8c2ff2-ac97-4e06-9ba1-e6de9f93b828 ; OnwardPath https://www.dice.com/job-detail/5fae4744-d1fd-43f7-abf7-d1e574cec391 ; Xoriant https://www.dice.com/job-detail/1d0abfe9-ae1d-4fbe-89be-a85afdc50844 ; AgreeYa https://www.dice.com/job-detail/45176310-3c0f-4f17-8ddb-eb423d3ddf22 ; NET2ASPIRE https://www.dice.com/job-detail/adb960e4-7bc4-4f2e-a43e-a02bb06ba4ed ; ASSYST https://www.dice.com/job-detail/3ae509ed-cc59-4068-9b0b-ee86629bd026 ; AspireIT https://www.dice.com/job-detail/35aafef0-32ae-4067-a75e-a7dbe979ca35 ; Millennial https://www.dice.com/job-detail/40a71af2-4aa9-4348-bb41-d20f92c25868 ; Deloitte https://www.dice.com/job-detail/69fa9b55-075e-4e57-878f-38b2a5f9d2c1 ; Photon https://www.dice.com/job-detail/77651e4a-9a8d-43ba-a19f-95c3d7d4d329 ; Stellent https://www.dice.com/job-detail/844f83fa-2fa9-416a-bc9d-82c6cfa7c18e ; ICE https://www.dice.com/job-detail/affd8841-fc9f-44e9-9ee3-dc63c78e0628 ; General Dynamics https://www.dice.com/job-detail/bcc28fcc-af46-4981-aefe-412412034916 ; IBM Assoc FS 2027 https://www.dice.com/job-detail/5e5d21ea-7719-4e21-a6f7-9df2cf0a14f0 ; InterImage https://www.dice.com/job-detail/a65c9b53-0c33-4d9e-b211-4c37f8200715

Built In: Nanox https://builtin.com/job/junior-software-developer/11003707 ; Sigma https://builtin.com/job/junior-full-stack-engineer-python-focused/9308654 ; Virtual Technologies Django https://builtin.com/job/django-python-developer-full-stack/11729047 ; Blue Yonder https://builtin.com/job/software-engineer-java-backend/11618402 ; Pariveda https://builtin.com/job/entry-level-software-engineer/10514646 ; Applied Systems https://builtin.com/job/associate-software-engineer-software-engineer/10076079 ; Varsity Brands https://builtin.com/job/software-engineer-early-career/10397279 ; Caris https://builtin.com/job/associate-software-engineer/10842506 ; Akuna https://builtin.com/job/software-engineer-entry-level-python/10157756 ; Citi https://builtin.com/job/python-developer/11728145 ; Nokia https://builtin.com/job/jr-software-developer/11188265 ; Boeing https://builtin.com/job/entry-level-software-engineer-developer/11670850 ; Supabase https://builtin.com/job/sdk-engineer-python/11724511

SmartRecruiters: https://jobs.smartrecruiters.com/Experian/744000152622249-junior-software-engineer ; https://jobs.smartrecruiters.com/Experian/744000143855289-software-engineer-i-fullstack-contract ; https://jobs.smartrecruiters.com/Experian/744000141870709-software-engineer-i-12-months-contract- ; https://jobs.smartrecruiters.com/NielsenIQ/744000155500229-junior-software-engineer-1-year-experience-java-

Other: Prima (Arbeitnow) https://www.arbeitnow.co.uk/jobs/companies/prima/junior-software-engineer-london-36279 ; SerpApi (HN) https://news.ycombinator.com/item?id=49929200 ; Torq (HN) https://news.ycombinator.com/item?id=49245007

Aggregator pages searched: https://www.dice.com/jobs/q-junior+backend+developer-jobs ; https://builtin.com/jobs/dev-engineering/search/junior-software-engineer ; https://www.ziprecruiter.com/Jobs/Entry-Level-Back-End-Developer ; https://www.indeed.com/q-backend-developer-entry-jobs.html
