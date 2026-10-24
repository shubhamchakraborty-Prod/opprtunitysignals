# Opportunity Explorer responsive navigation

## First implementation slice

The existing four interfaces, data model, matching rules, maps and workflow screens remain unchanged. This slice improves **mobile page discovery** without replacing the vanilla JavaScript application or introducing new framework dependencies.

| Screen width | Navigation | Expected behaviour |
|---|---|---|
| 320-760 px | Fixed bottom navigation | At most five visible destinations, full-text labels available to assistive technology |
| 761-1100 px | Existing scrollable tab rows | All pages available with horizontal navigation |
| Above 1100 px | Existing two-row desktop navigation | All pages directly discoverable |

For interfaces with five or fewer permitted pages, show all of them. For longer interfaces, show the first four and a **More** control. The More dialog lists the remaining pages, preserving permission-based restrictions and indicating when a page in More is active. The current audience selector stays at the top.

### Product alignment

- Learners: five bottom destinations, no overflow.
- Institutions: Overview, Trades and programmes, Jobs near you, Placement steps, More.
- Industry: five bottom destinations, no overflow.
- Internal: four primary destinations and More. Review and verification links remain hidden unless the user has the existing permissions.
- Data, provenance, verification labels, maps and other screen content are not altered.

### Acceptance checks

1. A phone-sized viewport never displays more than five main navigation buttons.
2. Every permitted page remains accessible through the bottom bar or More dialog.
3. A page selected from More loads and marks More as current.
4. Changing audience updates the bottom navigation and preserves that audience's page labels.
5. Keyboard users can open More, select a page or close it with Escape.
6. At desktop width the full navigation is visible and the mobile bar is hidden.
7. The bottom bar does not cover content, toasts or the guided tour.
8. The extra navigation layer does not grant access to restricted pages.

See `test/e2e/ui.test.mjs` for responsive and permission tests. Run `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` locally or in CI.

## Next design and development batches

1. Audit each learner screen against the PRD, including eligibility, clearer application routes, consent and missing-data states.
2. Create reusable desktop/mobile screen components for opportunity cards, evidence labels, profile details, skills and learning recommendations.
3. Refine the institution demand and industry talent-supply journeys.
4. Strengthen internal verification workflows, RBAC and data provenance.
5. Complete full interaction and accessibility QA before a public rollout.

**Scope note:** This PR changes only navigation. It is not a claim that the full product PRD has been implemented.
