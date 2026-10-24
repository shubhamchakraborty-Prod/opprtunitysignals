# What is real, illustrative, or dependent on approved access

## Real (source facts, 16 Oct 2026 snapshot)

| Item | Basis |
|---|---|
| 18 records: employer and role names, advertised pay, experience, education where stated | Transcribed from public pages by the v0 curator |
| Source URLs | Public pages; some are category or search pages, not individual posts |
| Publication date of SIG-013 (11 Sep 2026) | Stated on the listing |
| "5 openings" on SIG-014 | Advertiser's claim; not verified |

## Captured from search results only (16 Oct 2026)

| Item | Note |
|---|---|
| SIG-019 to SIG-033 (JobHai, PlacementIndia, WorkIndia, TeamLease, Indeed, Macgence, Vehant) | Fields transcribed from search-result text. The listing pages could not be opened from the capture environment. Each has an open review flag; open the page and confirm before outreach. |
| Kalyani and Siliguri | No current ITI-level job ads found. Industry presence comes from WBIIDC, MSME and SJDA documents, some of them old (dated per item). |
| Social media | Public LinkedIn posts searched; only old IT posts found. No private groups or closed accounts were searched. |

## Captured from search results (24 Oct 2026)

| Item | Note |
|---|---|
| Provider scan (61 courses) | Titles, NSQF levels and costs from search snippets; some links are aggregator pages (Careers360, Class Central). Check the provider page before use. |
| Timeline and future projects | Amounts and job numbers are as announced; summit figures are MoU totals, not investment made. |
| Demand indicators | National PLFS and India Skills Report figures are solid; state and city figures are thin and partly from secondary sites. |
| Institutes and apply routes | A starting list, not a census. Stipends change; PM Internship sources conflict. Most map positions are approximate. |

## Simulated (labelled SIMULATION in the app)

| Item | Note |
|---|---|
| Government data live panel | Every number, event and connection status in the top panel is generated in the browser from a fixed seed, to show how live feeds would look. The real source status is shown below it. |

## Inferred (labelled as inference in the app)

| Item | Note |
|---|---|
| Canonical occupation and occupation group | Curator mapping; NCO-2015 codes not yet assigned |
| ITI trade relevance (e.g. Lathe operator → Turner / Machinist) | Rule-based suggestion for outreach priority only |
| Normalised skill names | Curated from adverts, not verbatim |
| SIG-018 post date (c. 24 Feb 2026) | Derived from the LinkedIn activity ID, not read from the page |
| Sector for Apna / Indeed records | Portal category or search label only; workplace may be nearby |

## Illustrative (not evidence)

| Item | Replace with |
|---|---|
| Five learner profiles (Electronics Mechanic, Fitter, Machinist, COPA, Class 12) | Authorised, aggregate ITI capability inventories, with approval |
| Sector circles and schematic shapes | Approved boundary data if an official source is licensed |
| Pin positions within a sector | Verified geocodes (square pins) recorded through employer verification |
| Kalyani and Siliguri pin positions | Surveyed addresses from WBIIDC allotment records |
| ITI trade list and core skills | Current DGT trade list and syllabus (bharatskills.gov.in) |
| Course suggestions | Confirmed course listings with dates and fees from Skill India Digital Hub, NSTIs and Sector Skill Councils |
| Swift AI Academy skill map and market-signal actions | Curated mapping and fixed rules; review with the product team when the catalogue changes |
| Platform signals on the Internal view | Inferences from the ad sample, each with its evidence |
| Trades linked to announced projects | Hiring plans confirmed by each company |
| Synthetic test fixtures (`test/helpers.js`, `fixture: true`) | Never shown in the app; tests only |

## Not available yet (shown as "Not available" or empty, never estimated)

| Output | Missing input | Who can provide |
|---|---|---|
| Employer-confirmed openings | Employer calls or visits, with consent basis and second-person approval | Employer verifier + administrator |
| Demand coverage ratio | Expected ITI pass-outs by trade for Gautam Buddh Nagar | DGT / state directorate / ITI principals, under a data-sharing approval |
| Worker and employer sentiment | Consented, attributed interviews | Research team with informed-consent protocol |
| Requirement trends | A second comparable capture wave (same sources, both sectors, 10+ records each) | Researcher, next capture round |
| Verified address layer | Employer-confirmed addresses checked against coordinates | Employer verifier |

## Dependent on approved access or decisions

| Item | Status |
|---|---|
| Portal connectors (Apna, Indeed, LinkedIn, Naukri, NCS) | Not built. Only with licence or written permission; no scraping, no gated or private social accounts, rate limits respected |
| Production authentication | Dev bearer tokens only; replace with organisational SSO |
| Hosting and data-protection review (DPDP Act 2023) | Required before collecting interview or contact data at scale |
| Street map tiles | OpenFreeMap by default; a production deployment should use a keyed provider (MapTiler, Stadia Maps, Thunderforest) or its own tiles. See `docs/MAPS.md` |
| Official boundaries | Not available; circles are approximate guides |
