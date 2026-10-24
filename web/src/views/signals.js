// Internal: market signals for the Swift AI Academy team. Which skills local
// employers ask for, which ones our catalogue teaches, what other providers
// already offer, and what that suggests we build, extend, curate or promote.
import { app } from '../app.js';
import { esc, $, artBox, icon, fmtDate } from '../ui.js';
import { skillSignals, courseDemand, platformSignals, offeringsFor, ACTIONS } from '../../../src/core/signals.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { demandByType } from '../../../src/core/learners.js';

const ui = { show: 'all' };
const COLS = [
  { id: 'saa', label: 'Swift AI Academy' },
  { id: 'nqr', label: 'NSQF (NQR)', providers: ['nqr'] },
  { id: 'nptel', label: 'NPTEL / SWAYAM', providers: ['nptel', 'swayam'] },
  { id: 'nasscom', label: 'nasscom', providers: ['fsp', 'ssc_nasscom'] },
  { id: 'sidh', label: 'Skill India Digital Hub', providers: ['sidh'] },
  { id: 'ssc', label: 'Other skill councils', providers: ['essci', 'asdc', 'cgsc_iasc'] },
];
const PRIO = { high: ['bad', 'High'], medium: ['warn', 'Medium'], low: ['old', 'Low'] };

function cell(row, col) {
  if (col.id === 'saa') {
    if (row.fit === 'full') return `<td class="mx full" title="${esc(row.courses.join(', '))}"><span class="dotm full"></span>${esc(row.courses.join(', '))}</td>`;
    if (row.fit === 'partial') return `<td class="mx part" title="${esc(row.gap || '')}"><span class="dotm part"></span>${esc(row.courses.join(', '))}</td>`;
    return '<td class="mx none"><span class="dotm none"></span>None</td>';
  }
  const offers = row.offerings.filter((o) => col.providers.includes(o.provider));
  if (!offers.length) return '<td class="mx none"><span class="dotm none"></span></td>';
  return `<td class="mx full" title="${esc(offers.map((o) => o.title).join(' · '))}"><span class="dotm full"></span>${offers.length}</td>`;
}

function offerList(offers, max = 3) {
  if (!offers.length) return '<p class="note">No similar course found in the provider scan.</p>';
  const pname = (id) => app.data.providers?.providers?.find((p) => p.id === id)?.name || id;
  return `<ul class="offers">${offers.slice(0, max).map((o) => `<li><a href="${esc(o.url || '#')}" target="_blank" rel="noopener">${esc(o.title)}</a><span class="note">${esc(pname(o.provider))}${o.nsqf_level != null ? ` · NSQF ${esc(o.nsqf_level)}` : ''}${o.duration ? ` · ${esc(o.duration)}` : ''}${o.cost && o.cost !== 'unknown' ? ` · ${esc(o.cost)}` : ''}${o.confidence === 'low' ? ' · low confidence' : ''}</span></li>`).join('')}</ul>${offers.length > max ? `<p class="note">+${offers.length - max} more</p>` : ''}`;
}

function recCard(r) {
  const [cls, label] = PRIO[r.priority];
  const saaCourse = (id) => app.data.saa.courses.find((c) => c.id === id);
  return `<article class="rec-card"><div class="rec-top"><h4>${esc(r.skill)}</h4><span class="trust ${cls}">${label} priority</span></div>
  <p>${esc(r.why)}</p>
  ${r.courses.length ? `<div class="badges">${r.courses.map((id) => `<span class="tag dup">${esc(id)} · ${esc(saaCourse(id)?.title || '')}</span>`).join('')}</div>` : ''}
  ${r.action !== 'promote' ? `<details class="disclose"><summary>Similar courses elsewhere (${r.offerings.length})</summary>${offerList(r.offerings)}</details>` : ''}</article>`;
}

