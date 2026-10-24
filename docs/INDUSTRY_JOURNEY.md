# Industry experience: institution supply, role evidence and partnership planning

This code batch extends **Industry** in Opportunity Explorer using the existing Material/ConveGenius assets, vanilla JavaScript architecture, Node API and source-backed Noida research pilot.

## Screens
- **Talent overview:** gives an honest overview of institutions in the research list, not the number of students available to hire. Links to the supply explorer.
- **Institution supply (`isupply`):** explore grouped training programme keywords; view listed institutions by location and course; search, select a pool, inspect original institute websites where present, or begin a partnership plan. Counts are listed institutions, not official coverage or graduates.
- **Match role & skills (`hire`):** compares curated typical programme and trade skill lists to the selected role's requirements. Charts show coverage of named role skills, not actual learner competence, formal eligibility, or employability. Noida job advertisement evidence has source links and scope; when a user selects Kalyani or Siliguri, comparable vacancy and pay estimates are unavailable rather than borrowed from Noida.
- **Partnership plans (`partner`):** browser-only plan with role, institution, target month, indicative count, partnership purpose and stage. No emails, calls, candidate requests, introductions, personal records or real external submissions occur. Users can update, remove or clear locally stored drafts.

## Research guardrails
1. Institute lists come from the seed research file, not a live enrolment dataset.
2. Programme matching is heuristic from typical skill catalogues and institute course descriptions. It is not an agreement or confirmation that seats are available.
3. Noida public advertisements are not verified vacancies. Employer-confirmed openings have an independent evidence definition.
4. Noida counts and pay are *never* presented as regional labour-market estimates for Kalyani or Siliguri.
5. A request saved on this device is not sent to an employer or institution. Explicit integration and approval would be required for a production partnership workflow.
6. A generic programme-to-role relevance percentage cannot establish an individual candidate's eligibility.

## Design system and interaction
Mobile offers four direct Industry destinations (Talent overview, Institution supply, Match role & skills, Partnership plans) plus a More menu for Apprentices and Market. Desktop displays all tabs. Native responsive HTML/CSS charts, Material icons and existing photorealistic/editorial SVG illustrations are reused. Screens do not depend on rasterised screenshots or invented labour market data.

## Automated tests
- `test/industry.test.js`: source boundaries, local institute counts, role evidence, planning validation and stage allowlist.
- `test/e2e/ui.test.mjs`: desktop source lists and regional warnings, mobile shortlist creation, local persistence, status updates and erasure.
- GitHub Actions: typecheck, unit tests, PostgreSQL integration and Chromium browser E2E.

## Limitations for the next iteration
Real employer and institution authentication, opt-in communication, authoritative enrolment or pass-out records, capacity and application management remain to be designed and integrated. All user-visible forecasts or live hiring decisions require independently sourced evidence.
