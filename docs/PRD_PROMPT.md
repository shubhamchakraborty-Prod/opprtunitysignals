# Prompt: write the PRD for the Opportunity Explorer platform

Copy everything below the line into your AI tool. Replace every [BRACKET] first, or leave it and the model will mark it TBD.

---

## 1. Your role

You are a senior product manager who has shipped workforce and edtech platforms used by government bodies in India (DGT, MSDE, NSDC, state skill missions). You think like a Google PM: user first, measurable outcomes, simple navigation, honest data. You write PRDs that engineers, designers and government stakeholders can all act on.

## 2. Task

Write a complete Product Requirements Document (PRD) for **Opportunity Explorer**, a platform by ConveGenius.AI and Swift AI Academy. It connects local job demand with the people and institutions that supply skills.

Before you write, do three things:
1. List the assumptions you are making.
2. List the inputs that are missing, marked [TBD].
3. Ask me up to 5 questions whose answers would change the design. Then continue with your best assumption for each, and do not wait for my answers.

## 3. Product context

| Item | Detail |
|---|---|
| Owner | ConveGenius.AI (research and data); Swift AI Academy (learning platform: AI/ML, Business Data Analyst and Workplace Communication pathways) |
| Pilot geography | Noida Sectors 62 and 63 (Gautam Buddh Nagar, UP), with a 100 km radius; Kalyani and Siliguri (West Bengal) as comparison regions. [Add or change regions] |
| Problem | Learners do not know which local jobs fit them or what to learn. Institutions teach without demand data. Employers cannot find trained people nearby. Swift AI Academy does not know which courses the market needs. |
| Data available today | Public job ads (with verification status), ITI trade catalogue (103 CTS trades), diploma and degree programme skills (illustrative), announced investments and projects (2016 to 2026), government indicators (PLFS, India Skills Report), institutes within 100 km, apply portals (NCS, NAPS, NATS, PM Internship, state portals), provider course scan (NSQF/NQR, NPTEL, SWAYAM, nasscom FutureSkills Prime, Skill India Digital Hub) |
| Data not available yet | Employer-confirmed vacancies at scale, pass-outs by trade and branch, learner outcomes, consented worker interviews, live government APIs (keys and data-sharing agreements pending) |
| Existing prototype | A working demo with four interfaces exists. Treat it as a reference, not a constraint. State what to keep and what to change. |
| Brand and design | Material 3 design system, Google Sans, ConveGenius.AI logo. Light theme. Mobile first for learners. |

## 4. Users and modes

The platform has **four modes**. Each mode is a separate interface with its own navigation, home screen, language and permissions. A user picks a mode at sign-up; some people hold more than one (for example, a training officer who is also a researcher).

| Mode | Users inside the mode | Core question |
|---|---|---|
| Learner | ITI trainees and pass-outs; polytechnic (diploma) students; college (degree) students and graduates; [optional: Class 10/12 pass, working adults upskilling] | "What job can I get near me, and what should I learn to get a better one?" |
| Institution | ITI principal, training officer, placement officer; polytechnic and college placement cell, HoD, nodal officer | "Do our trades and programmes match demand, and how do we place our learners?" |
| Industry | HR or talent lead, plant or site head, MSME owner, industry association | "Where can I find trained people near my site, and how do I close their skill gaps?" |
| Internal | Swift AI Academy product, BD and content teams; ConveGenius research operations; platform admins | "What should we build, sell and verify next?" |

For **every** mode, write the sections in section 6 below. Learners must be split into ITI, polytechnic and college wherever their needs differ (eligibility, apply routes, roles, skill plans, language and device).

## 5. What each mode must contain (minimum)

Use this as the floor. Add anything a real user would expect; remove nothing without saying why.

### 5.1 Learner mode

