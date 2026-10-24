// Learners: pick what you studied, see the jobs here you could do now, the
// skills that open more jobs, and the Swift AI Academy course (or another
// provider) that teaches each one.
import { app } from '../app.js';
import { esc, $, artBox, icon, toast, sectorTag } from '../ui.js';
import { mapTrade, bridgeJobs } from '../../../src/core/trades.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { filterOpportunities } from '../../../src/core/filters.js';
import { representatives } from '../../../src/core/dedupe.js';
import { wageText } from '../../../src/core/decisions.js';
import { offeringsFor } from '../../../src/core/signals.js';

const ui = { trade: 'Electronics Mechanic' };
const CLASS12 = 'Class 12 (no ITI)';

function tradeFor(name) {
  if (name === CLASS12) {
    const p = app.profile('class12');
    return { trade: CLASS12, sector: 'General', core_skills: p?.skills || ['Computer basics', 'Basic English'] };
  }
  return app.data.trades.trades.find((t) => t.trade === name) || app.data.trades.trades[0];
}

function adRow(id, extra = '') {
  const r = app.data.records.find((x) => x.source_id === id);
  if (!r) return '';
  return `<li class="ad-row"><div><a href="#" data-action="open-record" data-id="${esc(id)}">${esc(r.role_title_raw)}</a><div class="note">${esc(r.employer_identity || 'Employer not named')} · ${esc(wageText(r.wage))}</div>${extra}</div>${sectorTag(r)}</li>`;
}

function courseCard(skills, jobs) {
  const skill = skills[0];
  const saa = app.data.saa;
  const map = saa.skill_map[skill];
  const trade = (saa.trade_skills || []).includes(skill);
  const c = map && map.fit !== 'none' ? saa.courses.find((x) => x.id === map.courses[0]) : null;
  const others = offeringsFor(skill, app.data.providers).slice(0, 2);
  const pname = (id) => app.data.providers?.providers?.find((p) => p.id === id)?.name || id;
  const unlock = `<span class="unlock">${icon('north_east')}Opens ${jobs} job${jobs === 1 ? '' : 's'} here</span>`;
  if (c) {
    const track = saa.tracks.find((t) => t.id === c.track);
    return `<article class="plan-step saa"><div class="ps-head"><div><div class="eyebrow">Learn ${esc(skills.join(', '))}</div><h4>${esc(c.title)}</h4><div class="note">Swift AI Academy · ${esc(track?.name || '')} pathway</div></div>${unlock}</div>
    <div class="ps-facts"><span>${icon('schedule')}${esc(c.hours)} hours</span><span>${icon('school')}${esc(c.level || '')}</span><span>${icon('public')}${esc(c.languages.join(', '))}</span><span>${esc(c.mode || '')}</span></div>
    <p>${esc(c.overview)}</p>${map.fit === 'partial' ? `<p class="note"><strong>Partly covers this skill.</strong> ${esc(map.gap || '')}</p>` : ''}
    <div class="actions"><button class="btn primary small" data-action="saa-start" data-course="${esc(c.id)}">${icon('school')}Start on Swift AI Academy</button>${others.length ? `<details class="disclose"><summary>Other options (${others.length})</summary><ul class="offers">${others.map((o) => `<li><a href="${esc(o.url || '#')}" target="_blank" rel="noopener">${esc(o.title)}</a><span class="note">${esc(pname(o.provider))}${o.cost && o.cost !== 'unknown' ? ' · ' + esc(o.cost) : ''}</span></li>`).join('')}</ul></details>` : ''}</div></article>`;
  }
  return `<article class="plan-step ${trade ? 'trade' : 'other'}"><div class="ps-head"><div><div class="eyebrow">Learn ${esc(skills.join(', '))}</div><h4>${trade ? 'Hands-on trade training' : 'Not on Swift AI Academy yet'}</h4><div class="note">${trade ? 'ITI, NSTI or Sector Skill Council course' : 'Courses from other providers'}</div></div>${unlock}</div>
  ${others.length ? `<ul class="offers">${others.map((o) => `<li><a href="${esc(o.url || '#')}" target="_blank" rel="noopener">${esc(o.title)}</a><span class="note">${esc(pname(o.provider))}${o.nsqf_level != null ? ' · NSQF ' + esc(o.nsqf_level) : ''}${o.cost && o.cost !== 'unknown' ? ' · ' + esc(o.cost) : ''}</span></li>`).join('')}</ul>` : `<p class="note">${esc(app.data.courses?.skills?.[skill]?.course || 'Ask your institute for a short course.')}</p>`}</article>`;
}

