# Noida Sector 62 / 63 Industry Opportunity Explorer (research pilot)

ConveGenius.AI internal research pilot. Public hiring signals, employer verification and ITI planning evidence for **Noida Sectors 62 and 63, Gautam Buddh Nagar, Uttar Pradesh**. Evolved from the v0 curated snapshot (16 Oct 2026) without changing its look or interaction design.

Not an official employment service. Not an authorised government programme.

## Quick start

| Goal | Command | Notes |
|---|---|---|
| Open the offline snapshot | open `dist/explorer-offline.html` | No install, no server. Read-only data with a demo sandbox for roles; nothing is saved. |
| Run the full pilot (file store) | `npm install && npm run dev` then open http://127.0.0.1:8080 | Data persists in `data/runtime/db.json`; audit trail in `data/runtime/audit.jsonl`. |
| Run on PostgreSQL / PostGIS | `DATABASE_URL=postgres://… STORE=pg npm run dev` | Migrates and seeds an empty database automatically. |
| Demo without persistence | `STORE=memory npm run dev` | Resets on restart. |
| All tests | `npm test` (33 unit/service/API) · `npm run test:e2e` (5 browser) · `TEST_DATABASE_URL=… npm run test:pg` (PostGIS) | e2e uses the pre-installed Chromium. |
| Typecheck | `npm run typecheck` | `checkJs` over `src/`. |
| Screenshots | `npm run screenshots` | Writes `docs/screenshots/`. |

Requirements: Node 20+. PostgreSQL 14+ with PostGIS 3 only for `STORE=pg`.

### Dev sign-in

Unauthenticated visitors are **Observers**. Use "Viewing as" (top right) and a dev token:

| Role | Token | Can |
|---|---|---|
| Observer | none | Read public views, export |
| Researcher | `dev-researcher-token` | Upload CSV, approve records, resolve duplicates, flag sources, record interviews, read audit |
| Employer verifier | `dev-verifier-token` | Submit employer verifications, see restricted contacts |
| Administrator | `dev-admin-token`, `dev-admin-2-token` | Everything, incl. approving verifications (never their own), pass-out data, sentiment switch |

Dev tokens are for local demos only. See `config/README.md` for real users.

## Screens

| Tab | Answers | Screenshot |
|---|---|---|
| Guided start | First-run: choose 62 / 63 / Both and an occupation or ITI trade | `docs/screenshots/00-guided-start.png` |
| Explore opportunities | Q1, Q3: filters, KPIs, map (grouped by employer and precision), list, detail with Fact / Inference / Recommendation | `01-explore-opportunities.png` |
| Compare 62 vs 63 | Q1, Q5: occupation mix, requirement frequencies, employment terms, source coverage, missingness, trend refusal | `02-compare-62-vs-63.png` |
| Who could fit? | Q4: Electronics Mechanic, Fitter, Machinist, COPA, Class 12; hard gates + skill gaps | `03-who-could-fit.png` |
| Worker & employer voice | Q6: disabled until consented interviews exist; advert terms shown separately | `04-worker-employer-voice.png` |
| Planning & outreach | Q2, Q7: planning-ready vs outreach tiers, demand coverage, management note | `05-planning-and-outreach.png` |
| Source review | Pending review, employer checks, duplicates, unverifiable, expired/stale, follow-ups, approvals, audit log | `06-source-review-queue.png` |
| Employer verification | Dated notes, roles, openings, entry pay, start date, pre-screen, contact, consent basis | `07-employer-verification.png` |
| Source register | Every record to its source, freshness, confidence; CSV export | `08-source-register.png` |

Screenshots show the schematic map because street tiles were blocked in the capture environment; with internet access the OpenStreetMap layer loads.

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
web/           original markup and CSS + view modules (bundled by esbuild)
data/source/   untouched v0 inputs (snapshot JSON, CSV register, prototype HTML)
data/seed/     evidence-model seed built by scripts/build-seed.mjs
test/          node:test suites and Playwright e2e
```

Design choices:

- **One rules engine.** Counters, matching and exports are computed by `src/core` in both the server and the browser, so the offline snapshot and the live API cannot disagree.
- **Plain JavaScript with JSDoc types** (`checkJs`) instead of a React rewrite: the v0 layout is preserved exactly and the offline single file still works from disk.
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

## Workers

| Command | Purpose |
|---|---|
| `npm run ingest -- file.csv --label "Capture Nov 2026"` | Load rows (template: `data/templates/evidence_upload_template.csv`) into the review queue |
| `npm run check-links [-- --apply]` | HEAD-only link check, honours robots.txt, 3 s per host; `--apply` raises `broken_link` flags. A 200 never marks a job as open. |
| `npm run seed:build` | Rebuild `data/seed/evidence_records.json` from the v0 snapshot and the listed curation decisions |
| `npm run db:migrate` / `npm run db:seed` | PostgreSQL schema and seed |

## What is real, illustrative, or dependent on approved access

See `docs/LIMITATIONS_AND_DEPENDENCIES.md`. In short: the 18 source records, links, employer names, advertised pay and experience are real public observations from 16 Oct 2026. There are **zero** employer-confirmed openings, **zero** interviews and **no** pass-out data in the seed, and the UI says so. Learner profiles, sector circles and pin positions are illustrative.

## Demonstration explanation

One-page note for officials: `docs/DEMO_ONE_PAGER.md` (printable: `docs/demo-one-pager.html`).

## Licences and attribution

Map data © OpenStreetMap contributors (ODbL) when tiles load; Leaflet (BSD-2-Clause) is bundled. The Maps of India Noida city map is used only as a geographic reference and is not reproduced. The ConveGenius.AI logo is the original supplied file (`web/assets/convegenius-logo.png`, unchanged).
