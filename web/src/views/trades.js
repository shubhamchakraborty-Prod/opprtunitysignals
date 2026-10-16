// ITI trades: every trade mapped to the local job ads, the extra skills those
// ads ask for, bridge jobs outside the trade, and courses that close the gap.
import { app } from '../app.js';
import { esc, $, $$, sectorTag } from '../ui.js';
import { mapCatalogue, bridgeJobs, bridgeSkillDemand } from '../../../src/core/trades.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { filterOpportunities } from '../../../src/core/filters.js';
import { representatives } from '../../../src/core/dedupe.js';
import { wageText } from '../../../src/core/decisions.js';

const ui = { q: '', sector: 'all', open: null, onlyDemand: false };

function courseText(c) {
  if (!c) return '<span class="note">No course mapped yet</span>';
  return `${esc(c.course)}<br/><span class="note">${esc(c.provider)}${c.url ? ` · <a href="${esc(c.url)}" target="_blank" rel="noopener">details ↗</a>` : ''}</span>`;
}

function adLine(id) {
  const r = app.data.records.find((x) => x.source_id === id);
  if (!r) return esc(id);
  return `<a href="#" data-action="open-record" data-id="${esc(id)}">${esc(r.role_title_raw)}</a> · ${esc(r.employer_identity || 'Employer not named')} · ${esc(wageText(r.wage))} ${sectorTag(r)}`;
}

function detail(m, trade, allAds, courses) {
  const bridges = bridgeJobs(trade, allAds, courses);
  const ready = bridges.filter((b) => b.ready_as_fresher);
  const later = bridges.filter((b) => !b.ready_as_fresher);
  return `<div class="trade-detail">
  <div><div class="section-label">What this trade teaches (summary)</div><div class="badges">${trade.core_skills.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>
  <div><div class="section-label">Job ads here that fit this trade (${m.related.length})</div>${m.related.length ? `<ul class="plain">${m.related.map((x) => `<li>${adLine(x.source_id)}<div class="note">${x.named ? 'The ad or our reading links it to this trade.' : 'Linked by shared skills.'} Has: ${esc(x.matched.join(', ') || '-')}. Missing: ${esc(x.missing.join(', ') || 'nothing named')}.</div></li>`).join('')}</ul>` : '<p class="note">No ads in Sector 62 or 63 for this trade in the current sample. See the jobs outside the trade below.</p>'}</div>
  ${m.gaps.length ? `<div><div class="section-label">To meet these ads, a pass-out also needs</div><div class="table-scroll"><table class="minitable"><tr><th>Extra skill</th><th>Ads asking</th><th>How to learn it</th></tr>${m.gaps.map((g) => `<tr><td>${esc(g.skill)}</td><td>${g.count} of ${m.related.length}</td><td>${courseText(g.course)}</td></tr>`).join('')}</table></div></div>` : ''}
  ${m.requirements.length ? `<div class="callout warn"><strong>Firm requirements a course cannot fix:</strong> ${esc(m.requirements.join(' '))} An apprenticeship or first job builds this.</div>` : ''}
  <div><div class="section-label">Jobs outside the trade a learner could reach (bridge jobs)</div>
  ${ready.length ? `<p class="note">Open to freshers once these skills are added:</p><div class="table-scroll"><table class="minitable"><tr><th>Job</th><th>Skills to add</th><th>How to learn them</th></tr>${ready.map((b) => `<tr><td>${adLine(b.source_id)}${b.unknowns.length ? `<div class="note">${esc(b.unknowns.join(' '))}</div>` : ''}</td><td>${esc(b.gaps.map((g) => g.skill).join(', '))}</td><td>${b.gaps.map((g) => `<div>${courseText(g.course)}</div>`).join('')}</td></tr>`).join('')}</table></div>` : '<p class="note">None open to freshers in the current sample.</p>'}
  ${later.length ? `<details class="disclose" style="margin-top:8px"><summary>Reachable later, after experience or another qualification (${later.length})</summary><ul class="plain">${later.map((b) => `<li>${adLine(b.source_id)}<div class="note">Add: ${esc(b.gaps.map((g) => g.skill).join(', '))}. Also needs: ${esc(b.blockers.join('; '))}.</div></li>`).join('')}</ul></details>` : ''}</div>
  </div>`;
}

function row(m, cat) {
  const open = ui.open === m.trade;
  const t = cat.trades.find((x) => x.trade === m.trade);
  return `<div class="card trade ${open ? 'open' : ''}"><button class="trade-row" data-action="trade-open" data-trade="${esc(m.trade)}" aria-expanded="${open}"><div><b>${esc(m.trade)}</b><span class="note">${esc(m.sector)}</span></div><div class="trade-stats"><span class="${m.demand ? 'trust warn' : 'trust old'}">${m.demand ? `${m.demand} related ad${m.demand > 1 ? 's' : ''}` : 'No ads here yet'}</span>${m.demand ? `<span class="tag">${m.fresh_ok} open to freshers</span>` : ''}${m.gaps[0] ? `<span class="tag">Add: ${esc(m.gaps.slice(0, 2).map((g) => g.skill).join(', '))}</span>` : ''}</div></button>${open ? detail(m, t, ctx.allAds, ctx.courses) : ''}</div>`;
}
const ctx = { allAds: [], courses: {} };

