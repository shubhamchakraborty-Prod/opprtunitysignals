# Noida Sector 62 / 63 opportunity explorer

## Run it

Open `index.html` in a web browser. This is a static, self-contained interactive prototype with embedded seed data and the supplied ConveGenius.AI brand logo. The street map attempts to load OpenStreetMap / Leaflet over the internet; when unavailable, a clearly labelled schematic map with working dots is used instead.

Use the **Explore opportunities** tab to filter by sector, occupation and experience, select a clickable dot or job, read the evidence, save a local shortlist and export a filtered CSV. The **Compare 62 vs 63** tab displays the mix within this small sample only. **Who could fit?** shows a simplified skills-overlap demonstration. **Source register** opens the original postings.

## What is real, and what is not

- **Real:** employer and role names, sector, advertised salary or experience where shown, and source links from public pages inspected on **16 October 2026**.
- **Curated or inferred:** some normalized skill names and illustrative learner-profile skill inventories. The app distinguishes them from direct listing claims.
- **Not verified:** whether any role remains open, employer-confirmed headcount, applicant eligibility, 5-year trends, exact premises coordinates and worker sentiment.
- **Counts:** 17 non-historical role listings are shown by default, plus one older historical recruiting post behind the 'Include older signals' filter. Counts are **sample records**, not live vacancies or total local jobs.
- **Geography:** locations on the interactive map are *illustrative sector-level dots*, not geocoded workplace premises. Sector centres are approximate. The city map at [Maps of India](https://www.mapsofindia.com/maps/uttarpradesh/noida-city-map.htm) was used only as a geographic reference and is not reproduced.
- **Source aggregators:** job pages may change, include expired posts, or return adjacent sectors. Re-check the individual source before citing it for official decisions.

## Key files

- `index.html` - interactive application (brand image and records embedded)
- `signals.json` - machine-readable source snapshot
- `convegenius-logo.png` - exact supplied original logo
- `CLAUDE_CONTINUE.md` - engineering brief for the next build
- `preview.png` - QA screenshot of schematic fallback

## Recommended data workflow

Collect public signals -> classify by exact sector/role/industry -> deduplicate -> record link and date -> confirm with employer -> use confirmed openings for institutional planning -> reconcile with training supply, learners' preferences and downstream joining/retention outcomes.

This design is adapted from ConveGenius.AI's West Bengal PM SETU Strategic Investment Plan, especially its proposed cluster labour market intelligence intervention. It is not an authorised official government programme.