export function renderLearn() {
  const root = $('#learn');
  if (!app.data.trades || !app.data.saa) { root.innerHTML = '<p class="note">Course data not loaded.</p>'; return; }
  const trade = tradeFor(ui.trade);
  const approved = app.data.records.filter((r) => r.review.state === 'approved');
  const ads = comparisonBase(approved, 'all');
  const allAds = representatives(filterOpportunities(approved, { sector: 'all', query: '', family: 'all', career: 'all', includeHistorical: false, includeUnclear: true, verification: 'all', from: null, to: null }));
  const m = mapTrade(trade, ads, app.data.courses?.skills || {});
  const bridges = bridgeJobs(trade, allAds).filter((b) => b.ready_as_fresher);
  const opens = new Map();
  for (const x of m.related) for (const s of x.missing) opens.set(s, (opens.get(s) || 0) + 1);
  for (const b of bridges) for (const g of b.gaps) opens.set(g.skill, (opens.get(g.skill) || 0) + 1);
  const ranked = [...opens.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // One card per course: skills taught by the same Swift AI Academy course (or the same outside courses) are grouped.
  const keyOf = (s) => { const m = app.data.saa.skill_map[s]; return m && m.fit !== 'none' ? 'saa:' + m.courses[0] : 'ext:' + (offeringsFor(s, app.data.providers).map((o) => o.title).join('|') || s); };
  const jobsFor = (skill) => new Set([...m.related.filter((x) => x.missing.includes(skill)).map((x) => x.source_id), ...bridges.filter((b) => b.gaps.some((g) => g.skill === skill)).map((b) => b.source_id)]);
  const groups = new Map();
  for (const [s] of ranked) { const k = keyOf(s); if (!groups.has(k)) groups.set(k, { skills: [], jobs: new Set() }); const g = groups.get(k); g.skills.push(s); jobsFor(s).forEach((j) => g.jobs.add(j)); }
  const cards = [...groups.values()].sort((a, b) => b.jobs.size - a.jobs.size).slice(0, 6);
  const steps = ranked;
  const saaSteps = steps.filter(([s]) => app.data.saa.skill_map[s]?.fit && app.data.saa.skill_map[s].fit !== 'none');
  const saaIds = [...new Set(saaSteps.map(([s]) => app.data.saa.skill_map[s].courses[0]))];
  const hours = saaIds.reduce((n, id) => n + (app.data.saa.courses.find((c) => c.id === id)?.hours || 0), 0);
  const sectors = [...new Set(app.data.trades.trades.map((t) => t.sector))];
  root.innerHTML = `<div class="section-head">${artBox('learn')}<div><div class="eyebrow">For learners</div><h2>Which skills would get you more jobs here?</h2><p>Pick what you studied. We match it against current job ads in Noida Sectors 62 and 63, show the jobs you could apply for now, and the short courses that open more of them.</p></div></div>
  <div class="filterbar"><div class="filter-row"><div class="fgroup" style="flex:1 1 320px"><label for="learnTrade">I studied</label><select id="learnTrade" class="input"><option ${ui.trade === CLASS12 ? 'selected' : ''}>${CLASS12}</option>${sectors.map((s) => `<optgroup label="ITI · ${esc(s)}">${app.data.trades.trades.filter((t) => t.sector === s).map((t) => `<option ${t.trade === ui.trade ? 'selected' : ''}>${esc(t.trade)}</option>`).join('')}</optgroup>`).join('')}</select></div>
  <p class="note" style="flex:2 1 320px">College or polytechnic learner? See <button class="linkbtn" data-action="tab" data-tab="path">Where to apply</button> for degree and diploma routes.</p></div></div>
  <div class="answers">
    <div class="answer"><span class="label">${icon('work')}Jobs that fit your training</span><span class="big">${m.demand}</span><span class="sub">${m.fresh_ok} open to freshers</span></div>
    <div class="answer go"><span class="label">${icon('north_east')}More jobs with a few new skills</span><span class="big">${bridges.length}</span><span class="sub">Open to freshers outside your trade</span></div>
    <div class="answer"><span class="label">${icon('school')}Swift AI Academy courses that help</span><span class="big">${saaIds.length}</span><span class="sub">${hours ? `About ${hours} hours in total` : 'None needed for these jobs'}</span></div>
    <div class="answer"><span class="label">${icon('construction')}What you already know</span><span class="big">${trade.core_skills.length}</span><span class="sub">${esc(trade.core_skills.slice(0, 3).join(', '))}${trade.core_skills.length > 3 ? '…' : ''}</span></div>
  </div>
  <div class="learn-grid">
    <div class="card"><div class="card-head"><h3>Your skill plan</h3><small>Most useful first</small></div><div class="card-body plan-steps">${cards.length ? cards.map((g) => courseCard(g.skills, g.jobs.size)).join('') : '<p class="note">The current ads ask for nothing you have not already learned. Look at Coming up for future work.</p>'}</div></div>
    <div class="region-side">
      <div class="card"><div class="card-head"><h3>Apply now</h3><small>${m.related.length} ads fit your trade</small></div><div class="card-body">${m.related.length ? `<ul class="ad-list">${m.related.slice(0, 6).map((x) => adRow(x.source_id, x.missing.length ? `<div class="note">Also asks: ${esc(x.missing.join(', '))}</div>` : '')).join('')}</ul>` : '<p class="note">No ads for this trade in the current sample.</p>'}</div></div>
      <div class="card"><div class="card-head"><h3>After a short course</h3><small>${bridges.length} jobs outside your trade</small></div><div class="card-body">${bridges.length ? `<ul class="ad-list">${bridges.slice(0, 6).map((b) => adRow(b.source_id, `<div class="note">Add: ${esc(b.gaps.map((g) => g.skill).join(', '))}</div>`)).join('')}</ul>` : '<p class="note">None open to freshers in the current sample.</p>'}</div></div>
    </div>
  </div>
  <p class="note">Swift AI Academy course details come from the product document; hours are notional and credits and NSQF levels are still to be confirmed. Other providers come from a web search on 24 Oct 2026; check the provider’s page before enrolling.</p>`;
  $('#learnTrade').onchange = (e) => { ui.trade = e.target.value; renderLearn(); };
}

app.actions['saa-start'] = (el) => {
  const c = app.data.saa.courses.find((x) => x.id === el.dataset.course);
  toast(`Demo: this would open “${c?.title}” on Swift AI Academy, with your institute login.`);
};
app.views.learn = renderLearn;
