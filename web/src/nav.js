// Four audience views (Learners, Institution, Industry, Internal), each with
// its own navigation. Pages can appear in more than one view; the view is a
// lens on the same data, so counts never differ between views.
import { app } from './app.js';
import { esc, $, icon } from './ui.js';

/** @type {Record<string, {label:string, icon:string}>} */
export const PAGES = {
  home: { label: 'Home', icon: 'home' },
  path: { label: 'Where to apply', icon: 'route' },
  learn: { label: 'Close my skill gaps', icon: 'school' },
  match: { label: 'Match a learner', icon: 'handshake' },
  discover: { label: 'Jobs map', icon: 'map' },
  upcoming: { label: 'Coming up', icon: 'event_upcoming' },
  trades: { label: 'ITI trades and skill gaps', icon: 'construction' },
  plan: { label: 'Next steps', icon: 'checklist' },
  institutes: { label: 'Institutes nearby', icon: 'location_city' },
  market: { label: 'Market overview', icon: 'timeline' },
  compare: { label: 'Compare 62 and 63', icon: 'compare_arrows' },
  regions: { label: 'Kalyani and Siliguri', icon: 'travel_explore' },
  feeds: { label: 'Government data', icon: 'cell_tower' },
  voice: { label: "Workers' views", icon: 'forum' },
  evidence: { label: 'Sources', icon: 'source_notes' },
  signals: { label: 'Market signals', icon: 'trending_up' },
  review: { label: 'Review queue', icon: 'inbox' },
  verify: { label: 'Record an employer call', icon: 'call' },
};

export const VIEWS = [
  { id: 'learners', label: 'Learners', icon: 'school', home: 'path', who: 'College, ITI and polytechnic learners',
    groups: [['Your next step', ['path', 'learn', 'match']], ['Explore jobs', ['discover', 'upcoming']]] },
  { id: 'institution', label: 'Institution', icon: 'apartment', home: 'trades', who: 'ITI, polytechnic and college teams',
    groups: [['Plan for your learners', ['trades', 'plan', 'institutes']], ['Your area', ['market', 'compare', 'voice']]] },
  { id: 'industry', label: 'Industry', icon: 'factory', home: 'discover', who: 'Employers, planners and partners',
    groups: [['Demand now', ['discover', 'compare', 'regions']], ['The bigger picture', ['market', 'upcoming']], ['Data', ['feeds', 'evidence']]] },
  { id: 'internal', label: 'Internal', icon: 'hub', home: 'signals', who: 'Swift AI Academy team',
    groups: [['Product development', ['signals', 'market']], ['Data', ['feeds', 'evidence']], ['Research operations', ['review', 'verify']]] },
];
export const ALL_TABS = Object.keys(PAGES);

export const viewOf = (id) => VIEWS.find((v) => v.id === id) || VIEWS[2];
const inView = (v, tab) => tab === 'home' || v.groups.some(([, tabs]) => tabs.includes(tab));
/** The view to show for a page: the current one if it has the page, else the first that does. */
export function viewFor(tab, current) {
  const cur = viewOf(current);
  return inView(cur, tab) ? cur : VIEWS.find((v) => inView(v, tab)) || cur;
}

const visible = (tab) => (tab === 'review' ? app.can('read:review') : tab === 'verify' ? app.can('verify:submit') : true);

function tabButton(tab) {
  const p = PAGES[tab];
  const active = app.state.tab === tab;
  const extra = tab === 'feeds' ? '<span class="nav-badge">Demo</span>' : tab === 'review' ? '<span class="tab-count" id="reviewCount"></span>' : '';
  return `<button class="tab ${active ? 'active' : ''}" data-tab="${tab}" ${active ? 'aria-current="page"' : ''}><span class="ti">${icon(p.icon)}${icon(p.icon + '-fill') || icon(p.icon)}</span><span class="tl">${esc(p.label)}</span>${extra}</button>`;
}

export function renderNav() {
  const v = viewOf(app.state.view);
  $('#viewSwitch').innerHTML = VIEWS.map((x) => `<button class="vbtn ${x.id === v.id ? 'active' : ''}" data-view="${x.id}" aria-pressed="${x.id === v.id}" title="${esc(x.who)}">${icon(x.icon + (x.id === v.id ? '-fill' : ''))}<span>${esc(x.label)}</span></button>`).join('');
  $('#navLinks').innerHTML = `<div class="nav-group">${tabButton('home')}</div>` + v.groups.map(([label, tabs]) => {
    const shown = tabs.filter(visible);
    if (!shown.length) return '';
    return `<div class="nav-group"><div class="nav-label">${esc(label)}</div>${shown.map(tabButton).join('')}</div>`;
  }).join('');
  $('#viewName').textContent = v.label;
  document.documentElement.dataset.view = v.id;
}
