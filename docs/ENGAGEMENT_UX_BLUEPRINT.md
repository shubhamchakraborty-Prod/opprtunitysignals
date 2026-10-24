# Opportunity Explorer — Human-Centred Engagement UX

**Decision:** Use the familiar ease of consumer social apps while optimising for **useful completed decisions**, not time spent scrolling. This document is the design and product acceptance contract for all four user experiences. It extends the future-state mock, not the live research data model.

## 1. Core principle

**The user should understand the next useful action within five seconds.** The interface presents **one primary task, three relevant items and a clear reason**, with more detail available when requested. People should feel successful when they leave after completing a task; they should never need to keep checking the app to avoid losing progress.

Borrow from consumer apps:
- Familiar, scannable, one-idea-per-card content;
- Personal relevance determined by the user's **explicit** goal, not hidden vulnerability or attention profiling;
- Immediate, honest feedback after saving or completing a meaningful action;
- A simple, stable home tab and resumable progress;
- Optional, scheduled updates only when fresh evidence matters;
- Strong search, filters, a useful map and “Not relevant” feedback;
- Small, actionable journeys instead of sprawling forms.

**Do not borrow:** infinite scroll, variable-reward bait, manufactured urgency, deceptive notification badges, public popularity rankings for learners, shame-based daily streaks, confusing dismissal, emotionally manipulative copy, fake engagement, punitive countdowns or engagement-optimising A/B tests on young users.

## 2. Design north star — the five-second test

A new or returning user should immediately know:
1. **Where am I?** “My opportunities”, “Demand for our courses”, “Training partners” or “Research to verify”.
2. **Why am I seeing this?** Programme, chosen role, region, source confidence, time window.
3. **What should I do?** A single verb: “Check requirements”, “Plan outreach”, “Review evidence”, “Validate course”.
4. **What is true?** Distinguish a public advertisement, employer-confirmed vacancy, industry announcement and hypothetical projection.
5. **What happens when I tap?** Clear CTA, no unexpected application or disclosure of personal information.

Use progressive disclosure: first the answer, then explanation, then source/evidence details. Show at most three primary choices on a phone without needing to scroll. Do not hide essential limitations under collapsed content.

## 3. First-screen design by audience

| Persona | Opening question | Above the fold | Meaningful feedback |
|---|---|---|---|
| Learner (ITI / diploma / degree / continuing) | “What can I do next?” | Three relevant role/opportunity examples, one skill to develop, verified/not verified status, location and next action | Saved role, completed profile, submitted project, genuine application route visited |
| Institution / placement officer | “What should we teach or check this week?” | Three evidence-backed role trends, skills to review, employers to verify, cohort relevance | Source reviewed, outreach planned, requirements validated |
| Employer / industry | “Where could I find or build the capability I need?” | Role creator, three relevant institution options, evidence on courses and capacity | Requirement draft saved, institute contacted outside the platform, partnership request actually sent (only with backend) |
| Internal researcher | “What needs attention now?” | Three highest-priority provenance tasks, source reliability, missingness and approved-confirmed counts | Evidence reviewed, duplicate resolved, employer check completed, independently approved record |

All four must consume the **same canonical evidence identities**. A source's confidence/status cannot change merely because a learner sees a simpler card.

## 4. The purposeful engagement loop

1. **User chooses a goal:** Find a job, plan courses, find talent, validate evidence.
2. **Platform offers at most three relevant records:** Rank by explicit role/task relevance, independent verification, recentness and geography; deduplicate mirrors.
3. **Trust is obvious:** “Verified by employer”, “Seen online; not confirmed”, “Future project—no current opening”, and a short confidence label; source details one tap away.
4. **User takes one meaningful action:** Save, check evidence, begin a verified application, plan outreach, or dismiss.
5. **Platform records task progress honestly:** “2 source records reviewed”, not “2 jobs secured.”
6. **End state:** “You’re caught up with what you chose to see.” Further exploration is optional and intentional.

