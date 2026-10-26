# Opportunity Explorer — Realistic Connected Platform Demo

**Audience:** Product, leadership, partners and field teams  
**Status:** Finished interactive demonstration (fictional data); **not a live integration**  
**Working branch:** `feature/realistic-connected-platform-demo`

## Open the full product demo

The primary deliverable is **`dist/platform-demo.html`**, a self-contained HTML application with all styles, scripts, icons, generated artwork and fictional data embedded. No installation, API keys, database, account or network access is needed.

To build locally:

```bash
npm ci
npm run build
```

Open `dist/platform-demo.html` directly in Chrome or Edge. The GitHub Actions workflow **Build Leadership Vision Demo** also uploads this file as a downloadable artifact named **`opportunity-explorer-platform-demo`**.

**This is the product to present.** It opens in a normal, credible workspace, not a PowerPoint-like seven-step narration.

## What has been developed

All views share **one internally consistent, entirely fictional dataset** rather than unrelated numbers shown on separate screens.

### Common platform shell

- Branded Opportunity Explorer / ConveGenius.ai header with the existing logo
- Standard workspace sidebar and responsive mobile navigation
- Global region context for **Noida Sectors 62/63, Kalyani and Siliguri**
- Date-window selector and global search
- A restrained **DEMO** indicator in the navigation; the Help control explains source and data limitations
- Operational-looking source health and indicators based entirely on generated fixtures
- No unwanted onboarding tour, giant simulated-data banner, presentation controls or pseudo-live social engagement widgets

### Screen 1 — Overview

Four KPI cards: unique signals, employer-confirmed example openings, unique employers and connected source connectors; an interactive map with source-type markers and a legend; demand-role bar chart; a latest-evidence stream and workforce-institute summary. Drill-down into record-level evidence.

### Screen 2 — Opportunities

Searchable role, employer and skill records; job-ad, employer-confirmed, social and investment filters; confidence selection; observable salary/qualification/skills, precise status distinction, evidence inspector and a save-to-watchlist action for the current browser session.

### Screen 3 — Market intelligence

Observed job-ad role-family volume, illustrative momentum, popular skill labels and curriculum relevance suggestions. Advertisements are distinct from verified openings and investment forecasts.

### Screen 4 — Institutions

ITI/polytechnic/college toggle; programme listings, cohort capacity and sample readiness, course-to-role linkage explanations, institute drill-down, region selection and training-supply snapshots.

### Screen 5 — Industry

Role-family selector and skills, employer signal summaries, ranked potential institutional partnerships, hiring requirement form with session-local drafts and removable items. Submissions do **not** contact an outside employer or institution.

### Screen 6 — Learners

Programme selection (e.g., Electrician, COPA, Fitter, Electronics Mechanic, BCA), recommended role categories with clear explanations, typical pay/requirements and actionable skill pathways. No claim of individual eligibility, measured learning gain or guaranteed placement.

### Screen 7 — Integrations

A fictional integration network with eleven connector categories (government, jobs, social/media, institution and employer-direct), health, response/record figures, update cadence, coverage and a manual **simulated sync** action.

### Screen 8 — Research operations

Evidence quality summary, deduplication metrics, records requiring corroboration and a five-stage evidence pipeline. In an actual deployment, sensitive review actions would remain RBAC-gated through the existing service layer; this fully fictional overview contains no private records.

## Shared synthetic data and asset implementation

- `web/src/showcase/data.js` — single fixture for geographies, roles, employers, salaries, skills, institute profiles, cohort supply and connected source health.
- `web/src/showcase/showcase.js` — page state, navigation, search, save actions, source sync, modal drill-downs and requirement drafts.
- `web/src/showcase/showcase-pages.js` — eight functional workspace screens, map, KPI calculations, filters, role matching and evidence explanations.
- `web/styles-showcase.css` — premium, light, responsive product UI in existing navy/blue ConveGenius palette.
- `web/src/views/future-state-map.generated.js` — existing offline-generated vector map; clickable record pins are separate data-derived controls.
- `scripts/build-web.mjs` — creates `platform-demo.html` with all dependencies embedded; the original `index.html`, `explorer-offline.html`, `artifact.html` remain unchanged in function.
- `web/src/main.js` — starts the isolated fully fictional demo **only** for the standalone platform-demo build. Ordinary research-pilot navigation and service permissions remain unchanged.
- `.github/workflows/vision-demo.yml` — packages the standalone file for direct GitHub Actions download.

All previous source files and assets from the first nine feature branches remain available in this repository, including the original pilot and the earlier future-state blueprint. No separate GitHub repository is needed.

## Interaction and product quality requirements

1. A presenter can move from Overview to Opportunities, Market Intelligence, Institutions, Industry, Learners, Data sources and Operations without opening a separate artifact.
2. Every area, filter, role selector, source view and institute selection actually changes what is shown.
3. The same synthetic employer/role/source identity and confidence is reused across pages.
4. Duplicate portal observations do not inflate the unique signal or advertisement count.
5. Job advertisements, confirmed requirements, investment announcements and social mentions use distinct statuses.
6. Confidence is visible and inspectable; it is **not** employment or hiring probability.
7. Save actions and submitted example hiring requirements remain in the browser session and are not sent externally.
8. All source health, monitoring metrics and refresh statuses are fictional.
9. Mobile/desktop layouts work, and the entire demo can open without an internet connection.
10. The small global DEMO label and About workspace explanation remain visible/available; explanatory notes do not interrupt the primary interface.

## Real platform limitations

This presentation model illustrates the *product experience*, not a claim of connected live APIs. The original research pilot continues to exist separately in the codebase. Actual government data sharing, commercial feeds, social platform access, employer confirmation, security, identity, audit logs and production deployment remain distinct workstreams requiring approval and validation.

The demonstration map is a reusable, artistic schematic, not a real address map or accurate depiction of Noida, Kalyani or Siliguri geography. Map pins indicate fictional example records only.

**Recommended demonstration route:** Overview → Map / Evidence → Opportunities → Market trends → Institutions → Industry → Learners → Integrations. No guided-tour controls are necessary; navigate exactly as an actual user would.