| Area | Must include |
|---|---|
| Onboarding | Choose learner type (ITI, polytechnic, college), trade or programme, year, location, preferred language (Hindi, English, Bengali), job preferences (relocation, shifts). Under 2 minutes. Consent screen in plain language (DPDP Act 2023). |
| Home | Personal next steps (apply, learn, register), with counts that update as the profile changes |
| Opportunities | Jobs, apprenticeships and internships near me that accept my qualification. Filters: distance, pay, fresher-friendly, shift, verified only. Each card shows a trust label (seen online, employer confirmed, old). |
| Opportunity detail | Pay, requirements, eligibility check against my profile (eligible, eligible after a course, not eligible), working conditions, how to apply, original source link |
| Skill gap and plan | Skills I have vs skills employers ask for; a ranked plan of courses (Swift AI Academy first, free alternatives listed); hours, language, cost, certificate, NSQF level |
| Where to apply | Portals by learner type: NCS, NAPS (ITI), NATS (diploma and degree), PM Internship, AICTE internships, UP Sewayojan, WB Employment Bank, rozgar melas; eligibility, stipend, steps, "never pay to apply" warning |
| Coming up | Announced factories and projects nearby and the skills they will need |
| Progress | Applications tracker, courses in progress, certificates, readiness score |
| Help | Plain-language glossary, contact the placement cell, WhatsApp or SMS alerts [confirm channel] |
| Differences by type | ITI: trade-based matching, NAPS, shop-floor roles, Hindi first, low-end Android. Polytechnic: diploma roles (supervisor, QC, MIS), NATS, lateral entry. College: graduate roles, AI and data pathways, internships, interview prep. |

### 5.2 Institution mode

| Area | Must include |
|---|---|
| Onboarding | Institute type, name (from AISHE, NCVT MIS or AICTE list), trades or branches offered, intake and pass-outs per year, staff roles and access |
| Home | Demand vs supply for each trade or branch within the chosen radius; the 3 actions with the most impact this month |
| Demand by trade or programme | Ads, verified openings, fresher share, pay, top extra skills asked for, trend over time |
| Curriculum and add-on courses | Skill gaps across the batch; suggested add-on modules (Swift AI Academy and NSQF short courses) with hours and timetable fit |
| Placement pipeline | Employers to contact, drives and rozgar melas, MoUs, apprenticeship seat matching, status of each learner |
| Cohort view | Learners enrolled, readiness, courses completed, placed, apprentices; exports for DGT, state directorate or NAAC/NBA reporting |
| Market and region | 10-year history, investments, projects coming up, peer institutes nearby and benchmarks |
| Partnership | What Swift AI Academy offers the institute; how to sign up a batch |

### 5.3 Industry mode

Employers do **not** need job ads. They need talent supply.

| Area | Must include |
|---|---|
| Onboarding | Company, site location, sector, roles hired each year, apprenticeship status (registered on NAPS or NATS or not) |
| Home | Talent available within the chosen radius for my roles; institutes to partner with; upcoming batches |
| Talent supply | Institutes by trade or branch, intake and pass-outs (when available), batch completion months, distance |
| Hire for a role | Role profile (skills, level); best-fit backgrounds (ITI trades, diplomas, degrees) with skill coverage; gaps; local pay benchmark; where to recruit |
| Candidate pipeline | Consented, anonymised learner profiles with readiness scores; shortlist, interview, offer; only with learner consent |
| Pre-hire training | Custom bootcamps by Swift AI Academy for the shortlist; duration, cost [TBD], outcomes |
| Apprentices and interns | NAPS, NATS and PM Internship from the employer side: eligibility, government support, registration steps |
| Post a hiring need | Role, number, location, start date, pay range; routed to matching institutes; verified employer badge |
| Market and competition | Who else is investing and hiring nearby; wage pressure |

### 5.4 Internal mode

| Area | Must include |
|---|---|
| Market signals | Skills employers ask for vs our catalogue vs other providers; build, extend, curate or promote decisions; split by learner type and region |
| Course roadmap | Backlog of course ideas with evidence, priority score and owner |
| Partner pipeline | Institutions and employers as leads; stage, owner, next step (CRM-lite or integrate [CRM name]) |
| Learner funnel | Sign-ups, profile complete, plan started, course completed, applied, placed; by mode, type and region |
| Data operations | Ingestion of job ads (CSV, licensed feeds), deduplication, employer verification calls, second-person approval, audit log, source health |
| Government data | API status and live feeds (PLFS, data.gov.in, NCS, NCVT MIS, e-Shram, EPFO, Udyam) once keys and agreements exist |
| Admin | Users, roles, permissions, regions, content and copy management |

## 6. Sections the PRD must have

Write each section. Use tables wherever there is structured information.

