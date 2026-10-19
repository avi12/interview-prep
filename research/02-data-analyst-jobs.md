# Data Analyst roles (2026): what employers ask for and what interviews test

Collected 2026-10-19.

## Method and caveats
- **Primary sample (n=25 postings):** pulled live from public Greenhouse boards (boards-api.greenhouse.io, `?content=true`). Companies: Stripe, Lyft, Reddit, GitLab, Okta, MongoDB, Brex, Cloudflare, Fivetran, Roblox, Riot Games. I matched titles like "Data/Business/Product/Insights Analyst". I excluded interns, finance-systems and compliance roles, and deduplicated. Counts come from keyword regexes over the full text, not manual reading, so treat them as approximate.
- **Bias:** this sample skews mid/senior. Most postings ask for 3-10+ years and few are true entry level. Treat the counts as "what the bar looks like", then trim for junior/mid.
- **Individually read postings (extra, not counted):** True Anomaly, BEES, Trust & Will (Greenhouse); Artefact (Pune), ABOUT YOU, MLabs, Peek, CelebriOS, Virta and others (via search summaries); a UK board listing of 14 roles (itjobboard.co.uk).
- **Aggregate sources used to cross-check:** Huntr (65,263 postings), Careery (no method given), Interview Pilot and Careery interview guides.

## Source URLs
Greenhouse postings (sample):
- Stripe: https://stripe.com/jobs/search?gh_jid=5416444 (also 8230296, 8189909, 8044924, 7921649)
- Lyft: https://app.careerpuck.com/job-board/lyft/job/8896685002 (also 8860284002, 8555335002)
- Reddit: https://job-boards.greenhouse.io/reddit/jobs/8023563
- GitLab: https://job-boards.greenhouse.io/gitlab/jobs/8827370002
- Okta: https://www.okta.com/company/careers/opportunity/7731263 (also 7780488, 7728553)
- MongoDB: https://www.mongodb.com/careers/job/?gh_jid=7696633 (also 8224590, 8141572)
- Brex: https://www.brex.com/careers/8463702002
- Cloudflare: https://boards.greenhouse.io/cloudflare/jobs/8109620
- Fivetran: https://www.fivetran.com/careers/job?gh_jid=7918612003 (also 8017414003)
- Roblox: https://careers.roblox.com/jobs/7856888
- Riot Games: https://www.riotgames.com/en/work-with-us/job/8148781 (also 7592030, 8279959, 7940524)
- True Anomaly: https://job-boards.greenhouse.io/trueanomalyinc/jobs/5265224007
- BEES: https://job-boards.greenhouse.io/bees/jobs/8675759002
- Trust & Will: https://job-boards.greenhouse.io/trustwill/jobs/4379579009

Aggregates and interview guides:
- Huntr skill stats: https://api.huntr.co/resume-skills/data-analyst
- Careery skills: https://careery.pro/blog/data-analyst-careers/data-analyst-skills
- Careery interview guide: https://careery.pro/blog/data-analyst-careers/data-analyst-interview-questions
- Interview Pilot guide: https://www.interviewpilot.app/interview-guides/data-analyst
- UK listings: https://www.itjobboard.co.uk/job/16892214/data-analyst/
- Search-surfaced junior/mid postings: https://www.wearedevelopers.com/en/jobs/ext/5224461/data-analyst (ABOUT YOU, MLabs); https://jobs.ashbyhq.com/peek/cc80104d-5aef-45cc-829e-e619f9a5704e; https://jobs.ashbyhq.com/careerswift.ai/8887e73c-cf6f-4362-b0f9-327ba70878bf; https://jobs.ashbyhq.com/virtahealth/0195b18e-628b-4695-ba85-3abdaaa637a8

## Ranked requirements across the n=25 sample

### Overall top 12
| Rank | Skill | Postings | Share |
|---|---|---|---|
| 1 | SQL | 23 | 92% |
| 2 | Stakeholder work | 22 | 88% |
| 3 | Python | 19 | 76% |
| 3 | Dashboards | 19 | 76% |
| 5 | Communication (explicit) | 18 | 72% |
| 6 | KPIs/metrics | 17 | 68% |
| 7 | Data modeling (star schema, grain, metric definitions) | 16 | 64% |
| 8 | Presenting/storytelling | 15 | 60% |
| 8 | Any named BI tool | 15 | 60% |
| 10 | ETL/pipelines | 14 | 56% |
| 11 | Excel/Sheets | 11 | 44% |
| 11 | Statistics (word appears) | 11 | 44% |

The "AI/LLM" term also hit 76%, but much of that is boilerplate. Newer postings do ask for "analytics-relevant AI tooling" (Cloudflare, Okta), so expect to be asked how you use AI in your workflow.

