# Product principles

How the Opportunity Explorer is designed and built, following the way Google designs products and the ideas in Don Norman's *The Design of Everyday Things*.

## 1. Product principles

| Principle | What it means here | Where you see it |
|---|---|---|
| Focus on the user and all else will follow | There is one view for each audience: learners, institutions, industry, and the internal Swift AI Academy team. Each view opens on the page that answers that audience's first question. | The home page has four doors. The view switcher sits at the top of the navigation. |
| Fast is better than slow | The whole site, its data and its fonts come in one file. It runs offline and nothing blocks the first screen. | `dist/explorer-offline.html`, local fonts, no external scripts |
| Honest data beats impressive data | Counts only include what is confirmed. A claim or a simulation is always labelled as one. | Coloured trust labels on every job ad. The "SIMULATION" band on Government data. Confidence notes on sources. |
| Launch and iterate | This is a pilot with real but small data. Every page names what is missing and who can supply it. | "Not available yet" states, Limitations doc |
| Accessible by default | Designed to WCAG 2.2 AA: text colours chosen for AA contrast, every control at least 24 px (navigation items 48 px), full keyboard use, screen-reader labels and reduced-motion support. A formal audit is still to be done. | `:focus-visible` rings, `aria-*` labels, the simulation pauses when reduced motion is on |
| One system | Material 3 everywhere: one type scale (Google Sans), one colour scheme from the brand indigo, and one set of buttons, chips, cards and dialogs. | `web/styles.css` tokens |

### Measuring success (HEART, with goals, signals and metrics)

| HEART | Goal | Signal | Metric to track |
|---|---|---|---|
| Happiness | Learners trust what they see | Feedback after a skill plan | Share rating it 4 or 5 out of 5 |
| Engagement | Institutions come back each placement season | Visits to Trades and Next steps | Weekly active institute users |
| Adoption | Learners act on their plan | "Start on Swift AI Academy" clicks | Click-through from skill plan to course |
| Retention | Learners finish what they start | Course completion | Completion within 30 days |
| Task success | Learners find where to apply | Portal links opened from Where to apply | Share of sessions that open a portal |

## 2. *The Design of Everyday Things*, applied

| Norman's idea | Problem it solves | How it is built here |
|---|---|---|
| **Discoverability** | People cannot use what they cannot find. | The navigation drawer is always visible on desktop, with labelled icons rather than icons alone. Search is in the top bar (press `/`). The home page shows every audience's main pages. |
| **Affordances and signifiers** | It must be obvious what can be clicked. | Buttons come in four levels (filled, tonal, outlined, text). Arrows on links that go to another page. Hover and focus states on every control. Map pins grow on hover. |
| **Mapping** | Controls should sit next to what they change and look like it. | One location picker at the top drives every regional page. Sector colours are the same on the map, the chips and the bars. Hovering a job in the list highlights its pin on the map. |
| **Feedback** | People need to know their action worked. | Snackbars confirm actions. A "Showing 10 ads for Sector 62" line updates as filters change. The simulation shows "3 s ago" and arrival dots. The active page is filled in the navigation. |
| **Conceptual model** | People need a simple picture of how the system works. | One journey is shown everywhere: Seen online, then Employer called, then Approved. "How it works" on the home page has four steps: Collect, Check, Map, Close the gap. |
| **Constraints** | Prevent mistakes before they happen. | Team tools are hidden until sign-in. Internal pages are gated on the live server. A person cannot approve their own employer call (four-eyes rule). |
| **Knowledge in the world, not in the head** | People should not have to remember state. | Active filters appear as chips that can be removed one by one. The current view and area are shown in the top bar. Every number carries its date and source. |
| **Error tolerance** | Mistakes should be cheap to undo. | Each filter chip has an ×. "Clear all" is always nearby. Empty states explain why there is nothing and offer a way out. Practice mode saves nothing. |
| **Consistency and standards** | Familiar patterns cut learning time. | Material 3 components behave the way they do in Google's own products: navigation drawer, top app bar, filter chips, segmented buttons, side sheet, snackbar. |
| **Human-centred design: observe, ideate, prototype, test** | Build what people need, not what was asked for. | Browser tests encode the main tasks (find a job, see a skill plan, apply, check a source). The pilot exists to watch real institutes use it. |

## 3. Audience views

| View | Who | First question | Pages |
|---|---|---|---|
| Learners | College, ITI and polytechnic learners | Where can I apply, and what should I learn? | Where to apply, Close my skill gaps, Match a learner, Jobs map, Coming up |
| Institution | Principals, training and placement officers | Which of our trades and branches fit local demand? | ITI trades and skill gaps, Next steps, Institutes nearby, Market overview, Compare 62 and 63, Workers' views |
| Industry | Employers, planners, partners | What is demand now and what is coming? | Jobs map, Compare, Kalyani and Siliguri, Market overview, Coming up, Government data, Sources |
| Internal | Swift AI Academy product team | What should we build, extend, curate or promote? | Market signals, Market overview, Government data, Sources, Review queue, Record an employer call |