1. **Summary**: one paragraph, plus the 3 outcomes this release commits to.
2. **Problem and evidence**: per mode, with data points and their source and date.
3. **Goals and non-goals**: measurable goals; explicit non-goals.
4. **Personas**: at least 8 (3 learner types, 2 institution roles, 2 industry roles, 1 internal). Each has: context, device, language, goals, frustrations, a quote.
5. **Jobs to be done**: per persona, written "When ..., I want to ..., so I can ...".
6. **Information architecture**: mode switcher, navigation per mode (max 5 primary items on mobile), home screen per mode, a sitemap table, and shared vs mode-only screens.
7. **Functional requirements**: per mode, screen by screen. For each screen: purpose, entry points, components, fields, data source, empty state, error state, loading state, permissions. Number them (LRN-01, INS-01, IND-01, INT-01).
8. **User flows**: at least 2 per mode, as numbered steps (for example: ITI learner signs up and applies for an apprenticeship; employer posts a need and gets a shortlist).
9. **Data model**: entities (Learner, Institution, Programme or Trade, Employer, Opportunity, Skill, Course, Provider offering, Project or Announcement, Signal, Verification, Consent), key fields, relationships, and which taxonomy each skill maps to (NSQF QP or NOS, NCO-2015, CTS trade).
10. **Data sources and integrations**: source, owner, access (open API, key, agreement), refresh rate, licence, fallback when unavailable.
11. **Trust and evidence rules**: verification statuses; what counts as a confirmed opening; how simulated or demo data is labelled; how inferences are marked; how stale data is handled.
12. **Matching and scoring logic**: eligibility rules, skill coverage, readiness score, priority score for course decisions; explain each formula in plain words.
13. **Privacy, consent and security**: DPDP Act 2023, consent flows for learner data shared with employers, data minimisation, retention, RBAC per mode, audit.
14. **Non-functional requirements**: performance on 3G and low-end Android, offline behaviour, accessibility (WCAG 2.2 AA), languages, uptime, scale targets.
15. **Design principles**: Material 3; Don Norman (discoverability, signifiers, mapping, feedback, constraints, error tolerance); one primary action per screen; plain words.
16. **Metrics**: HEART per mode with goals, signals and metrics; north-star metric for the platform.
17. **Release plan**: MVP vs v2 vs later, using MoSCoW per requirement; pilot regions and timeline [dates].
18. **Risks, dependencies and assumptions**: with owner and mitigation.
19. **Open questions**: numbered, with who decides.
20. **Acceptance criteria**: Given / When / Then for every Must-have requirement.
21. **Appendix**: glossary (NSQF, NAPS, NATS, CTS, NCO, QP, PLFS and others), competitor and reference scan (NCS, Skill India Digital Hub, Apna, Naukri, LinkedIn, FutureSkills Prime).

## 7. Rules for the writing

- Use Indian English and Indian number format (lakh, crore).
- Do not use em dashes. Use hyphens or commas.
- Use tables over paragraphs for anything structured.
- Never invent numbers. If a figure is needed but not given, write [TBD: source].
- Label every inference as an inference, and every demo or simulated element as a simulation.
- Keep each requirement testable. One requirement, one ID.
- Write for a mixed audience: engineers, designers, government officials.

## 8. Quality check before you finish

Score each item 1 (yes) or 0 (no) and show the table. Fix every 0 before you hand over.

| # | Check |
|---|---|
| 1 | All four modes have a home screen, navigation and screen-level requirements |
| 2 | Learner requirements are split by ITI, polytechnic and college where needs differ |
| 3 | Industry mode is about talent supply, not job ads |
| 4 | Every screen has empty, error and loading states |
| 5 | Every data point has a source, or is marked [TBD] |
| 6 | Consent is required before any learner data reaches an employer |
| 7 | Simulated and unverified data are labelled as such |
| 8 | Every Must-have has Given / When / Then acceptance criteria |
| 9 | Metrics exist for each mode (HEART) and for the platform (north star) |
| 10 | MVP scope fits [team size] and [timeline] |
| 11 | No em dashes; Indian number format used |
| 12 | Open questions name who decides |

## 9. Output format

A single Markdown document with numbered headings matching section 6, a table of contents at the top, and requirement IDs that are unique across the document. Length: as long as needed to be complete, with no padding.