export function renderSignals() {
  const root = $('#signals');
  const locked = app.client.mode === 'api' && !app.can('read:review');
  const head = `<div class="section-head">${artBox('signals')}<div><div class="eyebrow">Internal · Swift AI Academy team</div><h2>What should we build next?</h2><p>Local job ads tell us which skills employers want. We check each one against our own catalogue and against courses already offered by NSQF qualifications, NPTEL, SWAYAM, nasscom and Skill India Digital Hub. The result is a short list: build, extend, curate or promote.</p></div></div>`;
  if (locked) {
    root.innerHTML = `${head}<div class="lock"><h3>${icon('hub')} Team sign-in needed</h3><p>Market signals are for the Swift AI Academy team. Sign in with your team access code to see them.</p><div class="actions"><button class="btn primary" data-action="open-signin">Team sign-in</button></div></div>`;
    return;
  }
  const saa = app.data.saa;
  const approved = app.data.records.filter((r) => r.review.state === 'approved');
  const ads = comparisonBase(approved, 'all');
  const rows = skillSignals({ ads, trades: app.data.trades?.trades || [], saa, providers: app.data.providers });
  const soft = rows.filter((r) => !r.trade);
  const demanded = soft.filter((r) => r.demand || r.bridgeTrades);
  const byAction = (a) => soft.filter((r) => r.action === a);
  const courses = courseDemand(ads, saa);
  const plat = platformSignals({ ads, saa, regions: app.data.regions, announcements: app.data.announcements });
  const scan = app.data.providers;
  const tradeRows = rows.filter((r) => r.trade && r.demand).slice(0, 8);
  const matrixRows = soft.filter((r) => ui.show === 'all' ? r.demand || r.bridgeTrades || r.fit !== 'none' : r.action === ui.show);
  root.innerHTML = `${head}
  ${app.client.mode === 'local' ? '<div class="callout"><strong>Internal view.</strong> In the live pilot this page needs a team sign-in. This copy shows it to everyone for the demo.</div>' : ''}
  <div class="answers">
    <div class="answer"><span class="label">${icon('work')}Skills employers ask for</span><span class="big">${demanded.length}</span><span class="sub">Communication, office, data and AI skills in ${ads.length} current ads</span></div>
    <div class="answer good"><span class="label">${icon('check_circle')}Taught by Swift AI Academy</span><span class="big">${demanded.filter((r) => r.fit === 'full').length}</span><span class="sub">${demanded.filter((r) => r.fit === 'partial').length} more partly taught</span></div>
    <div class="answer wait"><span class="label">${icon('warning')}Not taught yet</span><span class="big">${demanded.filter((r) => r.fit === 'none').length}</span><span class="sub">${byAction('build').length} worth building · ${byAction('curate').length} to curate</span></div>
    <div class="answer"><span class="label">${icon('database')}Similar courses elsewhere</span><span class="big">${scan?.offerings?.length ?? 0}</span><span class="sub">${scan ? `${scan.providers.length} providers · checked ${fmtDate(scan.captured_at)}` : 'Provider scan not loaded'}</span></div>
  </div>

  <div class="card"><div class="card-head"><h3>Recommendations</h3><small>Sorted by local demand. Priority uses ads asking, ads open to freshers, and how many ITI trades need the skill.</small></div>
    <div class="rec-board">${['build', 'extend', 'curate', 'promote'].map((a) => `<div class="rec-col rec-${a}"><h4>${esc(ACTIONS[a].label)} <span class="note">${byAction(a).length}</span></h4>${byAction(a).filter((r) => r.demand || r.bridgeTrades).map(recCard).join('') || '<p class="note">Nothing here right now.</p>'}</div>`).join('')}</div>
  </div>

  <div class="card"><div class="card-head"><h3>Who already teaches these skills?</h3><div class="seg-group" role="group" aria-label="Show">${[['all', 'All'], ['build', 'Build'], ['extend', 'Extend'], ['curate', 'Curate'], ['promote', 'Promote']].map(([v, l]) => `<button class="seg ${ui.show === v ? 'active' : ''}" data-action="sig-show" data-show="${v}" aria-pressed="${ui.show === v}">${l}</button>`).join('')}</div></div>
    <div class="card-body"><div class="table-scroll"><table class="minitable matrix"><thead><tr><th>Skill</th><th>Ads asking</th>${COLS.map((c) => `<th>${esc(c.label)}</th>`).join('')}<th>Suggested action</th></tr></thead><tbody>
    ${matrixRows.map((r) => `<tr><td><strong>${esc(r.skill)}</strong>${r.bridgeTrades ? `<div class="note">${r.bridgeTrades} trades need it for bridge jobs</div>` : ''}</td><td>${r.demand} <span class="note">of ${r.of}</span></td>${COLS.map((c) => cell(r, c)).join('')}<td><span class="act act-${r.action}">${esc(ACTIONS[r.action].label)}</span></td></tr>`).join('')}
    </tbody></table></div>
    <p class="note" style="margin-top:10px"><span class="dotm full"></span> taught · <span class="dotm part"></span> partly taught · <span class="dotm none"></span> not found. Numbers are how many similar courses the scan found. Hover a cell to see course names.</p></div>
  </div>

  <div class="grid2">
    <div class="card"><div class="card-head"><h3>Demand by learner type</h3><small>Ads each type can apply for</small></div><div class="card-body"><div class="bars">${demandByType(ads).map((x) => `<div class="bar-row"><div class="bar-label"><span>${esc(x.label)}</span><strong>${x.ads} <small>of ${ads.length} · ${x.fresh} for freshers · ${x.named} name it</small></strong></div><div class="bar"><i style="width:${(x.ads / ads.length) * 100}%"></i></div></div>`).join('')}</div><p class="note" style="margin-top:10px">Most ads name no qualification, so all three types can apply. Only ${demandByType(ads).map((x) => `${x.named} name ${x.label}`).join(', ')}. Product reading: lead with communication and office skills that every type needs.</p></div></div>
    <div class="card"><div class="card-head"><h3>Partner leads</h3><small>Who to approach next</small></div><div class="card-body"><div class="section-label">Hiring partners: projects coming up</div><ul class="plain">${(app.data.market?.future || []).filter((f) => ['noida_ncr', 'kalyani', 'siliguri'].includes(f.area)).slice(0, 5).map((f) => `<li><strong>${esc(f.title)}</strong> <span class="note">· ${esc(f.status)}${f.skills_implied?.length ? ' · ' + esc(f.skills_implied.slice(0, 2).join(', ')) : ''}</span></li>`).join('')}</ul><div class="section-label" style="margin-top:12px">Channel partners: institutes by area</div><ul class="plain">${['noida_ncr', 'kalyani', 'siliguri'].map((a) => { const list = (app.data.demand?.institutes || []).filter((i) => i.area === a); return `<li><strong>${esc({ noida_ncr: 'Noida and NCR', kalyani: 'Kalyani', siliguri: 'Siliguri' }[a])}</strong> <span class="note">· ${list.filter((i) => i.type === 'iti').length} ITIs, ${list.filter((i) => i.type === 'polytechnic').length} polytechnics, ${list.filter((i) => ['college', 'university'].includes(i.type)).length} colleges</span></li>`; }).join('')}</ul></div></div>
  </div>

  <div class="grid2">
    <div class="card"><div class="card-head"><h3>Demand for our courses here</h3><small>Ads in Sectors 62 and 63 that ask for what each course teaches</small></div>
      <div class="card-body"><div class="table-scroll"><table class="minitable"><thead><tr><th>Course</th><th>Ads</th><th>Freshers</th><th>Level</th><th>Language</th></tr></thead><tbody>${courses.map((c) => `<tr><td><strong>${esc(c.id)}</strong> ${esc(c.title)}<div class="bar ${c.ads ? '' : 'empty'}"><i style="width:${Math.min(100, (c.ads / Math.max(1, ...courses.map((x) => x.ads))) * 100)}%"></i></div></td><td>${c.ads}</td><td>${c.fresh}</td><td>${esc(c.level || '-')}<div class="note">${esc(c.coding || '')}</div></td><td>${esc(c.languages.join(', '))}</td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="margin-top:8px">Zero local ads does not mean zero value: AI/ML and analytics courses mainly serve degree learners and jobs outside these two sectors.</p></div></div>
    <div class="card"><div class="card-head"><h3>Platform signals</h3><span class="tag">Our inference</span></div>
      <div class="card-body plat">${plat.map((p) => `<div class="plat-item"><h4>${icon('lightbulb')}${esc(p.title)}</h4><p class="note"><strong>Evidence:</strong> ${esc(p.evidence)}</p><p>${esc(p.suggestion)}</p></div>`).join('')}</div></div>
  </div>

  <div class="card"><div class="card-head"><h3>Trade skills: refer, don’t build</h3><small>Top ${tradeRows.length} hands-on skills from the ads. ITIs and Sector Skill Councils teach these.</small></div>
    <div class="card-body"><div class="table-scroll"><table class="minitable"><thead><tr><th>Skill</th><th>Ads asking</th><th>Where learners can get it</th></tr></thead><tbody>${tradeRows.map((r) => `<tr><td>${esc(r.skill)}</td><td>${r.demand}</td><td>${r.offerings.length ? offerList(r.offerings, 2) : '<span class="note">ITI trade course or NSTI short course</span>'}</td></tr>`).join('')}</tbody></table></div></div></div>

  <p class="note">${esc(saa.source)}. ${esc(saa.source_note)} ${scan ? esc(scan.method) : ''} Course names, NSQF levels and fees must be checked on the provider’s page before use. Demand is a small sample of ${ads.length} public ads from 16 Oct 2026, not a market survey.</p>`;
}

app.actions['sig-show'] = (el) => { ui.show = el.dataset.show; renderSignals(); };
app.views.signals = renderSignals;
export { offeringsFor };
