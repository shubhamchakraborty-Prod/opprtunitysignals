# Opportunity Explorer — Future-State Integrated Intelligence Demo

**Specification:** v1.0 · 24 October 2026 · **Audience:** product, engineering, research, field teams and leadership.  
**Owner:** ConveGenius.AI / Opportunity Explorer.  
**Implementation branch:** `feature/future-state-demo-blueprint`.  
**Status:** **Interactive simulated preview, not a live integration.**

> **North-star story:** “Multiple approved labour-market sources are collected, evaluated and reconciled; the platform explains how reliable every claim is, then presents different authorised actions to learners, institutions, employers and researchers.”

The working preview is reached through **Internal → Integrated demo** in the existing application. It is deliberately synthetic and visible without privileged research access because it contains no operational user data. The real Internal review and admin views retain existing RBAC.

---

## 1. Principles and hard boundaries

1. **Simulation is explicit and permanent.** Every mock connector says **DEMO FEED**; headline says **FUTURE-STATE SIMULATION**; no production key, token, source URL, employer or institutional record is claimed to be connected.
2. **Evidence is claim-specific.** Official labour-force statistics may be strong evidence for a statewide indicator but do not establish that an individual employer has a vacancy. A recruiting post may establish “advertised” but not “open.”
3. **Confidence is not verification.** A 92/100 ad can still be *unverified*. A verified opening requires documented direct confirmation, second-person approval, valid scope, dates and identity under the real `isValidConfirmed` rules.
4. **No invented geolocation.** Illustration pins show the visual interaction, not premises coordinates; district and sector precision are separate from confidence. No heatmap from a tiny sample.
5. **Never double count.** Group mirrored portals by employer/role/source ID under a dedupe cluster; count observations, clusters, vacancies and trend claims separately.
6. **Source access must be authorised.** API availability, keys, commercial licensing, crawling permission and social partner access are independent questions. Do not suggest LinkedIn, NCS or private boards provide unrestricted public job feeds.
7. **Privacy and auditability.** Source provenance, consent basis, checksums, ingest history, reviewers and approval transitions must be traceable. Learner identity never transfers to an employer without specific authorisation.
8. **No placement promises.** Match scores describe catalogue relevance, not assessment of an individual or eligibility. Announced factories do not become jobs before validated demand.
9. **Readable first, technical second.** Present concepts with plain language, clear denominators and optional “Why this?” drill-down; retain details and formal source IDs in evidence panels.
10. **Scenarios are comparable only when coverage allows.** Noida 62/63 is the initial study geography; Kalyani and Siliguri demo scenarios illustrate future workflows, not equivalent live coverage.

## 2. Demonstration journey (7–10 minutes)

| Moment | Presenter action | What the team sees | Takeaway |
|---|---|---|---|
| 1. Welcome | Open **Internal → Integrated demo** | Large simulation disclosure, KPI examples, illustrated map | This is the planned operating interface, not a claim of working integrations |
| 2. Sources | Scroll to Integration Hub | Government, private job, social/media and direct feeds; *demo feed* + actual access dependency | The data ecosystem and the legal/operational dependencies are visible |
| 3. Converge | Return to map, select Quality technician | Separate portal records share a cluster; one count per distinct observed opportunity | More sources do not automatically mean more jobs |
| 4. Trust | Select an unconfirmed social mention | Confidence breakdown and conservative cap; evidence type unchanged | Confidence must be explainable and cannot turn a rumour into an opening |
| 5. Verify | Select an approved-in-simulation employer observation | “Mock-confirmed” quantity, directness and secondary review explained | An actual verified KPI requires the real service-layer approval process |
| 6. Four audiences | Switch Research / Learner / Institution / Industry within evidence | Same source produces different permitted next-step recommendations | One intelligence layer, not four contradictory data stores |
| 7. Map and regions | Switch Noida → Kalyani → Siliguri | Synthetic scenarios and visible location precision caveats | Geography is coverage-driven, not guessed |
| 8. Simulate | Click **Run simulated sync** | UI changes simulated cycle count, no network request | This is exactly what would become real after connector approval |