### SQL
| Feature | Postings | Share | Notes |
|---|---|---|---|
| SQL (any) | 23 | 92% | Matches Huntr: 71% of all postings, required in 61% (https://api.huntr.co/resume-skills/data-analyst). Careery says 92%. |
| Joins (explicit) | 12 | 48% | "Complex multi-table joins" (GitLab) |
| Query optimization / large data | 11 | 44% | Common on mid/senior roles |
| CTEs | 4 | 16% | Brex, GitLab, Roblox, True Anomaly, BEES |
| Window functions | 3+ | 12%+ | Brex "CTEs, window functions, joins across large datasets", Roblox, True Anomaly, BEES, Machinify, Trust & Will |
| Aggregation / GROUP BY (explicit) | 1 | 4% | Assumed baseline, so rarely written |
| Subqueries | 0 | 0% | Still expected in screens |

Explicit mentions of CTEs and window functions are low. Postings treat them as implied by "strong/advanced SQL". Interview guides rank window functions as the most-tested advanced topic.

### Python / pandas
| Item | Postings | Share |
|---|---|---|
| Python | 19 | 76% (Huntr: 46%, split required/preferred) |
| pandas/polars named | 0 | 0% (only the Trust & Will senior role names pandas/polars, statsmodels, scikit-learn, matplotlib) |
| R | 5 | 20% (Huntr: 20%) |
| Git | 2 | 8% |

Python is usually "proficiency" for analysis/automation. It is rarely a notebooks/pandas test in the posting text.

### Statistics
| Item | Postings | Share |
|---|---|---|
| "statistic" (degree or skill) | 11 | 44% |
| Hypothesis / significance / CI | 2 | 8% |
| Forecasting | 4 | 16% |
| Causal inference | 2 | 8% |
| Regression | 1 | 4% |

Statistics is mostly a degree preference or "sound analytical judgment". Few postings list specific tests.

### BI tools
| Tool | Postings | Share |
|---|---|---|
| Any named BI tool | 15 | 60% |
| Tableau | 14 | 56% (Huntr: about 33%, mostly "preferred") |
| Looker/LookML | 7 | 28% |
| Mode/Hex/Omni/Sigma/Metabase/ThoughtSpot | 6 | 24% |
| Power BI | 1 | 4% here (Huntr: 27%). Heavy in UK and enterprise postings (BEES, the UK listings) |
| Excel/Sheets | 11 | 44% (Huntr: 24%, Careery: 75%) |
| dbt | 10 | 40% |
| Cloud warehouse named (Snowflake/BigQuery/Redshift/Databricks) | 9 | 36% |

Tool choice is not fixed. Learn the dashboard concepts once, then pick one tool (Tableau or Looker for US tech, Power BI for UK/enterprise).

### Experimentation / A/B testing
| Item | Postings | Share |
|---|---|---|
| A/B / experiment mention | 7 | 28% |
| Funnel / cohort / retention / churn | 6 | 24% |

Junior/mid postings seen outside the sample (ABOUT YOU, MLabs, Careerswift, Harnham) also list A/B testing. It is core for product and growth analyst roles and a nice-to-have elsewhere.

### Communication and case work
| Item | Postings | Share |
|---|---|---|
| Stakeholders | 22 | 88% |
| Communication | 18 | 72% |
| Present / storytelling | 15 | 60% |
| "Non-technical" audience | 8 | 32% |
| KPIs / metrics | 17 | 68% |

Huntr: communication appears in about a third of all postings, and is required about 9 times in 10 when listed. Example phrasing: Trust & Will wants "punchline first" and a regression result turned into a one-paragraph recommendation.

## Interview loop (from guides)
| Stage | What it tests | Source |
|---|---|---|
| Recruiter screen | Tools, domain, motivation, pay | Interview Pilot |
| Hiring-manager screen | Past analyses, stakeholder impact | Interview Pilot |
| Live SQL round (45-60 min) | Joins, aggregates, window functions, date logic, NULLs, debugging. Careery says about 60% of loops include a live SQL test | Interview Pilot, Careery |
| Case round | Metric drop diagnosis, product-change evaluation, recommendation | Both |
| Dashboard / viz round | Metric choice, chart choice, audience | Interview Pilot |
| Take-home | Common at startups, sometimes at consulting, less at big tech, rare at enterprise | Careery |
| Python round | About 40-50% of loops per Careery (no source given); pandas filter/group/merge/clean | Careery |
| Behavioral | Ownership, ambiguity, flawed data, prioritization (STAR) | Both |

Loop length: startups 2-3 rounds over 1-2 weeks; big tech 4-5 rounds over 3-5 weeks; average 3-4 rounds over 2-4 weeks (Careery).

### Interview content that recurs
- **SQL patterns:** top-N per group, dedupe with ROW_NUMBER, running totals, LAG/LEAD, 7-day retention, funnel conversion, WHERE vs HAVING, left join vs filter placement. Define the grain before joining. Validate with row and distinct counts.
- **Case structure:** (1) confirm the metric move is real, not tracking or pipeline; (2) segment by platform, geography, channel, tenure; (3) decompose revenue into traffic x conversion x AOV x mix; (4) recommend.
- **Experiments:** randomization unit, sample size, duration, guardrails, statistical vs practical significance, no peeking, non-significant does not mean no effect.
- **Stats:** correlation vs causation, p-value, confidence interval, effect size, power, multiple comparisons.
- **Excel:** pivot tables, lookups, dedupe (mainly screening and non-tech employers).

## Suggested priority order for prep
1. SQL: joins, grain, GROUP BY/HAVING, CTEs, window functions, NULLs, dates, retention and funnel queries.
2. Metrics and case structure (diagnose a drop, define success, guardrails).
3. A/B testing and core stats.
4. One BI tool plus dashboard design reasoning.
5. Python/pandas basics (filter, groupby, merge, clean).
6. Stakeholder communication, "punchline first", behavioral stories.
7. Light dbt/data-modeling vocabulary, and how you use AI tools.

## Confidence
- High: SQL first, stakeholders and communication near-universal, dashboards near-universal.
- Medium: tool shares (small, senior-skewed, US tech sample; Greenhouse only).
- Low: Careery percentages (no sample size or method) and the 60% / 40-50% interview-format figures.