### Proof-of-concept in PR #7

The future-state demo now starts with a role-specific **What matters to you today?** briefing:
- three finite updates; one primary CTA each;
- reasons for recommendation;
- save/un-save for **this browser session**;
- Not relevant / Restore controls;
- simple count of *examples opened*, not a measured skill-gain or job outcome;
- explicit “No endless scrolling or fake alerts.”
- full map, sources, and confidence breakdown still below the brief;
- all data remain synthetic, with no live API calls, accounts, behavioural profiling or record mutations.

## 5. Easy-language patterns

Replace bureaucratic or technical phrases at the user's level:

| Internal term | Learner-friendly phrasing |
|---|---|
| Labour-market signal | “A sign of work in this field” |
| Employer-confirmed opening | “The employer told us this opening is available” (only when independently approved and currently valid) |
| Unverified public listing | “Seen online. We haven't confirmed if it's still open.” |
| Claim confidence 74/100 | “Evidence strength: High · Why?” |
| Supply estimate | “Training programmes nearby; actual seats not confirmed” |
| Skill gap | “Skills this role may need that are not in your current profile” |
| Future project | “A possible future development — not a job opening” |
| Eligible candidate | “You may meet some requirements. The employer makes the final decision.” |

Do not expose NSQF labels to learners. Preserve original source detail in expandable evidence explanations.

## 6. Responsible personalisation

**Inputs allowed by default:** explicit persona, qualification, preferred sector/role, area, accessibility/language setting, displayed task, consented activity such as saved items.

**Inputs not required:** religion, caste, sensitive health/disability, phone contacts, social-media friends, hidden browsing patterns, inferred fear or anxiety, demographic desirability or intrusive profiling. Do not use inferred protected traits to rank hiring or employment recommendations.

**Ranking rule:** First filter by factual eligibility and verified scope where available, then user choice and relevance, then freshness and evidence quality. Keep source confidence and verification as separate dimensions. Make recommendation explanations visible and provide “Not relevant”, edit profile and reset.

**Cold start:** 1–3 questions maximum before first result: “Are you a learner, institution, employer or researcher?”, “What are you interested in?”, “Which area?”. Do not require identity documents to browse public, nonsensitive intelligence. Identity/consent required for restricted actions.

## 7. Gamification restricted to real progress

Appropriate:
- “Profile ready for tailored suggestions” once essential preferences saved;
- “First verified source checked” for authorised researchers;
- “3/3 chosen tasks done” after explicit actions;
- Celebrations for actual course/project/assessment completion with opt-out;
- A progress bar for a named goal, not an indefinite experience bar.

Not appropriate:
- “Your streak ends tonight” pressure or guilt;
- Fake achievement for opening a passive ad;
- Leaderboards ranking learner employability;
- Mystery loot-box outcomes, unpredictable rewards, fake social proof;
- “X people are applying right now” without verified source;
- Scarcity cues not grounded in employer-confirmed deadlines.

## 8. Notification policy

Launch with **no push notifications by default**. Users may opt into a *daily or weekly* digest for a saved role/region. Each alert must answer: what changed, why relevant, evidence type/confidence, freshness, and one clear action. Provide snooze, unsubscribe and frequency controls; quiet hours, caps and no repeated alerts when no material change. No invented "live" numbers or activity indicators.

Suggested default UX: non-pushy “Since your last visit: 2 **new source-checked postings**” if the system has actual event history. Never call a modelled future posting “just added”.

## 9. Accessible, low-friction design

- Consistent navigation per audience; fixed location of Help, Back, Saved, and filters.
- Phone-first 360–430 px with clear touch targets; scalable typography, good contrast and one-column reading.
- Limit information hierarchy to two levels: summary → explanation/evidence.
- Tap, keyboard and screen-reader interactions; avoid hover-only affordances.
- Plain English first; Hindi/Bengali and other regional language expansion backed by reviewed translations.
- Slow Android / unstable network: cache non-sensitive public views, save small drafts locally with clear limits, make retryable error states.
- Map must have a text-list equivalent and location-precision caveats.
- Avoid motion where unnecessary; support reduced motion, explicit animation controls.
- Follow WCAG 2.2 AA and test with users, including low digital literacy and assistive-tech users.

