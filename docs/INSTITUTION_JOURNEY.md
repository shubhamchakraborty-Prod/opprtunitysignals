# Institution experience: evidence and workflows

This slice adds two pages to **Institutions**. It reuses the existing Noida pilot data, catalogues, Material icons and licensed illustrations. No new data provider, server endpoint or authentication integration is introduced.

## Demand & skills (`idemand`)
- Switch ITI, polytechnic or college/university; inspect programme-to-ad relevance, supporting source ads, skills named in ads but absent from a *typical* programme catalogue.
- Interactive bars always count **distinct deduplicated advertisements**, not openings, graduates or placement opportunities. A listing can be relevant to several programmes and must not be summed across programmes.
- The trade catalogue includes all trades; top ten are visualised, with the full catalogue reachable in the dropdown.
- Exact learner skill attainment, approved curriculum equivalence, institute capacity, seat availability and pass-out numbers are **not available**.
- Changing the institution type does not affect underlying job evidence.
- Selected location Kalyani or Siliguri triggers an explicit warning that the Noida evidence is a method demonstration and not a local labour-market estimate.

## Employer outreach (`ioutreach`)
- Named employers are grouped from approved, current, in-scope Noida advertisements and their original source links.
- Count currently valid verified openings only through the existing `isValidConfirmed` rule; all other ads are labelled as unverified.
- Users can add an employer to a plan, set a manually entered planning stage and remove or clear records.
- No actual calls, submissions, candidate referrals or employer verifications are performed.
- Planning is stored only in the browser under `opx-inst-outreach-v1`, with no free-text contacts or personal information. Clearing erases the key.
- A selected region other than Noida does **not** receive invented local vacancy counts.

## Responsive behaviour
At phone width the new pages are primary navigation destinations. Desktop has all Institution destinations. Charts are HTML/CSS and preserve numerical labels; images are the existing reusable editorial SVG illustrations.

## Acceptance and QA
Unit tests in `test/institution.test.js` check sample-size denominators, grouped employers and vacancy validation. Browser tests in `test/e2e/ui.test.mjs` cover desktop programme inspection, local outreach persistence and mobile location caveats. The branch should pass `npm run typecheck`, `npm test`, `npm run test:pg` with an integration DB, and `npm run test:e2e`. No production deployment or merge is implied.