**Demo owner script:** “This screen is illustrative. Here is where the feed would appear. Here is how a claim earns confidence, why social buzz is not an opening, what employer verification would add, and how each stakeholder would act on the same evidence.”

## 3. Complete information architecture

### Internal research / intelligence (primary for team demo)

| ID | Screen | Main sections | Key actions | State in this batch |
|---|---|---|---|---|
| INT-F01 | **Intelligence command centre** | Coverage summary, source health, sample indicators, map, recent signals, data warnings | Filter geography, sector, confidence and age | **Interactive preview (Internal → Integrated demo)** |
| INT-F02 | Integrations Hub | Group by Government, Jobs, Social & Media, Direct; licence/access requirements, sync history | Inspect connector and configuration checklist | Basic demo cards; detailed statuses in next batch |
| INT-F03 | Unified Signals Stream | Normalised observations, duplicate clusters, freshness, verification and source links | Filter, select, compare evidence | **Interactive preview** |
| INT-F04 | Confidence & Evidence | Score components, caps, evidence graph, validity and location precision | Inspect score and related source cluster | **Interactive preview** |
| INT-F05 | Opportunity Intelligence Map | Role signals, institutions, announced projects, social signals, geographic uncertainty | Select pin, filter layers, inspect source | **Illustrative vector map + working markers** |
| INT-F06 | Source Reliability & Coverage | Coverage gaps, records by publisher, error rates, permission and latency | Choose area, view historical ingestion runs | Planned |
| INT-F07 | Research Review & Verification | Prioritised queue, human review, duplicate decisions, employer calls, second-person approval | Real permissions-based review, submit, approve | Existing real service; **not simulated into published data** |
| INT-F08 | Sector Trends & Foresight | 3/6/12-month comparative trend, minimum sample gating, announcements vs vacancies | Explore trend methodology, compare periods | Planned |
| INT-F09 | Workforce Supply Intelligence | ITI/polytechnic/college offerings, verified pass-outs and cohort pipeline | Filter by trade, qualification and time | Planned, requires source agreements |
| INT-F10 | Admin and Governance | Roles, tenancy, connector keys/health, policy, audit, retention | Authorised API settings and access management | Planned, not imitated by public demo |
| INT-F11 | Reports and Export | Source-linked government brief, institutional dashboard, downloadable evidence | Export with timestamp/source/coverage disclaimer | Planned |

### Learner experience

| ID | Screen | Future-state behaviour |
|---|---|---|
| LRN-F01 | Onboarding / profile | ITI, diploma, degree and continuing learners; qualification, location, interest and consent |
| LRN-F02 | Personalised home | Nearby role *categories*, relevant ads, confirmed openings separately, learning progress |
| LRN-F03 | Opportunity Explorer | Filters by role, qualification, distance, pay, shifts, source confidence, freshness |
| LRN-F04 | Opportunity detail | Employer/source evidence, actual verification, eligibility checklist, application route |
| LRN-F05 | Skill gap / pathways | Typical role requirements vs learner-declared or assessed capabilities, caveats, course options |
| LRN-F06 | Coming up | Announced industrial changes, explicitly not current vacancies |
| LRN-F07 | Application / engagement | External application click-out or approved employer workflow, never falsely marked “applied” |
| LRN-F08 | Skill Passport | Evidence of assessed work, projects and skills, consent-gated sharing, not a simple file drive |

### Institution experience

| ID | Screen | Future-state behaviour |
|---|---|---|
| INS-F01 | Overview | Verified local indicators with data coverage, cohort information, actions |
| INS-F02 | Demand by trade/programme | Role-family mix, distinct ads vs verified openings, recurring skills, coverage notes |
| INS-F03 | Curriculum opportunity | Skills mentioned by employers compared with validated syllabi; time/cost constraints |
| INS-F04 | Supply and cohort tracker | Actual programmes, admissions, pass-outs and periods from approved institutional data |
| INS-F05 | Employer outreach | Review evidence-backed employers, schedule calls, track agreements and confirmations |
| INS-F06 | Placement / apprenticeship | Consented referral pipeline, applications, interviews and outcomes (no guarantee) |
| INS-F07 | Regional outlook | Project announcements, existing industry, reliability and time horizons |
| INS-F08 | Reports | Date- and source-stamped institution summary with sample limitations |