## 10. Microcopy examples — one actionable item

Learner:
- Heading: **“This role could match what you studied.”**
- Meta: “Electrical maintenance · Sector 63 · Seen online, not yet confirmed”
- Why: “Shown because you selected Electrician trade and Noida.”
- Action: **“Check requirements”**; secondary **“Save”**; tertiary **“Not relevant”**

Institute:
- Heading: **“Employers are mentioning PLC basics.”**
- Meta: “5 distinct adverts in our sample · Location confidence: Medium”
- Why: “Related to your Electronics programme.”
- Action: **“Review sources”**; secondary **“Plan a call”**

Employer:
- Heading: **“Two local institutions list relevant courses.”**
- Meta: “Programme matches, not verified pass-out capacity”
- Action: **“Compare programmes”**; secondary **“Save partnership idea”**

Researcher:
- Heading: **“This social hiring claim needs independent verification.”**
- Meta: “Unconfirmed social post · Evidence confidence: Low”
- Action: **“Inspect evidence”**; secondary **“Add to review queue”** only through authorised API.

## 11. Metrics and evidence of success

Measure *task success*, not addiction:
- First task comprehension within 5–10 seconds in moderated usability tests.
- Time to first **useful** action (not time in app), with explicit user consent for telemetry.
- % of users who can distinguish job ad from employer-confirmed opening.
- % successfully locating the source/why panel.
- Task completion by persona and programme, without profiling protected traits.
- False alerts, misinterpreted confidence levels, source-unclear reports, exits due to overload.
- Quality of optional return visits (saved job checked / institute follow-up completed), not raw DAU/scroll depth as sole KPIs.

**Proposed initial acceptance targets (to validate, not proven outcomes):** 80%+ of tested first-time users identify the next task in 10 seconds; 90%+ correctly distinguish unverified listings from confirmed openings; 80%+ reach the evidence reason without help; 0 critical privacy/consent errors.

### Evaluation protocol

Use five to eight participants from each of the four groups to *diagnose initial usability issues*, then a larger follow-up sample for quantitative thresholds. Include a mix of age, digital literacy, language, screen size, urban/rural background. Report uncertainties; don't claim statistically representative findings from a small qualitative test.

## 12. Rollout and engineering acceptance

| Stage | Work | Completion gate |
|---|---|---|
| A — Demo proof | Role-based three-card briefing, one CTA, Save, Not relevant, Why, session progress | Implemented on synthetic demo data; E2E checks |
| B — Real experience architecture | Reorder four home screens into goal → 3 insights → action → detail hierarchy | Device testing, no impact on underlying evidence rules |
| C — Actual saved & preference data | Authenticated role/region preferences, consented saved items, source change records | Encrypted storage, authorised backend, deletion/portability |
| D — Updates/digests | Explicit opt-in with accurate change detection, unsubscribe and quiet hours | Freshness audit, anti-spam review |
| E — Contextual learning | Short role explorations, assessments and path completion | Measured completion, avoid gamified labour/hiring promises |
| F — Evidence-first personalisation | Stable explanations, diverse non-manipulative recommendations and coverage checks | Audit fairness, recommendation errors, stakeholder feedback |

Technical reference: `src/core/demo-brief.js`, `web/src/views/future-state-brief.js` and existing simulated demo module. The live application must keep `src/core/analytics.js`, `src/core/rbac.js`, `src/core/schema.js` as the source of truth.

## 13. Research basis

- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) — show frequent, essential options first and secondary controls on request.
- [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/) — perceive, operate, understand, and access consistent interaction patterns.

**Product acceptance statement:** The user should return because the platform repeatedly helps them make a better education or employment decision—not because it makes them feel compelled to check it.
