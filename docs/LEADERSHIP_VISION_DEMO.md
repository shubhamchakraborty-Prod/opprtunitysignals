# Opportunity Explorer — Complete Leadership Vision Demonstrator

**Version:** 1.0 · October 2026  
**Audience:** CEO, leadership, product, research, skilling and industry teams  
**Purpose:** Show the **future-state operating model** of Opportunity Explorer as one cohesive interactive experience.

## What this is — and is not

This is a **complete, presentation-ready product vision model**, not a deployment of a live nationwide labour-market platform. It demonstrates how permissioned government datasets, licensed job feeds, permitted social/media sources, verified employer requirements, training-institution records and role-specific interfaces could operate **once integrated**.

Every future-state connector, sync timestamp, geospatial marker and scenario is explicitly **synthetic**. No employer is actually contacted from the demo; no external API credentials are installed; no invented vacancies or enrolment counts enter live KPIs.

The repository also contains an **actual bounded Noida research pilot** with a separate operational data model and RBAC. The leadership simulator and research pilot are deliberately not mixed.

## The single presentation entry point

**URL (when serving locally or deployed as static preview):**

`/?view=vision&tab=idemo`

Open **Vision demo** from the application's top navigation, or select **Explore the complete vision** on Home. Neither requires team sign-in because it contains only synthetic data.

**Offline delivery:** GitHub Actions builds a completely self-contained `explorer-offline.html`. After the vision-branch workflow succeeds, download the `opportunity-explorer-vision-demo` artifact and open the HTML file in a modern desktop browser. Sharing this file with leadership does not share secrets or a production database.

## Seven-chapter live walkthrough

| Chapter | Show / click | One point to communicate |
|---|---|---|
| 1. The opportunity | Open Vision demo; start guided tour | Today’s opportunity and skill information is scattered; users need understandable answers |
| 2. Connect information | Next → source hub | Each source contributes distinct evidence, and each requires approved legal/technical access |
| 3. Build a signal layer | Next → unified signal stream | Normalise, deduplicate and separate advertisements from direct verification and announcements |
| 4. Explain trust | Next → unconfirmed social signal | Confidence is visible and capped; confidence does **not** equal an employer-verified vacancy |
| 5. Reveal geography | Next → illustrative map and sample verified record | Location precision is separate from employment evidence; demo points are not accurate premises |
| 6. Four experiences | Next → user journeys | Learners, institutions, industry and research teams receive different actions from the same source |
| 7. The operating model | Next → evidence-to-action sequence | Responsible verification and useful decisions matter more than raw data volumes |

Presentation controls have **Previous**, **Next**, chapter selectors and **Restart**. The steps never auto-advance, and there is no countdown, artificial audience activity or engagement tracking.

### Recommended leadership narration (6–8 minutes)

**Opening:** “Imagine being able to see, for a specific geography, what work employers advertise, what they have actually verified as open, what educational institutions teach and what skills may be becoming more relevant. Today those signals sit in different systems. We want to connect them carefully.”

**Source story:** “Government reports tell us broad workforce conditions, job portals reveal *advertised* opportunities, media mentions may indicate investment plans, and direct employer verification can establish real openings. Each is a different kind of evidence. We do not treat them as equivalent.”

**Trust story:** “A credible platform must be able to say ‘we do not know’. Open the low-confidence social example. You can see exactly what increases or caps confidence. An investment announcement is not a job; mirrors of the same posting are not multiple jobs.”

**User story:** “Now see the same intelligence through a learner, institution, employer and researcher's eyes. A learner sees relevant roles and possible skills; an institution can discuss course alignment; industry can explore potential training partnerships; a researcher sees what still needs checking.”

**Closing:** “This is the functioning vision mock, not an announcement that integrations are live. The next investment decisions concern source agreements, institutional data, employer confirmation workflows, product validation and a pilot.”

## Executive questions this demo can answer

1. **What is different from a job listing website?** Role trends, evidence confidence, programme and skills comparison, verified employer requirements and cross-role next actions; it does not simply repeat ads.
2. **Why would government and training institutions use it?** Each claim comes with source, place, time and confidence, enabling better-targeted conversations and transparent planning.
3. **What protects us from false numbers?** Dedupe clusters, evidence types, proof of direct verification, second-person approval in the underlying operational core, source dates and confidence explanations.
4. **What would a learner see first?** A small, goal-based action briefing instead of a dense analytics interface.
5. **How would it scale?** Start with one geography and approved source coverage; validate signal quality and user value; introduce further regions when evidence and permissions support it.
6. **What is missing to go live?** Government/commercial source access, provider-specific adapters, institutional supply agreements, production identity, user consent, deployment monitoring, legal/privacy review and representative field testing.

## Navigation for unscripted exploration

| Navigation | Purpose |
|---|---|
| Vision demo | The unified simulated intelligence system and guided tour |
| Learners | Action-first learner experience with actual bounded pilot examples |
| Institutions | Demand/programme exploration and browser-only outreach planning |
| Industry | Role/skills and potential training institute matching |
| Internal | Authorised research operations, evidence review and permission matrix |

The real-interface examples should always be introduced as **pilot views**, not as the connected-data simulation itself. They do not acquire simulated source counts.

## Map specification

The preview includes an original schematic SVG map with clickable markers generated from synthetic signals, not verified addresses or government administrative boundaries. Three geography scenarios are included: Noida Sectors 62/63, Kalyani and Siliguri. Kalyani/Siliguri are future-state illustrations; they are **not** equivalent live regional datasets.

A real map requires properly licensed tiles/boundary sources, verified geocoding, uncertainty display, cluster aggregation and source inspection. Do not claim exact locations from this mock.

## What a leader can take away

- One platform can serve **four audiences** while using a shared evidence model.
- Confidence and verification are designed into the product, not patched on as decorative labels.
- Institutional skills and industry demand can be understood together without promising employment.
- The experience can be intuitive enough for first-time learners and credible enough for government and research teams.
- This complete interactive vision is ready to **demonstrate**; live integrations and production claims are explicitly separate milestones.

## How to hand over the model

1. Review the consolidated **vision demo feature branch** (it already contains the eight preceding development branches).
2. Check its CI, then download the GitHub Actions **offline HTML artifact**.
3. Open the file locally without a server or API credentials and run the seven-stage guided presentation.
4. Use the app's audience tabs for follow-up live exploration of the interfaces.
5. Collect stakeholder feedback on the flow and decide which single real source and client-facing workflow to pilot first.

**Important:** The eight preceding pull requests remain unmerged in the repository unless separately merged. This vision branch consolidates their code through ancestry, so the demo itself can be tested and distributed as one coherent artifact without changing the default branch.

Further reference: `docs/FUTURE_STATE_DEMO_BLUEPRINT.md`, `docs/ENGAGEMENT_UX_BLUEPRINT.md`, `docs/ACTION_FIRST_ROLE_HOMES.md`.
