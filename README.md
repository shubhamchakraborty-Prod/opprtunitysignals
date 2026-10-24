# Noida Sector 62 / 63 Industry Opportunity Explorer (research pilot)

ConveGenius.AI research pilot. Public hiring signals, employer verification, ten years of investment and policy change, and skill plans for learners, for **Noida Sectors 62 and 63 (Gautam Buddh Nagar, Uttar Pradesh)**, with **Kalyani** and **Siliguri (West Bengal)** for comparison. Four views on the same data: **Learners**, **Institution**, **Industry** and **Internal** (Swift AI Academy product signals). Design: Material 3 with Google Sans, following the principles in `docs/PRODUCT_PRINCIPLES.md`.

Not an official employment service. Not an authorised government programme.

## Quick start

| Goal | Command | Notes |
|---|---|---|
| Open the offline snapshot | open `dist/explorer-offline.html` | No install, no server. Practice mode for team roles; nothing is saved. |
| claude.ai page | `dist/artifact.html` | Same app without the document skeleton, for publishing as a claude.ai artifact (map sketch only). |
| Run the full pilot (file store) | `npm install && npm run dev` then open http://127.0.0.1:8080 | Data persists in `data/runtime/db.json`; audit trail in `data/runtime/audit.jsonl`. |
| Run on PostgreSQL / PostGIS | `DATABASE_URL=postgres://… STORE=pg npm run dev` | Migrates and seeds an empty database automatically. |
| Demo without persistence | `STORE=memory npm run dev` | Resets on restart. |
| All tests | `npm test` (44 unit/service/API) · `npm run test:e2e` (10 browser) · `TEST_DATABASE_URL=… npm run test:pg` (PostGIS) | e2e uses the pre-installed Chromium. |
| Typecheck | `npm run typecheck` | `checkJs` over `src/`. |
| Screenshots | `npm run screenshots` | Writes `docs/screenshots/`. |

Requirements: Node 20+. PostgreSQL 14+ with PostGIS 3 only for `STORE=pg`.

### Host on Netlify (static)

| Way | Steps |
|---|---|
| Drag and drop | Open https://app.netlify.com/drop and drop the `dist` folder |
| Connect GitHub | Add new site > Import from Git > this repo and branch. `netlify.toml` sets build `npm ci && npm run build`, publish `dist`, Node 22 |
| Netlify CLI | `npm i -g netlify-cli`, `netlify login`, `netlify deploy --dir=dist --prod` |

Netlify serves the app in offline mode with the built-in sample data: practice mode for team roles, nothing saved, Government data shows the live simulation and the last snapshot. Live sign-in, saving and scheduled government checks need the Node API server on a Node host (Render, Railway, a VM). Street map with a provider key: set `MAP_PROVIDER` and `MAP_API_KEY` as Netlify environment variables (`docs/MAPS.md`).

### Dev sign-in

Unauthenticated visitors are **Observers**. Use "Team sign-in" (top right) and a dev token:

| Role | Token | Can |
|---|---|---|
| Observer | none | Read public views, export |
| Researcher | `dev-researcher-token` | Upload CSV, approve records, resolve duplicates, flag sources, record interviews, read audit |
| Employer verifier | `dev-verifier-token` | Submit employer verifications, see restricted contacts |
| Administrator | `dev-admin-token`, `dev-admin-2-token` | Everything, incl. approving verifications (never their own), pass-out data, sentiment switch |

Dev tokens are for local demos only. See `config/README.md` for real users.

## Screens

Four views, chosen from the home page or the switcher at the top of the navigation. One location picker (Sector 62 and 63, Sector 62, Sector 63, Kalyani, Siliguri) drives every regional page. Every ad carries a coloured trust label; every external figure carries its source, date and confidence.

