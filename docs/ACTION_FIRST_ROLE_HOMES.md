# Action-first real home screens — Opportunity Explorer

**Implementation:** `feature/action-first-role-home-v1`, stacked on future-state Purposeful Engagement PR #7.  
**Status:** Engineering feature under review. This changes the *actual* Learner, Institution and Industry home screens, not only the simulated demo.

## Product objective

An individual should answer **What can I do next?** within five seconds of opening their role home. Give at most three meaningful, plain-language options before the existing advanced panels. Make evidence limits understandable at the moment of decision. Support a **user-controlled**, bounded experience: relevant context, a primary action, why, Save, Not relevant, Restore. No false urgency, passive engagement rewards, rankings of people, fabricated activity, infinite-scroll tricks, or hidden behavioural targeting.

## Shared interaction component

`web/src/views/action-first.js` exports `actionFirst({scope,title,lead,context,items})`, a common component driven by existing real view-model data. It renders:
- A brief task-focused heading and provenance disclaimer.
- Up to three cards, each with **one clear action** and a **Why this is shown** disclosure.
- **Save** / unsave and **Not relevant** / restore, **in-memory only** for the current page visit. Not a synced or persisted shortlist, not an actual application or outreach task.
- **Steps explored** counts the click to open a deeper view; it does **not** claim an application, skill improvement, saved source verification, job lead or employer contact.
- Keyboard-focusable buttons, accessible disclosure elements, screen-reader-friendly context note; phone-first single-column cards.

These controls are intentional, not a social media attention maximisation algorithm. They do not collect tracking data or personal information. No timers, gamification streaks, cross-device saves, engagement scores or push notifications.

## Learner home (`lhome`)

| Card | Specific action | Truthful basis |
|---|---|---|
| Explore | See opportunities | Profile's ITI/diploma/degree programme (or visibly default demonstration programme), existing source-backed Noida ad matching |
| Learn | Explore my skill plan | Typical programme vs ad skills, course catalogue; **not** learner skill assessment |
| Apply safely | Where to apply | Existing registration/application-route directory; opening a portal does not submit an application |

Users without consented saved learner profiles see an explicit prompt to set one up; no background personalisation. For Kalyani/Siliguri, job-ad matches are explicitly labelled a **Noida method example**, not local opportunities.

## Institution home (`ihome`)

| Card | Specific action | Truthful basis |
|---|---|---|
| Understand | Explore roles and skills | Noida sample of approved ads and typical programme catalogue, not measured placement demand |
| Improve | Review programme evidence | Candidate skill areas to discuss, not verified syllabus gaps |
| Connect | Plan outreach | Local-browser planning only; saving an employer never contacts that employer |

Institution type selector is unchanged and updates the headline programme/skill context. Kalyani and Siliguri do not receive invented Noida vacancy estimates.

## Industry home (`talent`)

| Card | Specific action | Truthful basis |
|---|---|---|
| Define | Match skills | Role requirements vs typical qualification skills, not individual candidate capability |
| Discover | Explore institutions | Listed local institutes only; not learner headcounts, pass-outs, verified capacity or a census |
| Plan | Plan a partnership | Local-only planning draft, not a submitted demand, contact or candidate transfer |

## Architecture and compatibility

- The current Node, Postgres, API, publication, evidence and RBAC logic remain unchanged.
- Existing programme tables, employer-research views, job ads, source URLs, complete learner journey and Institution/Industry workflows remain available below the new short briefing.
- Actions navigate using the app's existing view router. No new accounts, API calls, notifications or tracking.
- These entry-card saves intentionally do *not* conflate with other features' browser-local outreach plans or learner consented profile storage.
- UI re-renders preserve temporary Save / Not relevant state until this app session reloads. Exiting and re-entering after a reload restores the original three options.
- Changes to regional picker update source explanations. Noida remains the current evidence sample; no invented local data outside scope.

## Acceptance criteria

1. One obvious role-specific question and exactly three action cards on the default home, reachable from navigation.
2. Users can open their next action in one click, and return using existing navigation.
3. “Why this is shown” explains the source or qualification assumption and data limitations.
4. Save, unsave, Not relevant and Restore work without recording an actual job or employer contact.
5. All numbers have meaningful denominators and regional coverage notes.
6. Desktop, tablet and mobile retain the same content and keyboard navigation.
7. The previous dashboards and role flows still work; no actual verification or privacy change.
8. All GitHub Actions static, unit, database and Playwright tests pass.

## Next UX iteration

The short list is a real interface enhancement, **not validated UX research**. Test with diverse ITI students, diploma/college learners, placement officers and employers before rollout. Conduct five-second comprehension tests, capability-label interpretation and task completion trials. Consider Hindi and Bengali after reviewed translations. Once users understand these home flows, phase advanced analytics into clearly labelled, deliberate “Explore the full evidence” sections based on accessibility and interaction testing, without hiding crucial information behind a disclosure.

The detailed product-wide framework remains `docs/ENGAGEMENT_UX_BLUEPRINT.md`.