### Industry experience

| ID | Screen | Future-state behaviour |
|---|---|---|
| IND-F01 | Overview | Local supply visibility, constraints, cohort and qualification evidence |
| IND-F02 | Define role | Employer creates signed-in demand request with role, pay, shift, time, headcount |
| IND-F03 | Qualification-to-role comparison | Typical programme skills vs required role skills, not learner-specific assessments |
| IND-F04 | Institution discovery | Search consented institutions, verified courses, verified pass-outs and partnership contacts |
| IND-F05 | Candidate pipeline | Only opted-in candidate information; explain data permissions and reasons |
| IND-F06 | Partnership / prehire training | Institution discussions, apprenticeship, pre-joining training plan, shared status |
| IND-F07 | Evidence and outcomes | Requirement follow-up, hire/join outcomes, provenance and role access |

### Shared utility screens

Login/SSO, consent, alert preferences, source-help glossary, empty/error/loading states, account/data deletion, role switcher, and a universal **“Why do I see this?”** panel. Demo mode must never grant privileges in the real application.

## 4. Map design and integration contract

### Image asset in this branch
- Vector image: `web/assets/future-state-map.svg`
- Embedded offline copy: `web/src/views/future-state-map.generated.js`
- Preview screen: `web/src/views/future-state-demo.js`

The image is deliberately a **schematic urban illustration**, not an authoritative basemap. Map markers render as separate clickable DOM buttons from `DEMO_SIGNALS`; the background itself does not encode employer addresses. This means we can replace the backdrop with verified MapLibre layers later while retaining the pin/evidence interactions.

**Real map specification:**
1. Base: MapLibre using a properly licensed, keyed mapping provider; boundary/source attribution and offline error state.
2. Geometry: a real point only when a verified lat/lon and sufficient precision are present. Otherwise show an area centroid/zone band labelled *approximate* or keep the record off-map.
3. Layers: public adverts, approved-confirmed openings, institutions, industrial presence, planned projects, social mentions. Separate icons/legends; no visual blending of vacancy counts and announcement counts.
4. Filters: region, time, role family, sector, evidence type, status, confidence, source, freshness and location precision.
5. Interaction: pin → brief card → explanation → public source / next action; pin and list selections stay synchronized.
6. Density: cluster pins for legibility; tooltips always identify if “one record”, “distinct role observation” or “employer-confirmed opening.”
7. Heatmaps are disabled when coverage is sparse/nonrepresentative; no per-building precision for a sector-only record.
8. Mobile: 100%-width map with collapsible legend and list; bottom panel replaces tiny hover cards.
9. Accessibility: list/table has equivalent content for map-only information; keyboard-focus pins; reduced motion.
10. Region presets: Noida Sector 62/63; Kalyani; Siliguri. Apply source-coverage checks before comparing regional indicators.

**Do not present the generated dashboard artwork's invented numbers, employer names or streets as facts.** It is a stylistic illustration, not data or real geospatial imagery.

## 5. Connector registry and data contracts

The future system needs *two* independent connector statuses: **integration health** (technical) and **access entitlement** (legal/contractual). A technically reachable URL does not establish permitted reuse.