| View | Page | Answers | Screenshot |
|---|---|---|---|
| All | Home | What this is, one door per audience, how it works, what is changing | `docs/screenshots/00-home.png` |
| Industry | Jobs map | Scorecards, filters with removable chips, zoomable map (hovering a job highlights its pin), job list | `01-jobs-map.png`, `01b-job-detail.png` |
| Learners | Where to apply | College, polytechnic or ITI: ads open to you, official portals (NCS, NAPS, NATS, PM Internship, UP Sewayojan, WB Employment Bank), skills asked, Swift AI Academy pathways, institutes nearby | `02-where-to-apply.png` |
| Learners | Close my skill gaps | Pick a trade: jobs now, jobs after a short course, a skill plan of Swift AI Academy courses (or other providers, or trade training) | `03-close-my-skill-gaps.png` |
| Learners | Match a learner | Five example learners: worth a call / needs more skills / not eligible as written | `04-match-a-learner.png` |
| Institution | ITI trades and skill gaps | 103 CTS trades mapped to local ads: extra skills, courses, bridge jobs | `05-iti-trades-and-skill-gaps.png` |
| Institution | Next steps | Ready for planning vs call these employers first | `06-next-steps.png` |
| Institution | Institutes nearby | ITIs, polytechnics and colleges within about 100 km on the map, with projects coming up nearby and partnership ideas | `07-institutes-nearby.png` |
| Industry, Institution, Internal | Market overview | India, the state, or 100 km: demand indicators, 2016 to 2026 timeline, largest announcements, roles in demand, future projects linked to skills and institutes | `08-market-overview.png` |
| Industry | Compare 62 and 63 | Type of work, skills, conditions, what ads leave out | `09-compare-62-and-63.png` |
| Industry | Coming up | Announced projects with likely trades; never counted as jobs | `10-coming-up.png` |
| Industry | Kalyani and Siliguri | Industrial parks, clusters and ITIs on the same zoomable map | `11-kalyani-and-siliguri.png` |
| Industry, Internal | Government data | A clearly labelled live **simulation** (tiles, data-flow diagram, streaming chart, event feed, connection health) above the real status of every tracked source | `12-government-data.png` |
| Internal | Market signals | Skills employers ask for vs the Swift AI Academy catalogue vs NSQF, NPTEL, SWAYAM, nasscom and Skill India: build, extend, curate or promote; course demand; platform signals | `13-market-signals.png` |
| Institution | Workers' views | Empty until consented interviews exist | `14-workers-views.png` |
| Industry, Internal | Sources | Every ad linked, freshness, confidence, CSV export | `15-sources.png` |
| Internal (team) | Review queue, Record an employer call | Uploads, calls, repeats, approvals, change log | `16-review-queue.png`, `17-record-employer-call.png` |

Internal pages need a team sign-in on the live server; the offline copy shows them for the demo. Screenshots show the zoomable sketch because street tiles were blocked in the capture environment.

## Architecture

```
src/core/      shared domain logic (runs in browser and server, no dependencies)
  schema.js      evidence model, validation, redaction, CSV mapping
  parse.js       wage / experience / education / URL parsers
  dedupe.js      clustering of mirrored posts (union-find), representatives
  filters.js     visibility rules used by every counter
  analytics.js   KPIs, prevalence, requirement frequency, coverage, trend, sentiment, demand coverage
  matching.js    learner hard gates + skill overlap
  decisions.js   fact / inference / recommendation, planning tiers
  terms.js       employment-terms extraction (never sentiment)
  rbac.js        roles and permissions
  service.js     all use cases: RBAC, validation, four-eyes approval, audit
  note.js        management note (Markdown)
src/server/    node:http API, bearer auth, file store, PostgreSQL/PostGIS store, workers
web/           page template, Material 3 styles, views (bundled by esbuild), nav.js (four views), art.generated.js (illustrations, icons)
  src/core/signals.js  market signals: demand vs catalogue vs providers, suggested actions
data/source/   untouched v0 inputs (snapshot JSON, CSV register, prototype HTML)
data/seed/     evidence-model seed built by scripts/build-seed.mjs
test/          node:test suites and Playwright e2e
```

Design choices:

- **One rules engine.** Counters, matching and exports are computed by `src/core` in both the server and the browser, so the offline snapshot and the live API cannot disagree.
- **Plain JavaScript with JSDoc types** (`checkJs`), no framework: the offline single file still works from disk. The v0 page is kept unchanged in `data/source/prototype_index_v0.html`.
- **No vector DB, LLM, queue or scraper.** CSV upload plus human review; external connectors only when licensed and approved.
- **PostgreSQL/PostGIS**: JSONB provenance documents with generated columns, trigger-based record history, append-only audit log (trigger), DB-level checks (presence records carry no vacancies; verified counts only on confirmed records), approximate sector areas and `ST_Covers` scope checks for verified geocodes.

## Evidence model and rules

Field dictionary: `docs/EVIDENCE_MODEL.md`. Key rules enforced in code and tests:

| Rule | Where |
|---|---|
| Signal count = deduplicated, current, in-scope public records in the capture window | `analytics.computeKpis` |
| Verified openings = sum of `vacancy_count_verified` on employer-confirmed, second-person-approved, in-scope, unexpired records verified within 90 days | `analytics.isValidConfirmed` |
| `observed_public` never contributes to verified openings; advert claims shown separately | `computeKpis.claimedButUnverified` |
| Portal label naming another sector makes a record `adjacent_or_unclear`; never counted in either sector | `schema.normalizeRecord` |
| Employer-presence records never listed or counted as vacancies | `filters.filterOpportunities`, DB check |
| Mirrors share a `dedupe_cluster`, counted once until a reviewer decides | `dedupe.assignClusters` |
| Trend only with two comparable waves of 10+ records covering both sectors | `analytics.requirementTrend` |
| Sentiment only from approved, consented interviews; otherwise "No measured sentiment available" | `analytics.sentimentSummary` |
| Demand coverage only with confirmed openings and an approved pass-out figure > 0 | `analytics.demandCoverage` |
| Verifier contact data hidden from observers and exports | `schema.redactRecord` |
| Approver must differ from submitter | `service.decideVerification` |

## Acceptance tests

