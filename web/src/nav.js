// Four separate interfaces, chosen with primary tabs: Learners, Institutions,
// Industry and Internal. Each has its own secondary tabs, landing page, words
// and colour. A page is shared only where the question is the same, and it is
// named in that audience's words (e.g. "Jobs for me" vs "Jobs near you").
import { app } from './app.js';
import { esc, $, icon } from './ui.js';

export const VIEWS = [
  { id: 'learners', label: 'Learners', icon: 'school', home: 'lhome', who: 'College, ITI and polytechnic learners',
    tabs: [['lhome', 'For you', 'home'], ['path', 'Where to apply', 'route'], ['learn', 'My skill plan', 'school'], ['discover', 'Jobs for me', 'map'], ['upcoming', 'Coming up', 'event_upcoming'], ['lprofile', 'My profile', 'person']] },
  { id: 'institution', label: 'Institutions', icon: 'apartment', home: 'ihome', who: 'ITIs, polytechnics and colleges',
    tabs: [['ihome', 'Overview', 'home'], ['idemand', 'Demand & skills', 'bar_chart'], ['ioutreach', 'Employer outreach', 'handshake'], ['trades', 'Trades and programmes', 'construction'], ['discover', 'Jobs near you', 'map'], ['plan', 'Placement steps', 'checklist'], ['institutes', 'Institutes nearby', 'location_city'], ['market', 'Market', 'timeline'], ['compare', 'Compare 62 and 63', 'compare_arrows'], ['regions', 'Kalyani and Siliguri', 'travel_explore'], ['voice', "Workers' views", 'forum']] },
  { id: 'industry', label: 'Industry', icon: 'factory', home: 'talent', who: 'Employers hiring talent',
    tabs: [['talent', 'Talent overview', 'groups'], ['isupply', 'Institution supply', 'location_city'], ['hire', 'Match role & skills', 'work'], ['partner', 'Partnership plans', 'handshake'], ['apprentice', 'Apprentices and interns', 'school'], ['market', 'Market and competition', 'timeline']] },
  { id: 'internal', label: 'Internal', icon: 'hub', home: 'iops', who: 'Researchers, employer verifiers and administrators',
    tabs: [['iops', 'Research overview', 'layout_dashboard'], ['idemo', 'Integrated demo', 'auto_awesome'], ['iquality', 'Data quality', 'fact_check'], ['signals', 'Market signals', 'trending_up'], ['feeds', 'Government data', 'cell_tower'], ['discover', 'Job ads', 'map'], ['market', 'Market', 'timeline'], ['match', 'Match a learner', 'handshake'], ['evidence', 'Sources', 'source_notes'], ['review', 'Review queue', 'inbox'], ['verify', 'Record an employer call', 'call'], ['iaccess', 'Access & permissions', 'shield']] },
];
export const ALL_TABS = ['home', ...new Set(VIEWS.flatMap((v) => v.tabs.map(([t]) => t)))];
/** Pages with job-ad search. */
const SEARCHABLE = ['discover'];

export const viewOf = (id) => VIEWS.find((v) => v.id === id) || VIEWS[0];
const inView = (v, tab) => v.tabs.some(([t]) => t === tab);
/** The interface to show for a page: the current one if it has the page, else the first that does. */
export function viewFor(tab, current) {
  const cur = viewOf(current);
  return tab === 'home' || inView(cur, tab) ? cur : VIEWS.find((v) => inView(v, tab)) || cur;
}
/** The label a page carries in the current interface. */
export function pageLabel(tab) {
  const v = viewOf(app.state.view);
  return v.tabs.find(([t]) => t === tab)?.[1] || '';
}

const visible = (tab) => (tab === 'review' ? app.can('read:review') : tab === 'verify' ? app.can('verify:submit') : true);

/** At most five mobile destinations. Longer menus reserve one slot for More. */
export function mobileNavigation(v = viewOf(app.state.view)) {
  const tabs = v.tabs.filter(([tab]) => visible(tab));
  return tabs.length > 5
    ? { primary: tabs.slice(0, 4), overflow: tabs.slice(4) }
    : { primary: tabs, overflow: [] };
}

export function renderNav() {
  const v = viewOf(app.state.view);
  const home = app.state.tab === 'home';
  $('#audTabs').innerHTML = VIEWS.map((x) => {
    const on = !home && x.id === v.id;
    return `<button class="aud-tab aud-${x.id} ${on ? 'active' : ''}" role="tab" aria-selected="${on}" data-view="${x.id}" title="${esc(x.who)}">${icon(x.icon + (on ? '-fill' : ''))}<span>${esc(x.label)}</span></button>`;
  }).join('');
  $('#subTabs').innerHTML = home
    ? '<span class="sub-hint">Choose who you are: each interface shows what that person needs.</span>'
    : v.tabs.filter(([t]) => visible(t)).map(([t, label, ic]) => {
      const on = app.state.tab === t;
      const extra = t === 'feeds' ? '<span class="nav-badge">Demo</span>' : t === 'review' ? '<span class="tab-count" id="reviewCount"></span>' : '';
      return `<button class="tab ${on ? 'active' : ''}" data-tab="${t}" ${on ? 'aria-current="page"' : ''}>${icon(ic + (on ? '-fill' : '')) || icon(ic)}<span class="tl">${esc(label)}</span>${extra}</button>`;
    }).join('');
  const { primary, overflow } = mobileNavigation(v);
  const activeInMore = overflow.some(([tab]) => tab === app.state.tab);
  $('#mobileNav').innerHTML = home ? '' : [
    ...primary.map(([tab, label, ic]) => {
      const on = tab === app.state.tab;
      return `<button class="mobile-tab ${on ? 'active' : ''}" type="button" data-action="tab" data-tab="${tab}" aria-label="${esc(label)}" ${on ? 'aria-current="page"' : ''}>${icon(ic + (on ? '-fill' : '')) || icon(ic)}<span>${esc(label)}</span></button>`;
    }),
    ...(overflow.length ? [`<button class="mobile-tab ${activeInMore ? 'active' : ''}" type="button" data-action="mobile-more" aria-haspopup="dialog" aria-label="More pages" ${activeInMore ? 'aria-current="page"' : ''}>${icon('menu')}<span>More</span></button>`] : []),
  ].join('');
  document.documentElement.dataset.view = home ? 'home' : v.id;
  $('#searchBox').hidden = !SEARCHABLE.includes(app.state.tab);
}