export function renderTrades() {
  const cat = app.data.trades;
  const courses = app.data.courses?.skills || {};
  if (!cat) { $('#trades').innerHTML = '<p class="note">Trade catalogue not loaded.</p>'; return; }
  const approved = app.data.records.filter((r) => r.review.state === 'approved');
  const ads = comparisonBase(approved, 'all');
  const allAds = representatives(filterOpportunities(approved, { sector: 'all', query: '', family: 'all', career: 'all', includeHistorical: false, includeUnclear: true, verification: 'all', from: null, to: null }));
  const mapped = mapCatalogue(cat.trades, ads, courses);
  ctx.allAds = allAds;
  ctx.courses = courses;
  const sectors = [...new Set(cat.trades.map((t) => t.sector))];
  const doors = bridgeSkillDemand(ads, courses).slice(0, 8);
  const q = ui.q.toLowerCase();
  const shown = mapped.filter((m) => (ui.sector === 'all' || m.sector === ui.sector) && (!q || m.trade.toLowerCase().includes(q) || m.core_skills.join(' ').toLowerCase().includes(q)) && (!ui.onlyDemand || m.demand));
  $('#trades').innerHTML = `<div class="section-head"><div><h2>Which ITI trades fit the jobs here, and what is missing?</h2><p>All ${cat.trades.length} ITI trades in our list, matched against the ${ads.length} current job ads in Sectors 62 and 63. For each trade you see the ads it fits, the extra skills those ads ask for, jobs outside the trade a learner could reach, and short courses that close the gap.</p></div></div>
  <div class="answers">
    <div class="answer"><span class="label">ITI trades listed</span><span class="big">${cat.trades.length}</span><span class="sub">${sectors.length} sectors</span></div>
    <div class="answer go"><span class="label">Trades with related ads here</span><span class="big">${mapped.filter((m) => m.demand).length}</span><span class="sub">Most are electrical, electronics and machine trades</span></div>
    <div class="answer wait"><span class="label">Ads asking for English</span><span class="big">${doors.find((d) => d.skill === 'English communication')?.ads ?? 0}</span><span class="sub">of ${ads.length} ads; the most common extra skill</span></div>
    <div class="answer"><span class="label">Ads asking for computer, data or AI skills</span><span class="big">${ads.filter((r) => r.skills.some((s) => /computer|excel|reporting|power bi|data|ai tools|typing/i.test(s.name))).length}</span><span class="sub">Office, reporting, data entry and annotation</span></div>
  </div>
  <div class="card"><div class="card-head"><h3>Skills that open the most doors, and how to learn them</h3><small>Across current ads in Sectors 62 and 63</small></div><div class="card-body"><div class="table-scroll"><table class="minitable"><tr><th>Skill to add</th><th>Ads asking</th><th>Suggested course</th></tr>${doors.map((d) => `<tr><td><strong>${esc(d.skill)}</strong></td><td>${d.ads} of ${d.of}</td><td>${courseText(d.course)}</td></tr>`).join('')}</table></div><p class="note" style="margin-top:8px">${esc(app.data.courses?.note || '')}</p></div></div>
  <div class="filterbar"><div class="filter-row">
    <div class="fgroup search"><label for="tradeQ">Find a trade or skill</label><input id="tradeQ" class="input" type="search" value="${esc(ui.q)}" placeholder="e.g. Electrician, soldering, COPA"/></div>
    <label class="check"><input type="checkbox" id="tradeOnly" ${ui.onlyDemand ? 'checked' : ''}/> Only trades with ads here</label>
  </div><div class="chips">${['all', ...sectors].map((s) => `<button class="fchip ${ui.sector === s ? 'active' : ''}" data-action="trade-sector" data-sector="${esc(s)}" aria-pressed="${ui.sector === s}">${s === 'all' ? 'All sectors' : esc(s)} <span class="n">${s === 'all' ? mapped.length : mapped.filter((m) => m.sector === s).length}</span></button>`).join('')}</div></div>
  <div class="trade-list">${shown.filter((m) => m.demand).map((m) => row(m, cat)).join('') || '<p class="note">No trades with ads here match.</p>'}</div>
  ${shown.some((m) => !m.demand) ? `<details class="disclose trade-rest" ${ui.q || ui.open && shown.some((m) => !m.demand && m.trade === ui.open) ? 'open' : ''}><summary>Trades with no ads in Sectors 62 and 63 yet (${shown.filter((m) => !m.demand).length})</summary><p class="note" style="margin:8px 0">Open a trade to see jobs outside it that a learner could reach with a few extra skills.</p><div class="trade-list">${shown.filter((m) => !m.demand).map((m) => row(m, cat)).join('')}</div></details>` : ''}
  <p class="note">${esc(cat.note)} <a href="${esc(cat.source_url)}" target="_blank" rel="noopener">Bharat Skills CTS list ↗</a></p>`;
  const qi = $('#tradeQ');
  qi.oninput = (e) => { ui.q = e.target.value; const pos = e.target.selectionStart; renderTrades(); const n = $('#tradeQ'); n.focus(); n.setSelectionRange(pos, pos); };
  $('#tradeOnly').onchange = (e) => { ui.onlyDemand = e.target.checked; renderTrades(); };
}

app.actions['trade-sector'] = (el) => { ui.sector = el.dataset.sector; renderTrades(); };
app.actions['trade-open'] = (el) => { ui.open = ui.open === el.dataset.trade ? null : el.dataset.trade; renderTrades(); };
export function openTrade(name) { ui.open = name; ui.q = ''; ui.sector = 'all'; ui.onlyDemand = false; }

app.views.trades = renderTrades;
