// Institutions · Overview: for an ITI, polytechnic or college, the demand for
// its trades or programmes nearby, the skills to add, employers and projects
// to approach for placements, and what Swift AI Academy offers the institute.
import { app } from '../app.js';
import { esc, $, artBox, icon } from '../ui.js';
import { mapCatalogue } from '../../../src/core/trades.js';
import { learnerFit, demandByType, LEARNER_TYPES } from '../../../src/core/learners.js';
import { comparisonBase } from '../../../src/core/analytics.js';

const OFFER = {
  iti: ['Workplace Communication Pro for every trade batch', 'Spreadsheets to SQL for COPA and office-bound learners', 'Interview practice before campus drives'],
  polytechnic: ['Business Data Analyst pathway alongside the diploma', 'Workplace Communication for supervisor and quality roles', 'NATS apprenticeship readiness'],
  college: ['Applied AI/ML and Business Data Analyst pathways as credit electives', 'Workplace Communication for placement season', 'Market signals for the placement cell'],
};

export function renderInstitutionHome() {
  const type = app.ls.get('opx-inst-type', 'iti');
  const area = app.area();
  const ads = comparisonBase(app.data.records.filter((r) => r.review.state === 'approved'), 'all');
  const dt = demandByType(ads).find((x) => x.type === type);
  const future = (app.data.market?.future || []).filter((f) => f.area === area);
  const peers = (app.data.demand?.institutes || []).filter((i) => i.area === area && (i.type === type || (type === 'college' && i.type === 'university')));
  let rows;
  if (type === 'iti') {
    rows = mapCatalogue(app.data.trades.trades, ads, app.data.courses?.skills || {}).filter((m) => m.demand).slice(0, 8)
      .map((m) => ({ name: m.trade, demand: m.demand, fresh: m.fresh_ok, add: m.gaps.slice(0, 2).map((g) => g.skill) }));
  } else {
    rows = (app.data.programmes?.programmes || []).filter((p) => p.type === type).map((p) => {
      const f = learnerFit({ type: /** @type {any} */ (type), programme: p }, ads);
      return { name: p.name, demand: f.related.length, fresh: f.fresh, bridges: f.bridges.length, add: f.opens.slice(0, 2).map(([s]) => s) };
    }).sort((a, b) => b.demand - a.demand);
  }
  const skillCount = new Map();
  for (const r of rows) for (const s of r.add) skillCount.set(s, (skillCount.get(s) || 0) + 1);
  const topSkills = [...skillCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const saaFor = (s) => { const m = app.data.saa?.skill_map?.[s]; return m && m.fit !== 'none' ? app.data.saa.courses.find((c) => c.id === m.courses[0]) : null; };
  const calls = (app.derived.board?.outreach_priority || []).slice(0, 5);
  $('#ihome').innerHTML = `<div class="section-head">${artBox('institutes')}<div><div class="eyebrow">Institutions · Overview</div><h2>How well do your programmes match local demand?</h2><p>Explore how programmes relate to the Noida Sector 62 and 63 pilot ad sample. Regional announcements are shown separately from verified openings.</p></div></div>
  <div class="type-tabs" role="tablist" aria-label="Type of institute">${Object.entries(LEARNER_TYPES).map(([k, t]) => `<button role="tab" class="type-tab ${type === k ? 'active' : ''}" aria-selected="${type === k}" data-action="inst-home-type" data-type="${k}">${icon(k === 'iti' ? 'construction' : k === 'polytechnic' ? 'engineering' : 'school')}<span><b>${k === 'iti' ? 'ITI' : k === 'polytechnic' ? 'Polytechnic' : 'College or university'}</b><small>${esc(t.long.replace('student or holder', 'programmes').replace('trainee or pass-out', 'trades').replace('student or graduate', 'programmes'))}</small></span></button>`).join('')}</div>
  <div class="inst-quicklinks">
    <button type="button" class="inst-quicklink" data-action="tab" data-tab="idemand"><span>${icon("bar_chart")}</span><strong>Demand & skills</strong><small>Explore programme relevance with supporting advertisements</small>${icon("arrow_forward")}</button>
    <button type="button" class="inst-quicklink" data-action="tab" data-tab="ioutreach"><span>${icon("handshake")}</span><strong>Employer outreach</strong><small>Prepare and track follow-up actions on this device</small>${icon("arrow_forward")}</button>
  </div>
  <p class="note">The job-ad figures below cover Noida Sectors 62 and 63 only. They are not verified openings or a measure of hiring across the selected region.</p>
  <div class="answers">
    <div class="answer"><span class="label">${icon('work')}Ads naming or not excluding your qualification</span><span class="big">${dt.ads}</span><span class="sub">${dt.fresh} ads ask less than a year of experience · ${dt.named} name your qualification</span></div>
    <div class="answer go"><span class="label">${icon('construction')}${type === 'iti' ? 'Trades' : 'Programmes'} with related ads</span><span class="big">${rows.filter((r) => r.demand).length}</span><span class="sub">of ${type === 'iti' ? app.data.trades.trades.length : rows.length} ${type === 'iti' ? 'ITI trades' : 'programmes we track'}</span></div>
    <div class="answer"><span class="label">${icon('event_upcoming')}Projects coming up nearby</span><span class="big">${future.length}</span><span class="sub">For MoUs, apprenticeships and visits</span></div>
    <div class="answer wait"><span class="label">${icon('groups')}Pass-outs vs demand</span><span class="big">-</span><span class="sub">Not available yet: needs pass-out numbers from your records or NCVT MIS / AISHE</span></div>
  </div>
  <div class="grid2">
    <div class="card"><div class="card-head"><h3>Demand for your ${type === 'iti' ? 'trades' : 'programmes'}</h3><small>Ads in Sectors 62 and 63 that fit</small></div><div class="card-body"><div class="table-scroll"><table class="minitable"><thead><tr><th>${type === 'iti' ? 'Trade' : 'Programme'}</th><th>Ads</th><th>Freshers</th><th>Skills to add</th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${esc(r.name)}</strong></td><td>${r.demand}</td><td>${r.fresh}</td><td>${esc(r.add.join(', ') || '-')}</td></tr>`).join('')}</tbody></table></div>${type === 'iti' ? '<button class="linkbtn" style="margin-top:10px" data-action="tab" data-tab="trades">All 103 trades and bridge jobs</button>' : ''}</div></div>
    <div class="region-side">
      <div class="card"><div class="card-head"><h3>Skills to investigate for your timetable</h3><small>Asked for across your ${type === 'iti' ? 'trades' : 'programmes'}</small></div><div class="card-body"><ul class="plain">${topSkills.map(([s, n]) => { const c = saaFor(s); return `<li><strong>${esc(s)}</strong> <span class="note">· ${n} ${type === 'iti' ? 'trade' : 'programme'}${n > 1 ? 's' : ''}${c ? ` · Swift AI Academy: ${esc(c.title)} (${esc(c.hours)} h)` : ''}</span></li>`; }).join('') || '<li class="note">No gaps in the current sample.</li>'}</ul></div></div>
      <div class="card"><div class="card-head"><h3>What Swift AI Academy offers you</h3></div><div class="card-body"><ul class="plain">${OFFER[type].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
    </div>
  </div>
  <div class="grid2">
    <div class="card"><div class="card-head"><h3>Employers to investigate</h3><small>Observed ads that may be worth checking</small></div><div class="card-body"><ul class="ad-list">${calls.map((r) => `<li class="ad-row"><div><a href="#" data-action="open-record" data-id="${esc(r.source_id)}">${esc(r.role_title_raw)}</a><div class="note">${esc(r.employer_identity || 'Employer not named')}</div></div><span class="sector-tag s${esc(r.sector)}">Sector ${esc(r.sector)}</span></li>`).join('') || '<li class="note">None right now.</li>'}</ul><button class="linkbtn" data-action="tab" data-tab="plan">Full placement steps${icon('arrow_forward')}</button></div></div>
    <div class="card"><div class="card-head"><h3>Projects to approach early</h3><small>Announced near ${esc({ noida_ncr: 'Noida', kalyani: 'Kalyani', siliguri: 'Siliguri' }[area])}</small></div><div class="card-body"><ul class="demand-list">${future.slice(0, 4).map((f) => `<li><strong>${esc(f.title)}</strong><p class="note">${esc(f.status)}${f.skills_implied?.length ? ' · needs ' + esc(f.skills_implied.slice(0, 3).join(', ')) : ''}</p></li>`).join('') || '<li class="note">Nothing announced in our list.</li>'}</ul></div></div>
  </div>
  <p class="note">${peers.length} other ${type === 'iti' ? 'ITIs' : type === 'polytechnic' ? 'polytechnics' : 'colleges'} within about 100 km are on <button class="linkbtn" data-action="tab" data-tab="institutes">Institutes nearby</button>. Diploma and degree skills are typical, not an official syllabus.</p>`;
}

app.actions['inst-home-type'] = (el) => { app.ls.set('opx-inst-type', el.dataset.type); renderInstitutionHome(); };
app.views.ihome = renderInstitutionHome;