| Source | What it could provide | Access dependency | Role in insights |
|---|---|---|---|
| MoSPI / PLFS eSankhyiki | Aggregate labour-force indicators and comparators | Published API catalogue + specific dataset conditions | Macro backdrop, not street-level openings |
| data.gov.in | Government datasets including institutional or sector aggregates where published | API key/resource ID as applicable | Structured government evidence |
| NCS | Opportunity/vacancy data if authorised | Confirm approved feed/data-sharing arrangement; no unrestricted vacancies API assumed | National/state vacancies, subject to scope |
| NCVT MIS / DGT / state skilling MIS | Programmes, approved ITIs, pass-outs by trade/time if shared | Formal approved data sharing, use restrictions | Supply and demand coverage |
| AISHE / higher education sources | College capacity and programme context where published | Dataset-appropriate licence & period | College supply benchmark |
| State industrial agencies, investment portals | Project filings, allotments, announcements | Open publication or formal access; validate project stage | Industry presence/foresight, not jobs |
| Naukri / Apna / WorkIndia / Indeed / staffing partners | Advertised jobs, requirements, pay, posting date | Explicit partner licence or approved access method per provider | High-frequency observed demand |
| Employer careers page / ATS partner | Employer-published roles, location, application link | Site permissions or signed integration | Employer-origin job evidence |
| LinkedIn Talent and permitted public social inputs | Recruitment/company signals where permitted | LinkedIn partner approvals; no unauthorised scraping/aggregation | Corroboration / weak-signal intelligence |
| Licensed news, press releases | Investment announcements and sentiment themes | Publisher rights and source attribution | Trends and projects, not vacancies |
| Direct employer verification | Actual currently required roles, headcount, pay and period | Human contact, authorised account and second review | Confirmed-openings KPI |
| Institution feeds | Courses, cohorts, seats, pass-outs | Institute consent, API/CSV agreement | Validated training supply |