| Brief test | Covered by |
|---|---|
| Sector switch updates counters, records, pins | `acceptance AT1`, `e2e AT1` |
| Adjacent-sector result not counted as Sector 63 | `acceptance AT2`, `core CSV ingestion` |
| Historical post hidden by default, dated when shown | `acceptance AT3`, `e2e AT3` |
| Employer presence never a vacancy | `acceptance AT4`, `pg-store` |
| Two portals mirroring one post counted once | `acceptance AT5` |
| Employer verifies 3 → KPI +3, never the listing claim | `acceptance AT6`, `api`, `e2e AT6`, `pg-store` |
| 6-day week / night shift labelled employment terms | `acceptance AT7` |
| No interviews → "No measured sentiment available" | `acceptance AT8`, `e2e` |
| No pass-outs → no coverage ratio | `acceptance AT9`, `e2e` |
| Source URL opens; broken source can be flagged | `acceptance AT10`, `e2e` |
| Works without tiles; schematic says not exact | `e2e AT1 + AT11`, offline file test |
| Fact / inference / recommendation separated | `acceptance AT12` |

## Data added on 16 Oct 2026

| Data | File | Notes |
|---|---|---|
| 15 more job ads (JobHai/Naukri Group, PlacementIndia, WorkIndia, TeamLease, Indeed, company careers pages) | `data/source/capture_2026-10-16_search.json` | Transcribed from search results; pages could not be opened from the capture environment. Low confidence, flagged in the review queue for the team to open and confirm. Social media: only old IT posts found; none added. |
| 103 ITI (CTS) trades with sector and core skills | `data/seed/iti_trades.json` | Compiled list; check bharatskills.gov.in for the current list and syllabus |
| Skill-to-course pointers | `data/seed/course_map.json` | Course types and providers to check, not endorsements |
| Announced projects | `data/seed/announcements.json` | Announcements and projections with sources; never counted as jobs |
| Kalyani and Siliguri industry | `data/seed/regions.json` | WBIIDC, MSME and SJDA sources, dated per item; approximate pin positions |

## Data added on 24 Oct 2026

| Data | File | Notes |
|---|---|---|
| Swift AI Academy catalogue (3 pathways, 11 courses) and a skill map | `data/seed/saa_catalogue.json` | From the Swift AI Academy MVP product document. Hours are notional; credits and NSQF level still to be confirmed there. |
| Provider scan: 61 similar courses for 21 skills | `data/source/provider_scan_2026-10-24.json` (seed copy `provider_scan.json`) | NQR/NSQF, NPTEL, SWAYAM, FutureSkills Prime, IT-ITeS SSC, Skill India Digital Hub, ESSCI, ASDC, IASC. From search results only; some via aggregator sites, marked low confidence. |
| Timeline 2016 to 2026 (55 events) and 23 future projects | `data/source/decade_timeline_2026-10-24.json` (seed `market.json`) | Summit figures are MoU totals. Conflicting sources are noted per item. |
| 36 demand indicators, 14 in-demand roles, 25 institutes, 10 apply routes | `data/source/demand_institutes_2026-10-24.json` (seed `demand.json`) | No 2025 PLFS state unemployment rates were found for UP or WB. Most institute map positions are approximate (town or campus area). |

## Government data feeds

Scheduled fetches from official APIs with run logs, raw-response hashes and plain-language health. Setup, keys and safeguards: `docs/GOV_DATA_SOURCES.md`. Registry: `config/gov-sources.json`.

## Workers

| Command | Purpose |
|---|---|
| `npm run gov:sync [-- --source id]` | Fetch government feeds now and save a snapshot for the offline builds |
| `npm run ingest -- file.csv --label "Capture Nov 2026"` | Load rows (template: `data/templates/evidence_upload_template.csv`) into the review queue |
| `npm run check-links [-- --apply]` | HEAD-only link check, honours robots.txt, 3 s per host; `--apply` raises `broken_link` flags. A 200 never marks a job as open. |
| `npm run seed:build` | Rebuild `data/seed/evidence_records.json` from the v0 snapshot and the listed curation decisions |
| `npm run db:migrate` / `npm run db:seed` | PostgreSQL schema and seed |

## What is real, illustrative, or dependent on approved access

See `docs/LIMITATIONS_AND_DEPENDENCIES.md`. In short: the 18 source records, links, employer names, advertised pay and experience are real public observations from 16 Oct 2026. There are **zero** employer-confirmed openings, **zero** interviews and **no** pass-out data in the seed, and the UI says so. Learner profiles, sector circles and pin positions are illustrative.

## Demonstration explanation

One-page note for officials: `docs/DEMO_ONE_PAGER.md` (printable: `docs/demo-one-pager.html`).

## Licences and attribution

Map data © OpenStreetMap contributors (ODbL), credited on every map; MapLibre GL JS (BSD-3-Clause) is bundled; provider options and keys in `docs/MAPS.md`. Fonts: Google Sans Flex and Google Sans Code (SIL Open Font Licence), bundled. Icons: Material Symbols (Apache 2.0). Illustrations: unDraw (unDraw licence), recoloured to the brand. The Maps of India Noida city map is used only as a geographic reference and is not reproduced. The ConveGenius.AI logo is the original supplied file (`web/assets/convegenius-logo.png`, unchanged).
