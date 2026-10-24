// Home: what this site is, who it is for, and one door per audience.
import { app } from '../app.js';
import { esc, $, artBox, icon, fmtDate } from '../ui.js';
import { VIEWS, PAGES } from '../nav.js';

const DOORS = {
  learners: { title: 'I am a learner', text: 'College, ITI or polytechnic. See jobs you can apply for, where to apply, and the skills that open more doors.', tasks: ['Where to apply', 'Close my skill gaps', 'Jobs map'] },
  institution: { title: 'I run an institute', text: 'Principals, training and placement officers. Match your trades and branches to local demand.', tasks: ['ITI trades and skill gaps', 'Institutes nearby', 'Next steps'] },
  industry: { title: 'I follow industry', text: 'Employers, planners and partners. See demand now, investments over ten years and what is coming.', tasks: ['Jobs map', 'Market overview', 'Coming up'] },
  internal: { title: 'Swift AI Academy team', text: 'Market signals for product development: which courses to build, extend, curate or promote.', tasks: ['Market signals', 'Government data', 'Sources'] },
};

export function renderHome() {
  const k = app.derived.kpis;
  const ann = app.data.announcements?.items || [];
  const timeline = app.data.market?.timeline || [];
  const saa = app.data.saa;
  const scan = app.data.providers;
  const recent = timeline.filter((t) => t.year >= 2024).sort((a, b) => (b.date || String(b.year)).localeCompare(a.date || String(a.year))).slice(0, 3);
  $('#home').innerHTML = `
  <section class="home-hero">
    <div class="ph-text">
      <div class="eyebrow">Noida · Kalyani · Siliguri</div>
      <h1>Skills that lead to real jobs, mapped for your area</h1>
      <p class="lead">We track job ads, investments and government data around each area, check them with employers, and turn them into a plan: which jobs learners can apply for, which skills they still need, and where to learn them.</p>
      <div class="actions"><button class="btn primary" data-action="view" data-view="learners">${icon('school')}I am a learner</button><button class="btn tonal" data-action="tab" data-tab="discover">${icon('map')}See the jobs map</button></div>
    </div>
    ${artBox('home')}
  </section>

  <section class="doors" aria-label="Choose your view">
    ${VIEWS.map((v) => `<button class="door door-${v.id}" data-action="view" data-view="${v.id}"><span class="door-ico">${icon(v.icon + '-fill')}</span><span class="door-title">${esc(DOORS[v.id].title)}</span><span class="door-text">${esc(DOORS[v.id].text)}</span><span class="door-tasks">${DOORS[v.id].tasks.map((t) => `<span>${esc(t)}</span>`).join('')}</span><span class="door-go">Open the ${esc(v.label.toLowerCase())} view${icon('arrow_forward')}</span></button>`).join('')}
  </section>

  <section class="home-stats" aria-label="Right now">
    <div><span class="big">${k.signalCount}</span><span>job ads seen online in Sectors 62 and 63</span></div>
    <div><span class="big">${k.confirmedOpenings}</span><span>jobs confirmed by employers so far</span></div>
    <div><span class="big">${ann.length + (app.data.market?.future?.length || 0)}</span><span>announced projects that could create work</span></div>
    <div><span class="big">${saa?.courses?.length || 0}</span><span>Swift AI Academy courses mapped to local skills</span></div>
    <div><span class="big">${scan?.offerings?.length || 0}</span><span>courses from other providers checked</span></div>
  </section>

  <section class="how" aria-labelledby="howTitle">
    <h2 id="howTitle">How it works</h2>
    <ol class="how-steps">
      <li><span class="how-ico">${icon('travel_explore')}</span><b>Collect</b><span>Public job ads, investment news and government data for each area.</span></li>
      <li><span class="how-ico">${icon('call')}</span><b>Check</b><span>We call employers. Only confirmed jobs count for planning, and a second person approves each call.</span></li>
      <li><span class="how-ico">${icon('construction')}</span><b>Map</b><span>Every ad is linked to ITI trades, diplomas and degrees, and to the skills it asks for.</span></li>
      <li><span class="how-ico">${icon('school')}</span><b>Close the gap</b><span>Learners get a course plan. Institutes see which trades to strengthen. Our team sees what to build.</span></li>
    </ol>
  </section>

  <section class="home-news" aria-labelledby="newsTitle">
    <div class="card-head" style="padding:0"><h2 id="newsTitle">What is changing</h2><button class="linkbtn" data-action="tab" data-tab="${timeline.length ? 'market' : 'upcoming'}">See ${timeline.length ? 'ten years of change' : 'everything coming up'}${icon('arrow_forward')}</button></div>
    <div class="news-grid">${(recent.length ? recent.map((t) => ({ title: t.title, meta: `${t.date ? fmtDate(t.date) : t.year} · ${t.scope.replace(/_/g, ' ')}`, text: t.detail, url: t.source?.url })) : ann.slice(0, 3).map((a) => ({ title: a.title, meta: `${a.stage.split(';')[0]} · ${a.where}`, text: a.jobs_claimed, url: a.sources?.[0]?.url }))).map((n) => `<article class="news"><div class="note">${esc(n.meta)}</div><h3>${esc(n.title)}</h3><p>${esc(n.text || '')}</p>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">Source ${icon('open_in_new')}</a>` : ''}</article>`).join('')}</div>
  </section>

  <section class="trust-strip" aria-label="Where the data comes from"><span class="note">Data from</span>${['Job portals and company career pages', 'MoSPI and data.gov.in', 'National Career Service', 'NSQF (NQR)', 'NPTEL and SWAYAM', 'nasscom', 'WBIIDC and YEIDA', 'OpenStreetMap'].map((s) => `<span class="src-chip">${esc(s)}</span>`).join('')}</section>`;
}

app.views.home = renderHome;
export { PAGES };