Reference material: [MoSPI eSankhyiki API](https://esankhyiki.mospi.gov.in/), [Open Government Data India](https://data.gov.in/), [LinkedIn API access](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access), existing `docs/GOV_DATA_SOURCES.md`.

**Mock registry contract:**
```json
{
  "connector_id": "ncs",
  "publisher": "National Career Service",
  "source_category": "government",
  "mode": "simulation",
  "simulated_health": "demo_feed",
  "actual_access": "requires_data_sharing_approval",
  "credential_configured": false,
  "last_simulated_sync": "2026-10-24T16:30:00+05:30",
  "refresh_policy": "proposed_six_hours",
  "geographic_coverage": ["state_if_permitted"],
  "claim_classes": ["job_advertisement"],
  "permitted_uses": [],
  "limitations": ["No public vacancy feed is claimed to be connected"],
  "records_in_demo": 64
}
```
Production connectors also require schema version, provider licence reference, consent/legal basis, rate limits, retries/backoff, raw payload checksum, batch ID, parsing errors, timestamps, key rotation, retention and alerting.

## 6. Unified observation and claim schemas

**Observation** = what a source published. **Claim** = what the platform infers or validates. **Verified opening** = a separate approved employment assertion.

```json
{
  "observation_id": "DEMO-OBS-001",
  "environment": "simulation",
  "origin": {"connector_id": "portal", "original_id": "mock-123", "url": null},
  "captured_at": "2026-10-24T15:00:00+05:30",
  "published_at": "2026-10-23",
  "claim": {
    "type": "job_advertisement",
    "occupation_family": "quality_assurance",
    "role_title": "Quality inspection technician",
    "employer_id": "synthetic-employer-01",
    "sector": "62",
    "skills": ["measurement", "quality checks"],
    "vacancies_advertised": 12,
    "vacancies_confirmed": null
  },
  "location": {
    "area": "noida",
    "claimed_sector": "62",
    "precision": "sector_only",
    "verified_coordinates": null
  },
  "dedupe": {"cluster_id": "quality-a", "representative": true},
  "review": {"state": "simulation_only", "independent_approval": false},
  "confidence": {"score": 77, "label": "High", "explanation_version": "demo-v1"},
  "limitations": ["Not employer-confirmed", "Synthetic example"]
}
```

Additional entities: **Publisher**, **ConnectorRun**, **RawObservation**, **CanonicalEmployer**, **EvidenceLink**, **DedupeCluster**, **Claim**, **LocationPrecision**, **ReviewAction**, **EmployerVerification**, **Opportunity**, **Qualification**, **TrainingProgramme**, **CohortSupply**, **LearnerConsent**, **PartnershipRequest**, **FeedbackOutcome**. Define primary keys and event histories; do not conflate an institute supply record with an available candidate.

**One synthetic, end-to-end scenario:** Two job portals mention a quality inspection role → dedupe into one advertised cluster → employer identity and job details are checked → verifier records 8 currently open positions (a *different* illustrative case) → independent reviewer approves → an institute sees approved role requirements → a learner sees eligibility text and an authorised application path. Merely linking duplicate ads does not confirm the opening.

## 7. Confidence model (demo v1)

Scores explain *claim reliability*, not eligibility, job probability or production data quality. Weighted rubric:

| Component | Max |
|---|---:|
| Traceable source provenance | 25 |
| Directness of evidence for *this claim* | 25 |
| Independent corroboration | 15 |
| Geographic precision | 15 |
| Freshness | 10 |
| Relevant field completeness | 10 |
| **Total** | **100** |

Bands: **Very High** 85–100; **High** 70–84; **Medium** 50–69; **Low** 30–49; **Needs Review** 0–29. Demo-only guardrails in `src/core/demo-confidence.js`:

- An unconfirmed social-only claim is capped at **54**.
- A project announcement without an explicit confirmed hiring plan is capped at **68**.
- A stale source is capped at **49**.
- A region-only location is capped at **69** for location-sensitive claims.
- A “trend” based on fewer than 10 observations is capped at **54**.

**Important limitations:** thresholds are design placeholders and must be empirically calibrated against reviewer agreement, historical source failures and verified outcomes. A source with a reputable name does not automatically get high confidence. Multiple mirrors are **not independent corroboration**. An official PLFS observation may be high-confidence at state level but cannot independently justify an employer-level finding.

Verification is **not scored**: status remains one of observed, pending confirmation, confirmed and second-person approved, rejected, stale or expired. A numerical confidence score must never upgrade an unconfirmed job ad into an employer-confirmed opening.

## 8. Future-state UX content contract

Every presented insight card should include:
- **Statement:** “Job advertisements mentioning technician skills increased in this sample.”
- **What was counted:** distinct approved advertisements, never a claimed vacancies total.
- **Area/time:** specific geography, source window and capture dates.
- **Confidence:** label, components and any cap, plus location precision separately.
- **Sources:** linked original evidence and dedupe cluster.
- **What we do not know:** current opening status, actual hiring demand, geographic coverage, employer hiring intent.
- **Next action:** inspect source, verify with employer, contact institution, apply at official route, or hold for review.

Use role-appropriate wording without showing legal/technical acronyms such as NSQF to learners. No automatic unconsented social profile aggregation. “Skill match” is *typical programme coverage* unless the learner provided an actual measured assessment.

## 9. Visual and accessibility system

- Light premium editorial system aligned with current ConveGenius/Opportunity Explorer UI: white and mist-blue, navy `#0E1B5C`, royal blue `#3D5AFE`, restrained teal `#078F83`, gold `#FBB034` for caution.
- Every simulated panel has a persistent visible simulation state; never replace it with “Connected” alone.
- Desktop: source rail/cards, main map/list, contextual evidence drawer. Mobile: 4–5 bottom destinations, one-column filters, map + collapsible results and full-width evidence sheet.
- Minimum 44 px primary touch targets where feasible; real button labels; semantic tables; screen-reader names for map pins; keyboard focus and colour+text status.
- Load/error/empty/stale/source-permission states distinct, not skeletons that fake successful data.
- Generated visual images are decorative only; all important source and confidence data is text/structured data for accessibility and export.
- Test at phone 360–430 px, tablet 768 px and desktop 1280–1440 px, browser zoom and reduced motion.

## 10. Build and migration plan

| Wave | Deliverable | Definition of done |
|---|---|---|
| **0 — This branch** | Synthetic integrated-demo page, visual map, connector registry, confidence explanation, working filters, role perspective switch, simulated sync | Builds in existing repo, no external API/network call, simulation disclosure always visible, sample source IDs linked across views |
| **1 — Polished demo** | Connector detail drawer, dedupe comparison, ingestion event playback, evidence chain, illustrative real-time motion, guided tour | All controls useful; mobile/desktop review; consistent mock fixtures; no invented production data outside demo |
| **2 — Four user perspectives** | Dedicated future-state Learner, Institution and Industry paths consuming the same simulation fixture and evidence | A selected observation keeps its claim/source/verification status across audiences |
| **3 — Controlled staging** | Real OIDC/SAML login, tenant boundaries, secrets management, Postgres permissions, backups and monitoring | Security and privacy approval; no dev tokens; audited retention/consent |
| **4 — Real data connectors** | One or two permitted public/contracted source integrations, raw provenance capture, normalisation and quality scoring | Written source permissions, logs, source links, rate limiting, reconciled counts and failure state |
| **5 — Employer and institution pilots** | Authenticated employer requirement submission, four-eyes verification and institution cohort data | Field-validated schema, actual permissions, opt-in workflows, no misleading outcome claims |
| **6 — Decision-grade roll-out** | Comparable multiwave trend, pass-out/demand coverage and audited reports | Sufficient sampling, methodology and official data licences; expert approval |

**Suggested next implementation milestone:** build a guided 7–10 minute end-to-end demo on the synthetic fixture that starts with a simulated job portal record and ends with separate research, institute, employer and learner views. After that, introduce *one real approved connector* into a secured staging environment; never silently switch synthetic feeds to real.

## 11. QA and governance checklist

- [ ] Simulation badge visible on map, source hub, cards, print and exports.
- [ ] No network calls, API secrets or production record mutation in demo mode.
- [ ] Connector “demo sync” cannot be mistaken for a live portal request.
- [ ] Every confidence score has explainable factors and caps.
- [ ] Social/project announcements cannot become verified vacancies.
- [ ] Duplicate portals do not multiply unique job counts.
- [ ] Mock and actual integrations are separately named and scoped.
- [ ] Location labels match their precision; illustrative pin is not a street address.
- [ ] Noida KPIs never substituted for Kalyani/Siliguri.
- [ ] Same observation has consistent source identity across all four views.
- [ ] Real role-based authorisation remains on the API layer.
- [ ] Browser/mobile accessibility, empty results and filters work.
- [ ] Real data processing meets source licensing and privacy requirements.
- [ ] Team viewers can understand the system without presenter narration.

**Acceptance condition:** The team should be able to distinguish an advertisement, an employer-confirmed opening, a future expansion announcement and a training-supply observation at a glance—and explain why confidence differs.

## 12. File map for engineers

```
src/core/demo-confidence.js                 Demo-only scoring and confidence guardrails
web/src/views/future-state-demo-data.js     Self-contained synthetic connectors and records
web/src/views/future-state-map.generated.js Inline generated vector artwork for offline builds
web/assets/future-state-map.svg             Standalone illustrative SVG map asset
web/src/views/future-state-demo.js          Main interactive mock experience
web/src/nav.js                              Internal → Integrated demo navigation
web/src/main.js                             Module registration
web/index.html                              idemo section
web/styles.css                              Responsive mock UI styling
test/demo-confidence.test.js                Confidence and simulated sample tests
test/e2e/ui.test.mjs                        Desktop/mobile interaction and disclosure checks
docs/FUTURE_STATE_DEMO_BLUEPRINT.md         Product and build specification (this file)
```

### Do not replace the real engine with the demo engine
Keep `src/core/analytics.js`, `src/core/service.js`, `src/core/schema.js`, `src/core/rbac.js` and the current data pipeline authoritative. Demo functions operate on `DEMO_SIGNALS` only. No demo signal enters publication, official KPI counts, or an actual source register.
