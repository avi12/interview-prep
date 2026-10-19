# Data analyst roles, wider sample: junior focus, non-Greenhouse sources

Collected 2026-10-19. Companion to `02-data-analyst-jobs.md` (sample 1: 25 Greenhouse postings, mid/senior, US tech).

## Summary
- **Sample 2 (n=99 postings, de-duplicated):** 61 entry-level, 38 mid or level unstated. 92 of 99 are non-tech employers (consulting and staffing, banks and insurers, hospitals, universities, logistics, retail). Only 7 are tech companies.
- **The entry-level bar is much lower than sample 1:** SQL is in about 6 of 10 postings (92% in sample 1), Python in 4 of 10 (76%), and the SQL that is named is basic ("joins", "queries"). CTEs and window functions appear in **0** of 99 postings.
- **Excel is a real requirement here:** 60 (61%) versus 44% in sample 1. Power BI (35 (35%)) rivals Tableau (31 (31%)); Looker is almost absent (1 (1%)).
- **Soft skills are universal:** communication 86 (87%), stakeholders 83 (84%), problem solving 61 (62%), willingness to learn 61 (62%).
- **A/B testing is a tech-only skill:** 7 (7%) here; 3 (43%) of the 7 tech postings.

## Method and caveats
- Postings fetched as full text, then counted with keyword regexes (same approach as sample 1). Counts are approximate; "mentioned" is not "required".
- **Dedup:** same title plus employer counted once. **Included titles:** data, BI, reporting, insights, analytics and business analyst. **Excluded:** senior/lead/manager/principal titles, interns, engineers, scientists, security/compliance/KYC/ops analysts, and offshore-only roles (India, Philippines, Europe).
- **Level label:** Entry = title says junior/associate/entry/I/1, or the lowest "N years" in the text is 0-1. "Mid/unspec." = everything else. Roughly half the postings state no years at all, so this label is a heuristic.
- **Role family:** 81 data/BI/reporting titles and 18 generic "business analyst" titles (mostly requirements gathering, UAT, process mapping; less SQL/BI). The "entry data/BI only" column removes those.
- **Sector tags** come from regexes on the employer name; "Other" (15) are small unclassified firms. Staffing/consulting (37) is the biggest bucket because Dice and SimplyHired are staffing-heavy, so the end employer is often hidden.
- **Bias warning:** Dice and SimplyHired over-represent contractors and small firms. The bank, health-system and retailer postings come from their own Workday career sites and are more representative of big non-tech employers.
- **Search-surfaced extras (not counted):** USAJOBS data analyst announcements ([872337900](https://www.usajobs.gov/job/872337900), [791884000](https://www.usajobs.gov/job/791884000), [827823200](https://www.usajobs.gov/job/827823200)): GS-7/9 asks one year of specialized experience (data accuracy, basic trend analysis, spreadsheets or visualization tools) or graduate study. Also Handshake, a UK DWP listing and virtualvocations entry-level BI listings surfaced in search; not opened.

## Sources: what worked and what failed
| Source | Result | Used for |
|---|---|---|
| SimplyHired search + job pages | **Worked** (HTML plus JSON-LD JobPosting) | 50 postings |
| Dice search + job pages (entry filter) | **Worked** | 23 postings |
| Workday public career-site API (`/wday/cxs/<tenant>/<site>/jobs`), no key | **Worked** for ~25 tenants: Citi, US Bank, PNC, Truist, Allstate, Cigna, Elevance, Nationwide, The Hartford, Northern Trust, State Street, M&T, Marsh McLennan, Target, Nordstrom, TJX, Dick's, Mass General Brigham, Mastercard, Booz Allen | 18 postings (many hits were offshore or senior) |
| The Muse public API | **Worked, narrow** (heavily Walmart, Bank of America, SpaceX, Navy Federal, USAA) | 4 postings |
| Lever and Ashby public posting APIs | **Worked** (Match Group, Gopuff, Veeva, Zoox, Ramp, Vanta, Whoop) | 4 postings (mostly senior; excluded) |
| Hacker News "Who is hiring" (Algolia API, Oct and Sep 2026) | Worked, **useless** for this: 2 analyst mentions in about 60 comments, none junior | 0 |
| Remotive API, RemoteOK API, Arbeitnow API | Worked, **no relevant roles** (no data analyst; 1 RemoteOK junior ops analyst) | 0 |
| Jobicy API | Worked, 0 results | 0 |
| Built In, Levels.fyi | Page loads (200) but results are JS-rendered; no postings in HTML | 0 |
| Indeed, Glassdoor, ZipRecruiter, Wellfound, Welcome to the Jungle | **Blocked (403)** | 0 |
| USAJOBS API, Adzuna API | Need an API key (401 / 400) | 0 (see web-search extras) |
| Walmart, CVS, Wells Fargo, Humana, Pfizer, Kaiser Workday | Tenant name wrong or no matching analyst roles | 0 |

## Skill counts (sample 2) vs sample 1

### SQL
| Skill | All (n=99) | Entry (n=61) | Mid/unspec. (n=38) | Entry data/BI only (n=45) | Sample 1 (n=25) |
|---|---|---|---|---|---|
| SQL | 58 (59%) | 36 (59%) | 22 (58%) | 31 (69%) | 92% |
| Joins | 36 (36%) | 24 (39%) | 12 (32%) | 16 (36%) | 48% |
| Aggregation/GROUP BY | 4 (4%) | 2 (3%) | 2 (5%) | 2 (4%) | n/a |
| Subquery | 1 (1%) | 0 (0%) | 1 (3%) | 0 (0%) | n/a |
| CTE | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 16% |
| Window fn | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 12%+ |
| Query optimization | 1 (1%) | 0 (0%) | 1 (3%) | 0 (0%) | 44% |
| Stored proc/views | 3 (3%) | 0 (0%) | 3 (8%) | 0 (0%) | n/a |

No CTE or window-function mention in any posting. Junior postings say "SQL queries" or "basic SQL". Interview guides still test windows and CTEs, so treat them as screening content, not posting content.

### Python, R, Excel, statistical packages
| Skill | All (n=99) | Entry (n=61) | Mid/unspec. (n=38) | Entry data/BI only (n=45) | Sample 1 (n=25) |
|---|---|---|---|---|---|
| Excel/Sheets | 60 (61%) | 38 (62%) | 22 (58%) | 27 (60%) | 44% |
| Advanced Excel (pivot/lookup/VBA/macros) | 5 (5%) | 2 (3%) | 3 (8%) | 2 (4%) | n/a |
| Python | 42 (42%) | 26 (43%) | 16 (42%) | 26 (58%) | 76% |
| pandas/numpy | 2 (2%) | 1 (2%) | 1 (3%) | 1 (2%) | n/a |
| R | 18 (18%) | 14 (23%) | 4 (11%) | 14 (31%) | 20% |
| SAS/Stata/SPSS | 10 (10%) | 8 (13%) | 2 (5%) | 8 (18%) | n/a |
| Git/version control | 7 (7%) | 4 (7%) | 3 (8%) | 4 (9%) | 8% |

R and SAS/Stata/SPSS are stronger at entry level (health systems, universities, research, banks) than in tech.

### BI tools and reporting
| Skill | All (n=99) | Entry (n=61) | Mid/unspec. (n=38) | Entry data/BI only (n=45) | Sample 1 (n=25) |
|---|---|---|---|---|---|
| Any BI tool | 52 (53%) | 32 (52%) | 20 (53%) | 31 (69%) | 60% |
| Power BI | 35 (35%) | 22 (36%) | 13 (34%) | 21 (47%) | 4% |
| Tableau | 31 (31%) | 17 (28%) | 14 (37%) | 16 (36%) | 56% |
| Looker | 1 (1%) | 1 (2%) | 0 (0%) | 1 (2%) | 28% |
| Qlik/Cognos/MicroStrategy/SSRS/BO | 5 (5%) | 2 (3%) | 3 (8%) | 2 (4%) | n/a |
| Alteryx | 3 (3%) | 1 (2%) | 2 (5%) | 1 (2%) | n/a |
| Dashboards/reports | 85 (86%) | 53 (87%) | 32 (84%) | 41 (91%) | 76% |
| ETL/pipelines/modeling | 29 (29%) | 15 (25%) | 14 (37%) | 15 (33%) | 56% |
| Cloud warehouse/big data | 30 (30%) | 16 (26%) | 14 (37%) | 15 (33%) | 36% |
| dbt | 1 (1%) | 0 (0%) | 1 (3%) | 0 (0%) | 40% |
| Data cleaning/quality | 50 (51%) | 31 (51%) | 19 (50%) | 28 (62%) | n/a |

"Cloud warehouse/big data" here also matches Azure, AWS, Spark, so it overstates warehouses versus sample 1. dbt and Looker are tech-stack skills; non-tech employers want Power BI/Tableau plus Excel.

### Statistics, experimentation, metrics
| Skill | All (n=99) | Entry (n=61) | Mid/unspec. (n=38) | Entry data/BI only (n=45) | Sample 1 (n=25) |
|---|---|---|---|---|---|
| Statistics (any) | 40 (40%) | 25 (41%) | 15 (39%) | 24 (53%) | 44% |
| Hypothesis/significance/regression | 14 (14%) | 6 (10%) | 8 (21%) | 6 (13%) | 8% |
| Forecasting/predictive | 16 (16%) | 9 (15%) | 7 (18%) | 9 (20%) | 16% |
| A/B testing/experiments | 7 (7%) | 4 (7%) | 3 (8%) | 3 (7%) | 28% |
| Funnel/cohort/retention | 4 (4%) | 3 (5%) | 1 (3%) | 3 (7%) | 24% |
| KPIs/metrics | 25 (25%) | 12 (20%) | 13 (34%) | 11 (24%) | 68% |

"Statistics" is mostly a degree field ("statistics, math, economics"). Named techniques are rare.

### Domain knowledge
| Skill | All (n=99) | Entry (n=61) | Mid/unspec. (n=38) | Entry data/BI only (n=45) |
|---|---|---|---|---|
| Domain: healthcare | 28 (28%) | 16 (26%) | 12 (32%) | 12 (27%) |
| Domain: finance/risk | 61 (62%) | 35 (57%) | 26 (68%) | 26 (58%) |
| Domain: ops/supply chain/retail | 16 (16%) | 11 (18%) | 5 (13%) | 10 (22%) |
| Any domain term | 74 (75%) | 44 (72%) | 30 (79%) | 33 (73%) |

Domain terms (loose regex: claims, HIPAA, credit, risk, fraud, loans, insurance, inventory, retail) appear in three of four postings. Few require domain experience at entry level; it appears in the duties and the "nice to have" lines.

### Soft skills and credentials
| Skill | All (n=99) | Entry (n=61) | Mid/unspec. (n=38) | Entry data/BI only (n=45) | Sample 1 (n=25) |
|---|---|---|---|---|---|
| Communication | 86 (87%) | 51 (84%) | 35 (92%) | 37 (82%) | 72% |
| Stakeholders/cross-functional | 83 (84%) | 51 (84%) | 32 (84%) | 39 (87%) | 88% |
| Presenting/storytelling | 52 (53%) | 34 (56%) | 18 (47%) | 27 (60%) | 60% |
| Non-technical audience | 20 (20%) | 11 (18%) | 9 (24%) | 7 (16%) | 32% |
| Attention to detail | 48 (48%) | 33 (54%) | 15 (39%) | 24 (53%) | n/a |
| Problem solving/critical thinking | 61 (62%) | 38 (62%) | 23 (61%) | 28 (62%) | n/a |
| Willing to learn/self-starter | 61 (62%) | 39 (64%) | 22 (58%) | 27 (60%) | n/a |
| Time mgmt/multi-tasking | 44 (44%) | 24 (39%) | 20 (53%) | 20 (44%) | n/a |
| Degree mentioned | 79 (80%) | 50 (82%) | 29 (76%) | 37 (82%) | n/a |
| Certification mentioned | 29 (29%) | 20 (33%) | 9 (24%) | 16 (36%) | n/a |
| AI/LLM/ML | 26 (26%) | 15 (25%) | 11 (29%) | 14 (31%) | n/a |

## How employer type differs
| Sector | n | SQL | Excel | Python | R/SAS/Stata | Power BI | Tableau | Stats | Entry share |
|---|---|---|---|---|---|---|---|---|---|
| Consulting/staffing/contractor | 37 | 21 (57%) | 23 (62%) | 17 (46%) | 6 (16%) | 13 (35%) | 9 (24%) | 9 (24%) | 62% |
| Bank/finance/insurance | 16 | 11 (69%) | 8 (50%) | 8 (50%) | 9 (56%) | 7 (44%) | 7 (44%) | 9 (56%) | 44% |
| Other | 15 | 6 (40%) | 9 (60%) | 0 (0%) | 1 (7%) | 4 (27%) | 4 (27%) | 1 (7%) | 80% |
| Healthcare/pharma | 10 | 6 (60%) | 7 (70%) | 5 (50%) | 2 (20%) | 4 (40%) | 5 (50%) | 6 (60%) | 50% |
| Retail/logistics/industrial/energy | 8 | 7 (88%) | 7 (88%) | 4 (50%) | 3 (38%) | 5 (62%) | 2 (25%) | 7 (88%) | 88% |
| Tech/software | 7 | 4 (57%) | 3 (43%) | 3 (43%) | 0 (0%) | 1 (14%) | 3 (43%) | 4 (57%) | 14% |
| Gov/edu/nonprofit | 6 | 3 (50%) | 3 (50%) | 5 (83%) | 4 (67%) | 1 (17%) | 1 (17%) | 4 (67%) | 100% |

Small cells (tech n=7, gov/edu n=6): read as direction only.

## Entry level and non-tech vs sample 1: what changes

| Dimension | Sample 1 (mid/senior, US tech) | Sample 2 (junior-heavy, mostly non-tech) |
|---|---|---|
| Experience asked | 3-10+ years | 0-2 years, or none stated (about half give no number) |
| SQL | 92%, optimization 44% | about 59%, basic joins; no CTEs or windows named |
| Python | 76% | about 42%; pandas almost never named |
| Excel | 44% | about 61%; pivots, lookups, VBA when named |
| BI tool | Tableau 56%, Looker 28%, Power BI 4% | Power BI about 35%, Tableau about 31%, Looker about 1%; also Cognos, Qlik, SSRS, Alteryx |
| Stack words | dbt 40%, warehouses 36% | dbt about 1%; Azure/AWS/Spark only in contractor and bank roles |
| A/B testing | 28% | about 7% (tech-only) |
| Stats | 44% | about 40%, mostly degree field |
| Language | KPIs, data modeling, stakeholders | reports, dashboards, data cleaning and quality, accuracy, attention to detail, deadlines |
| Domain | Product and growth metrics | claims, loans, risk, fraud, inventory, regulatory reporting |
| Extra gates | Take-home, case round (from interview guides) | Degree (80%), certifications (29% mention one, mostly as preferred) |

Observations:
- **Junior = Excel + SQL + one BI tool + clean reporting.** The typical entry posting asks for a bachelor's, SQL, Excel, Power BI or Tableau, and "communicate findings to non-technical stakeholders". Python is a differentiator, not a gate.
- **Non-tech postings sell reliability, not insight.** "Attention to detail" is 54% of entry roles (39% of mid). Data validation, reconciliation, recurring reports and regulatory or claims reporting dominate.
- **Business-analyst titles are a different job.** The 18 generic "junior business analyst" postings are about requirements, UAT, process maps and documentation, with little SQL.
- **Hiring-quality notes:** many Dice and SimplyHired entry roles are staffing-agency reposts of the same template (Dhalite, Collabera, Kforce), so repeat tool lists there are partly boilerplate.
- **Practical prep implication (junior track):** SQL basics through joins, GROUP BY and HAVING, then CTEs and windows as an interview-only edge; Excel (pivots, XLOOKUP, cleaning); one BI tool, Power BI first for non-tech employers; data-quality and reconciliation thinking; describing findings to non-technical people; one domain primer (finance, healthcare or retail). Experimentation and dbt matter only for tech product roles.

## Posting list (n=99)
Level: E = entry, M = mid or unstated. Family: D = data/BI/reporting, B = generic business analyst.

| Level | Fam | Role | Employer | Sector | URL |
|---|---|---|---|---|---|
| M | D | Data Measurement & Reporting Analyst - Express Scripts - Remote | cigna | Bank | https://cigna.wd5.myworkdayjobs.com/cignacareers/job/United-States-Work-at-Home/Data-Measurement---Reporting-Analyst---Express-Scripts---Remote_26011848 |
| E | D | Data Analyst - Credit Risk Management & Counterparty Risk (Client & Ma | citi | Bank | https://citi.wd5.myworkdayjobs.com/2/job/Tampa-Florida-United-States/Data-Analyst---Credit-Risk-Management---Counterparty-Risk--Client---Markets-Data-_26994251-1 |
| M | D | Pricing Execution and Reporting Analyst | citi | Bank | https://citi.wd5.myworkdayjobs.com/2/job/NC-CHARLOTTE-BALLANTYNE/Pricing-Execution-and-Reporting-Analyst_26971029 |
| E | D | Associate Data Analyst | CoreLend Financial | Bank | https://www.simplyhired.com/job/ZqOu8QGpca2B63ivt8oHaXtdQvWaJjGpkEu8c5jo40PrI53J1nJO9A |
| E | D | Underwriting & Actuarial Data Analyst I | Hawaii Medical Service Associa | Bank | https://www.simplyhired.com/job/6whO5yzl34uibUjojVhJ20CXNiYcnoPZcKpxXzQhL0dLM_VvmJMY8w |
| M | D | Specialist, Marketing Analytics | nationwide | Bank | https://nationwide.wd1.myworkdayjobs.com/Nationwide_Career/job/Ohio---Columbus-One-Nationwide-Plaza/Specialist--Marketing-Analytics_099461 |
| E | D | Member Communication Orchestration Analyst I (Insights Strategy) | Navy Federal Credit Union | Bank | https://www.themuse.com/jobs/navyfederalcreditunion/member-communication-orchestration-analyst-i-insights-strategy |
| M | D | Business Intelligence Analyst (Debit Card Product Analytics) | Navy Federal Credit Union | Bank | https://www.themuse.com/jobs/navyfederalcreditunion/business-intelligence-analyst-debit-card-product-analytics |
| E | D | Summer Associate (Business Intelligence & Data Analytics) | Navy Federal Credit Union | Bank | https://www.themuse.com/jobs/navyfederalcreditunion/summer-associate-business-intelligence-data-analytics-6dcddd |
| M | D | Portfolio Analytics & Strategy Specialist - Consumer Data Solutions &  | pnc | Bank | https://pnc.wd5.myworkdayjobs.com/External/job/PA---Pittsburgh-15222/Portfolio-Analytics---Strategy-Specialist_R229453-1 |
| E | D | Portfolio Analytics & Strategy Specialist (Card Fraud Strategy) | pnc | Bank | https://pnc.wd5.myworkdayjobs.com/External/job/Columbus-Plaza-Main-Office-OH124/Fraud-Data-Scientist--Credit-Debit-Card-Transaction---Strategy-_R202728-1 |
| M | D | Business Data & Regulatory Reporting Analyst II | truist | Bank | https://truist.wd1.myworkdayjobs.com/Careers/job/Charlotte-NC/Business-Data-Analyst-II_R0117947 |
| E | D | Fraud Strategy Analytics Analyst II (Entry / Intermediate Level) | USAA | Bank | https://www.themuse.com/jobs/usaa/fraud-strategy-analytics-analyst-ii-entry-intermediate-level-c1425c |
| M | D | Trust Reporting Analyst - Collateralized Loan Obligation | usbank | Bank | https://usbank.wd1.myworkdayjobs.com/US_Bank_Careers/job/Houston-TX/CLO-Reporting-Analyst--multiple-levels-_2026-0027086 |
| M | D | Macro Data Analytics Reporting Analyst - Operations | usbank | Bank | https://usbank.wd1.myworkdayjobs.com/US_Bank_Careers/job/Chicago-IL/Macro-Data-Analytics-Reporting-Analyst---Operations_2026-0026240 |
| M | D | Insights & Reporting Analyst | usbank | Bank | https://usbank.wd1.myworkdayjobs.com/US_Bank_Careers/job/Minneapolis-MN/Insights---Reporting-Analyst_2026-0030015 |
| E | D | Data Analyst I | 2ndWave LLC | Consulting | https://www.simplyhired.com/job/qgRjhpPMevgd0rtjf2-ACEivvK-LhulRJh-LfJNzKSfsI30eaXtSZg |
| M | D | Data Analytics Analyst I 4P/685 | 4P Consulting Inc. | Consulting | https://www.simplyhired.com/job/ccH2eljOb1HVaFczaea91v8ciPJSubDNilgHPs2jS2L9yf5rDlECFQ |
| E | D | Business and Process Reporting Analyst 1 | 4P Consulting Inc. | Consulting | https://www.simplyhired.com/job/GQl1CoC_WvWif0-941XNkxajfCt3P9rXOf_KpwimsbLJufJdql7xdQ |
| E | B | Junior Business Analyst – Financial Services | ALCglobalSoftware | Consulting | https://www.simplyhired.com/job/gYGusAyNld30qFox5OZ8fPo2_5fAnQoYRxnDxv0Io74VOo1COt5ITQ |
| M | D | Data Analyst with Power BI Certification | Anveta Inc | Consulting | https://www.dice.com/job-detail/56fead77-5605-4301-8b77-7c6ce3014563 |
| M | D | Data Analyst | bah | Consulting | https://bah.wd1.myworkdayjobs.com/BAH_Jobs/job/Arlington-VA/Data-Analyst_R0247514 |
| M | D | Data Quality Analyst | bah | Consulting | https://bah.wd1.myworkdayjobs.com/BAH_Jobs/job/Warner-Robins-GA/Data-Quality-Analyst_R0250053 |
| M | D | Financial Management and Budget Analytics SME | bah | Consulting | https://bah.wd1.myworkdayjobs.com/BAH_Jobs/job/McLean-VA/Financial-Management-and-Budget-Analytics-SME_R0251625 |
| E | D | Junior Data Analyst | CACI | Consulting | https://www.simplyhired.com/job/IyIr718Lv_soKEE0rQLRDeQy2DPLocMqG9QyeoaBmMQ2ecDiFOZDXA |
| E | D | Junior Data Analyst | CACI International, Inc. | Consulting | https://www.dice.com/job-detail/0ad85ad7-fdd7-4975-af8e-3b04fe8bbb87 |
| M | D | Mid-Level Data Analyst | Cawley & Bergmann, LLC | Consulting | https://www.simplyhired.com/job/Qg7ilwOOHHKifWm-dD5pFrOslSVumQz_6OarbvcKEq6jFtuuyxyS_A |
| M | D | Data Analyst | Changeis | Consulting | https://www.simplyhired.com/job/dAG6ZwliTeWYUTTygsBBv_GrUSGjpZX_-idJq5Xct4K1elMwt8002Q |
| E | D | Associate Data Analyst | Collabera LLC | Consulting | https://www.dice.com/job-detail/063f668c-e68c-4d9e-8984-437a83146bf1 |
| M | D | Data Analyst | Collabera LLC | Consulting | https://www.dice.com/job-detail/3d8cc18c-7adf-4e35-90d6-9c94514121b6 |
| M | D | Data Analyst with ERP Implementation | DataEdge Consulting, Inc. | Consulting | https://www.dice.com/job-detail/2bd1fa32-cb45-4412-8836-13332e31ae10 |
| E | B | Business Analyst – Entry Level | Dhalite Inc. | Consulting | https://www.dice.com/job-detail/0f6597a4-fbd7-48c8-82db-fb85ae09b222 |
| E | D | Entry level Data Analyst | Dhalite Inc. | Consulting | https://www.dice.com/job-detail/3223de3d-635e-4836-a43f-0695fa1c9104 |
| E | B | Entry-Level Business Analyst | Dhalite Inc. | Consulting | https://www.dice.com/job-detail/5caac67c-2fc8-4a18-a7af-f5ad5e47b540 |
| E | D | Entry-Level Data Analyst | Dhalite Inc. | Consulting | https://www.dice.com/job-detail/3f12775a-c46b-444b-af2a-db8323b7e76b |
| E | D | Junior Business & Data  Analyst | Ellianse LLC | Consulting | https://www.dice.com/job-detail/219461ac-57be-47fa-ac59-22295a0197a6 |
| M | D | Data Analyst with Presto, Hive, CDP (Any Customer Data Platform) | Everest Technologies | Consulting | https://www.dice.com/job-detail/6ac90e54-b6a8-4f1e-90c1-2a51ee2c2d84 |
| E | B | Entry-Level Business Analyst – Banking | GlobalSoftSolution | Consulting | https://www.simplyhired.com/job/BgufBKnuaLM2IyqLTBWn0rqhkLFN6THtTxSS8m49GIGE3jsjU2OLWg |
| E | D | Data Analyst I (ERIB) | Goldbelt, Inc. | Consulting | https://www.simplyhired.com/job/r5qIYqQ4lVSQvyxycMH4SIej7-XnGHdQebVoovWCdnMcNBkYh2vtrA |
| E | D | Data Analyst | GoodApple | Consulting | https://www.simplyhired.com/job/tFbEZY372aq8hv5lziRdK17gLW-Yj_Q8on_BKCPdwxvFy5f3TdLf4w |
| E | B | Junior Business Analyst | GuruSchools | Consulting | https://www.simplyhired.com/job/5O10NRkHtNW4wyOWSYyFD93uIjKPTr6LM4J3xIVqbyOtVJf-U7Lb7Q |
| E | B | Business Analyst - Junior | HUMAN TOUCH LLC | Consulting | https://www.simplyhired.com/job/YGojAPeG5U8YGxGO7c0ASB6tiplZJWddQwRL4AKO-SBPToHyb7dbaQ |
| E | D | Data Analyst (Junior-Associate) | Integration Innovation, Inc. | Consulting | https://www.dice.com/job-detail/27f37bd8-39f6-49f3-a89e-a31f3b623b48 |
| E | D | Junior Data Analyst | Kforce Technology Staffing | Consulting | https://www.dice.com/job-detail/1c9af19b-417c-4b6e-835c-7b6135e8f9d1 |
| M | D | Playbook Change & Reporting Analyst | Kforce Technology Staffing | Consulting | https://www.dice.com/job-detail/19822c31-774c-40e2-a8f1-8daf9c3f6250 |
| E | D | Associate Data & Automation Analyst | L.E.K. Consulting | Consulting | https://www.simplyhired.com/job/Z5tpg1VS27L3eBu53vbPM0JV0raZqYtb_q8wHYHH1pAwsb9OkC2v9w |
| E | D | Data Analyst and Visualization Consultant | Noblis | Consulting | https://www.dice.com/job-detail/520e8ae3-c261-458c-8770-f4d5c5585441 |
| E | D | Junior Business Intelligence Consultant | Numero Data LLC | Consulting | https://www.simplyhired.com/job/S3_rZ6xzOdsVz15S0W09G0HtHdLNeavfH4tcCj2TjmpEF-NL0ylH_w |
| M | D | Data Analyst with PHSPM - Need Experience in Department of Health in F | Prohires | Consulting | https://www.dice.com/job-detail/3d8541d1-5698-4f7c-b884-3a79bf50df5c |
| M | D | Junior Data Analyst | Pure Talent Consulting | Consulting | https://www.simplyhired.com/job/EAg-A3zTP56bIQ7EOuFpy1lUTeT9DdfvHUFefJWyL5G3o4bNc1JNaA |
| M | D | Data Analyst | Tradesmax Group Inc. | Consulting | https://www.simplyhired.com/job/4IFa9BfL4x9Im-aLyaJkQsfRquA-c3a0J1meeyuvCRLvrPwPqzzIAw |
| E | D | Data Analyst | Universal Technologies | Consulting | https://www.simplyhired.com/job/JO50txHQNhk1PBjesmoP9Wkyqb0BvC6hTPLxkpJ-qk-_l0l12otceQ |
| E | D | Data Analyst 1 | WCL Group | Consulting | https://www.simplyhired.com/job/30ykWUOu2nvIweiQJpDc28skHGz4pboNuHU6QqbePGaS-XIU1pHThQ |
| E | D | Scientific Data Analyst I - 2year Term | Associated Universities, Inc. | Gov | https://www.dice.com/job-detail/30702280-3154-4a74-bb93-9207a7d0ac77 |
| E | D | Data Analyst I | Cambium Learning Group | Gov | https://www.simplyhired.com/job/hgruxtpZlmjGa7gYv45Y7Bw1jwNilgPoASQ9SjRwNpepCTFCYBEmgQ |
| E | D | Associate, Strategic Analytics | New York City Economic Develop | Gov | https://www.simplyhired.com/job/bQ1LNjBVN_YTipRSatb2Yf7EELXQFgDunuv-R6cqRRD788--VvuGtA |
| E | D | Data Analyst I | The University of Alabama | Gov | https://www.simplyhired.com/job/_qmWa1XnAAu9UGxu7JtI-TZH3yUnWDjTu9hUG1OjR651u8l79SNWeQ |
| E | D | Research Data Analyst I | UCSF Campus BU | Gov | https://www.simplyhired.com/job/G3R-PpLbevPS6NnRhc8Puvg6QkDsUZoAsnS_eF3_8egqAgeOL-KC7w |
| E | D | Data Analyst I | University of Rochester | Gov | https://www.simplyhired.com/job/4LgeM0iI9nDM6p9Ynaa0PlcHDJoesSZ_5izwLvgYcTcsM3noJP-XBw |
| M | D | Data Analyst, Healthcare Analytics | Avalon Administrative Services | Healthcare | https://www.simplyhired.com/job/9qxVLCY95pWa82g3V_S_IWYV75da0nxj0vy5LAN1zyiE6na4Fq-hSg |
| M | D | Data Analyst | Cobbs Creek Healthcare | Healthcare | https://www.simplyhired.com/job/XpFma6GPphKK9V4jKAqpq-K3Z2_T0tOrjpWieaNpioWPyh97HZ01Ww |
| E | D | Temporary Part-Time Junior Data Analyst | DAP Health | Healthcare | https://www.simplyhired.com/job/7ewZu2lde23UbJbOG8H0D-xhptPRvsQMbXKiaM3c1Lk_QAxkiJsPSg |
| E | D | Vital Records Data Quality Analyst I | Department of Public Health | Healthcare | https://www.simplyhired.com/job/QU9umR72ACbz00rDcGsnFz4CYlzg8dvM7NtDBN8Snti8ymM0_Krm-Q |
| E | D | Data Analyst I - PED | Henry M. Jackson Foundation | Healthcare | https://www.simplyhired.com/job/6tw5ewaviHJaiOS13tIBfj4887zH0ym5F3LS2vZZnF86QTYno2pxLA |
| M | D | Data Analytics Associate | Imaging Endpoints | Healthcare | https://www.simplyhired.com/job/-Cwp_yBQI8Vmtdq3xA2uNhvDPDE4ZEhuxYLu20r85FkRaTDuEt0xtA |
| E | D | Data Innovation Research Data Analyst Stata | massgeneralbrigham | Healthcare | https://massgeneralbrigham.wd1.myworkdayjobs.com/MGBExternal/job/Boston-MA/Data-Innovation-Research-Data-Analyst-per-diem_RQ4072147 |
| M | D | Data Analyst II Radiation Oncology | massgeneralbrigham | Healthcare | https://massgeneralbrigham.wd1.myworkdayjobs.com/MGBExternal/job/Boston-MA/Data-Analyst-II-Radiation-Oncology_RQ4072077 |
| M | D | Trauma data Analyst | massgeneralbrigham | Healthcare | https://massgeneralbrigham.wd1.myworkdayjobs.com/MGBExternal/job/Salem-MA/Trauma-data-Analyst_RQ4075240 |
| E | D | Product Analyst Level I | MedRisk LLC | Healthcare | https://www.simplyhired.com/job/cFYvL_7hEvh-R6iIA9-swQsiAWy1ysOyNyg0x8kDwzLx_sA_QrlR_w |
| E | D | Junior Business Analyst - Strategic Insights Team | Bunzl | Other | https://www.simplyhired.com/job/bYwzLgjJ2mYwQsPnr3bg91lv-vj4fy3Lwi4aIIb5XfhhiEZ7Wx96kg |
| E | B | Junior Business Analyst | CERNER TECHNOLOGIES LLC | Other | https://www.dice.com/job-detail/0ddbaf14-293d-40b0-b270-4b254104eb8b |
| E | B | Junior Business Analyst | ChanceLight Behavioral Health, | Other | https://www.simplyhired.com/job/YCuX5p-4TYPcx0qIpHPgwRl59LVUSzb1uS8S69YQD35j7TiIMg_Vhw |
| E | D | Junior BI (Business Intelligence) Analyst | Credit Union of Denver | Other | https://www.simplyhired.com/job/Q7-gZ1VQnHZnMXg-97jcfaISlMTEQsugRJ9cNPriNQLg9aB29jerpg |
| E | B | IT Junior Business Analyst | Crystal Stairs | Other | https://www.simplyhired.com/job/3R1GNOUOLx1vN61gYuZhptUcLs-GPtBmeWYFzKQDIgFzxCTYV22iQQ |
| M | B | Business Analyst – I | Datasoft Technologies, Inc. | Other | https://www.dice.com/job-detail/35b1e3eb-0420-4280-af38-8679505ce8a4 |
| E | B | Entry Level /QA Analyst/ Jr. QA Tester/Business Analyst/BA | IT Excel | Other | https://www.simplyhired.com/job/hPqz18cAvqD_cTkrRHmiUn2KpuppxzdW84wGboScvnZ5gDFzZLPmpQ |
| E | B | Junior Business Analyst | Kiss Products | Other | https://www.simplyhired.com/job/DljcQRo45oY1g-9Q5feHhE99oj62t84drE4xgiT80KEwzOJIuB7xSQ |
| M | D | Business Analyst / Data Analyst (Entry-Level to Mid-Level) | MidWestern IT Inc | Other | https://www.dice.com/job-detail/4752a580-d03f-4ff8-8e0c-bfe110bf5d36 |
| E | B | Junior Business Analyst - Onsite,In Person Interview - Local Candidate | MSYS Inc. | Other | https://www.dice.com/job-detail/436b90ad-34cd-443d-b714-262b5d0eebb5 |
| E | B | Entry Level Business Analyst | NET2ASPIRE LLC | Other | https://www.dice.com/job-detail/0371d807-e464-4063-a95e-d61fad7609c9 |
| E | D | Junior Business Analyst – Data Mapping | Peraton | Other | https://www.simplyhired.com/job/iJxju_fkOG4WHxaVz6p2-hw5O3UTaRkZuxkkxCGLYfs6ctLrQyS_eQ |
| E | B | Junior CRM Business Analyst, National Business Development | TechVirtue LLC | Other | https://www.dice.com/job-detail/60155758-eb64-4462-b1d9-f874eef9c373 |
| E | B | Junior Business Analyst | Trinity Capital | Other | https://www.simplyhired.com/job/2AN0yxPljIDylgfuZayGoewRmrFAViyDXYqxCLoo6SEwpru4uIXApg |
| M | B | Business Analyst Junior | Tulk LLC | Other | https://www.simplyhired.com/job/AFOX-67gLyMiUY_bzie5lcjex2KD-PI7wFdthDG8nafY78qDwEt6OQ |
| M | D | Data Analyst I | Crane Worldwide Logistics LLC | Retail | https://www.simplyhired.com/job/LS6ZiTDA3Qs154jqbCn6g2qMc2QAhn6RlJVzH9BF_1aJx1KGlFvPWw |
| E | D | Business Data Analyst I | DHL | Retail | https://www.simplyhired.com/job/oGKZ5oIjyKUWMAIaozp5N12vbs3HZr-pasyp_iZNiIa5lBgIPy4t0w |
| E | D | Junior Data Analyst | PCS Wireless LLC | Retail | https://www.simplyhired.com/job/JJfn86NvyawgjIuizCnz4zBreW9I8nKOveVd09NY88bpMHNF9QS9tg |
| E | D | Junior Manufacturing Data Analyst | Pride Mobility Products Corp | Retail | https://www.simplyhired.com/job/-Rh22b_f0Hwa0CyAxaiezyF_dD_ioZHNEPNHTdiqKa_fE4n1mynUmg |
| E | B | Junior Business Analyst (Legal Operations) | Robertson, Anschutz, Schneid,  | Retail | https://www.simplyhired.com/job/bdZisYtZXlPQtGZoOOXNzlzn-_AaNBk7E2ba-KZ917OMn414W9fO4Q |
| E | D | Junior Data Analyst | SimPL Freight Solutions | Retail | https://www.simplyhired.com/job/EhBrVH3euw24xotkC1JfQAgKeYNWsnTNVvnhDftKvTRUDXuyxMcNsA |
| E | D | Data Analyst - Digital & E-commerce (experimentation, ML, Math/Stats) | target | Retail | https://target.wd5.myworkdayjobs.com/targetcareers/job/1000-Nicollet-Mall-MinneapolisMN-55403-2542/Data-Analyst---ECommerce-Product-Analytics--experimentation--ML--Math-Stats-_R0000442291 |
| E | D | Associate Data Analyst-Retail | Vistra Retail Operations Compa | Retail | https://www.simplyhired.com/job/YvX9ti3JEpdBZgvrLrUKYlvZMkl5-bcBAdO814E0R-NMuzVNdOvSTw |
| E | D | Associate Data Analyst | Internet Brands | Tech | https://www.simplyhired.com/job/WvaastCpIbDiXPmfxAarD6PwkxZ7_Am_7P2lkxVwnACjZKItU589YQ |
| M | D | Analyst, Operational Reporting & Metrics | mastercard | Tech | https://mastercard.wd1.myworkdayjobs.com/CorporateCareers/job/Purchase-New-York/Analyst--Analytics---Metrics_R-288069 |
| M | D | Data Analyst (Azar) | matchgroup | Tech | https://jobs.lever.co/matchgroup/3c12c050-2719-43e6-a69e-fdb971f399a7 |
| M | D | Product Data Analyst | matchgroup | Tech | https://jobs.lever.co/matchgroup/e5d6bda0-c185-4eb0-b25d-47df6cc0c3a1 |
| M | D | Jr. Data Analyst - Tableau/SQL | Siemens | Tech | https://www.simplyhired.com/job/SONshwJTMUf1CWwawss9_hf0_sTOdNMqxLDwHyMcUNtlQU03CPUn4A |
| M | D | Marketing Analytics - Data Analyst - July 2027 Start Date - ADP | veeva | Tech | https://jobs.lever.co/veeva/28c47d34-3ad6-4485-85a9-686b4239b9ea |
| M | D | Data Analyst - Pioneer | veeva | Tech | https://jobs.lever.co/veeva/c36c9d3b-fa88-4f43-87f9-ec32d53fc5f9 |

## Confidence
- High: Excel + SQL + a BI tool is the entry core; communication and attention to detail are near-universal; CTE/window functions are not named in postings.
- Medium: tool shares (n=99, staffing-skewed, regex counts); level labels (heuristic).
- Low: sector comparisons with small cells (tech n=7, government/education n=6).
