# Internal Research & Administration - Implementation Slice

This update builds new **read-only operational interfaces** on existing Opportunity Explorer research records and review APIs. No backend permission, verification status, publishing rule, employer-confirmation requirement or data source is modified.

## New screens

### 1. Research overview (`iops`)
- The first Internal landing page, available to signed-in team users with `read:review`.
- Reads the **actual authorised review queue** from `app.client.reviewQueue()`, not fake task counts.
- Shows pending record review, employer checks, duplicates, source follow-ups, second-person approvals, interview approvals, unverifiable and stale signals.
- Uses separate counts for overlapping queues, without pretending their sum equals a unique backlog.
- Distinguishes research records, approved deduplicated advertisements and currently valid independently verified openings.
- Links directly to the existing review queue and evidence, data-quality and signals views. All writes stay in the audited review and verification screens.

### 2. Evidence quality (`iquality`)
- Explicit denominator: *distinct, current, approved job advertisements*, using existing dedupe rules.
- Diagnostics for source URL, publication date, area precision, stated experience, stated education, advertised pay, recheck freshness and expired employer confirmation.
- Filters and source-backed issue list support researcher investigation.
- Missing pay, location or date is shown as missing, **not invented**. Incomplete records are not automatically rejected.
- These are advisory diagnostics only; review decisions continue through the existing service.

### 3. Access & permissions (`iaccess`)
- Read-only presentation of current code's `PERMISSIONS` map and current authenticated team role.
- Explains researcher, employer-verifier and administrator capabilities and links to the existing action screens.
- It **cannot create users, change roles, grant permissions or bypass server API checks**.
- Administrator account provisioning is outside this slice because the current repository does not have a corresponding authorised account-management workflow.

## Protection and scope
- API mode requires the existing `read:review` permission to read dashboard data. Public observers receive a lock notice.
- The offline demo also enforces role selection for these new screens; it does not represent live access.
- Async queue responses are not shown after sign-out.
- Job advertisements are not employer-confirmed vacancies, and signals from Noida are not inferred for West Bengal regions.
- Existing second-person verification approval, audit logging, approved-record publication and source privacy remain unchanged.

## Navigation
- Internal starts at Research overview, followed by Data quality, Market signals and Government data on mobile; additional views are under More.
- Desktop retains all Internal pages.
- Charts and bars are native HTML/CSS using the existing design system, icons and vector art.

## Tests
- `test/research-ops.test.js`: source-safe denominators, missingness, no inferred vacancies, overlapping queues.
- `test/e2e/ui.test.mjs`: unauthorised/authorised dashboard, data-quality filters, role matrix, existing review queue.
- CI: typecheck, unit tests, PostgreSQL integration and Chromium browser acceptance.

## Not included
Scheduled background ingestion, new user provisioning, new employer or government feeds, multi-tenant data storage, candidate PII and external outreach. These need separately reviewed backend features.
