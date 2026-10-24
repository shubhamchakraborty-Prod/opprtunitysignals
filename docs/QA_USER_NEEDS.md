# QA: what each user needs, and what the site gave them (24 Oct 2026)

Method: for each user type we list the questions they arrive with and score the version before this change (commit 185eee0) 1 if a page answered the question, 0 if not. "Blocked" means the data does not exist yet; the site must say so rather than guess.

## Learners

### ITI learner (16 to 22, often Hindi-first, on a phone)

| # | Needs to know | Before | Change |
|---|---|---|---|
| 1 | Jobs near me that accept my trade, open to freshers | 1 | Kept; filtered by the learner's own trade |
| 2 | Pay, shift and working conditions | 1 | Kept |
| 3 | Where and how to apply (NCS, state portal, rozgar mela) | 1 | Kept |
| 4 | Apprenticeship (NAPS) and stipend | 1 | Kept |
| 5 | Which skills to add, and a short, low-cost course for each | 1 | Kept |
| 6 | Jobs outside my trade I can reach with a short course | 1 | Kept |
| 7 | Choose "who I am" once and have every page follow | 0 | **Added**: profile bar (type + trade, remembered) |
| 8 | Plain words, works on a phone | 1 | Kept; learner interface uses larger type and cards |
| 9 | Factories coming up that will hire | 1 | Kept |
| 10 | Hindi interface | 0 | Not in this release; listed as a platform signal |

### Polytechnic (diploma) learner

| # | Needs to know | Before | Change |
|---|---|---|---|
| 1 | Jobs that accept a diploma | 1 | Kept |
| 2 | A skill plan for my branch (mechanical, electrical, electronics, computer, civil) | 0 | **Added**: diploma branches with core skills |
| 3 | NATS apprenticeship and stipend | 1 | Kept |
| 4 | Supervisor, quality and MIS roles and the skills they ask for | 0 | **Added** through the branch skill plan |
| 5 | Institutes nearby | 1 | Kept |

### College (degree) learner

| # | Needs to know | Before | Change |
|---|---|---|---|
| 1 | Graduate roles near me | 1 | Kept |
| 2 | A skill plan for my degree (B.Tech, BCA, B.Com, BBA, BA, B.Sc) | 0 | **Added**: degree programmes with core skills |
| 3 | Internships (AICTE, PM Internship) | 1 | Kept |
| 4 | What is growing nationally (AI, data) | 1 | Kept in the learner "Coming up" page |
| 5 | Swift AI Academy pathways and the roles they lead to | 1 | Kept |

## Institutions

| # | Needs to know (principal, training and placement officer) | Before | Change |
|---|---|---|---|
| 1 | Demand for each ITI trade nearby | 1 | Kept |
| 2 | Demand for diploma branches and degree programmes | 0 | **Added**: programme demand table |
| 3 | Skills to add to the curriculum | 1 | Kept |
| 4 | Employers to call for placements | 1 | Kept |
| 5 | Projects coming up nearby, for MoUs and apprenticeships | 1 | Kept |
| 6 | Peer institutes nearby | 1 | Kept |
| 7 | Pass-outs vs demand | Blocked | Still shown as "Not available yet" with what is needed |
| 8 | One overview page for my type of institute | 0 | **Added**: Institution overview with type selector |
| 9 | What Swift AI Academy offers my institute | 1 | Kept |

## Industry (HR, plant manager, talent acquisition)

| # | Needs to know | Before | Change |
|---|---|---|---|
| 1 | Where the talent for my roles is trained, within 100 km | 0 | **Added**: Talent near you |
| 2 | What a fresh ITI, diploma or degree hire already knows, and the gaps | 0 | **Added**: Hire for a role |
| 3 | How to close the gap before day one (custom training) | 0 | **Added**: Swift AI Academy course per gap |
| 4 | Apprentice and intern schemes for employers, with government support | 0 | **Added**: Apprentices and interns |
| 5 | Pay others offer for the role nearby | 0 | **Added**: pay range from local ads |
| 6 | How many will graduate | Blocked | Shown as "Not available yet" with the source needed |
| 7 | Who else is investing and hiring nearby | 1 | Kept (Market and competition) |
| 8 | A way to ask for candidates | 0 | **Added**: hiring request (demo, stays in the browser) |
| 9 | Job ads | Shown | **Removed** from the industry interface; employers post jobs, they do not look for them |

## Internal (Swift AI Academy team)

| # | Needs to know | Before | Change |
|---|---|---|---|
| 1 | Demand vs our catalogue vs other providers | 1 | Kept |
| 2 | Demand for each of our courses | 1 | Kept |
| 3 | Platform signals | 1 | Kept |
| 4 | Demand split by learner type (ITI, diploma, degree) | 0 | **Added** |
| 5 | Who to approach: institutes (channel) and employers (hiring partners) | 0 | **Added**: partner leads |
| 6 | Government data feeds, sources, research operations | 1 | Kept |

## Score

| User | Before | After |
|---|---|---|
| ITI learner | 8/10 | 9/10 (Hindi pending) |
| Polytechnic learner | 3/5 | 5/5 |
| College learner | 4/5 | 5/5 |
| Institution | 6/8 + 1 blocked | 8/8 + 1 blocked |
| Industry | 1/7 + 1 blocked (+ an unneeded page) | 7/7 + 1 blocked |
| Internal | 4/6 | 6/6 |

## Interface decision

Four separate interfaces chosen with top-level tabs: **Learners · Institutions · Industry · Internal**. Each has its own second row of tabs, its own landing page, its own words ("jobs for me", "placements", "hire") and its own colour. Pages are shared only where the question is the same.
