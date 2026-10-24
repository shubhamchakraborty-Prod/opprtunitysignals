// Market overview: ten years of change, demand at three levels (India, the
// state, 100 km around the area), investments and what is coming, linked to
// the skills each one needs and the institutes nearby that teach them.
import { app } from '../app.js';
import { esc, $, artBox, icon, fmtDate } from '../ui.js';

const ui = { scope: 'local', open: null };
const AREA = {
  noida_ncr: { name: 'Noida and NCR', state: 'uttar_pradesh', stateName: 'Uttar Pradesh', local: ['noida_ncr'], levels: ['noida_ncr'] },
  kalyani: { name: 'Kalyani and the Kolkata region', state: 'west_bengal', stateName: 'West Bengal', local: ['kalyani'], levels: ['kolkata_region', 'kalyani'] },
  siliguri: { name: 'Siliguri and North Bengal', state: 'west_bengal', stateName: 'West Bengal', local: ['siliguri'], levels: ['siliguri'] },
};
const KIND = { investment: 'Investment', policy: 'Policy', infrastructure: 'Infrastructure', factory: 'Factory', institution: 'Institution', scheme: 'Scheme', summit: 'Investor summit' };
const SKILL_WORDS = [
  [/electronic|smt|pcb|semicon|chip|osat|display|mobile|assembly/i, /electronic|ece|electrical|instrument|hardware|fitter/i],
  [/data cent|cloud|it |software|gcc|ai |data|digital/i, /cse|computer|it\b|information|data|copa|bca|mca/i],
  [/vehicle|auto|ev\b|battery/i, /mechanic|automobile|mechanical|electrical/i],
  [/logistic|warehouse|airport|port|rail|aviation/i, /mechanical|civil|electrical|copa|management|mba/i],
  [/construct|civil|infra|building/i, /civil|survey|architecture|mason|draughtsman|fitter|welder/i],
  [/medical|health|hospital|device/i, /bio|medical|electronic|instrument/i],
  [/film|media|animation/i, /journalism|arts|design|animation/i],
  [/tea|food|agri/i, /food|tea|agri|bio/i],
];

/** Institutes in the area whose trades or branches fit the skills an item implies. */
function institutesFor(item, area) {
  const text = [item.title, item.detail, ...(item.skills_implied || [])].join(' ');
  const pats = SKILL_WORDS.filter(([a]) => a.test(text)).map(([, b]) => b);
  if (!pats.length) return [];
  return (app.data.demand?.institutes || []).filter((i) => i.area === area && pats.some((p) => p.test((i.offers || []).join(' ') + ' ' + i.name))).slice(0, 4);
}
const typeLabel = { iti: 'ITI', polytechnic: 'Polytechnic', college: 'College', university: 'University' };
const crore = (n) => (n >= 100000 ? `₹${(n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} lakh crore` : `₹${Math.round(n).toLocaleString('en-IN')} crore`);

function yearStrip(items) {
  const years = Array.from({ length: 11 }, (_, i) => 2016 + i);
  const max = Math.max(1, ...years.map((y) => items.filter((t) => t.year === y).length));
  return `<div class="year-strip" role="list">${years.map((y) => {
    const its = items.filter((t) => t.year === y);
    return `<div class="ys-col" role="listitem"><div class="ys-dots">${its.map((t) => `<button class="ys-dot k-${esc(t.kind)}" data-action="tl-open" data-key="${esc(t.title)}" title="${esc(t.title)}" aria-label="${y}: ${esc(t.title)}"></button>`).join('')}</div><div class="ys-bar" style="height:${(its.length / max) * 40}px"></div><span>${y}</span></div>`;
  }).join('')}</div>`;
}

export function renderMarket() {
  const root = $('#market');
  const m = app.data.market;
  const d = app.data.demand;
  if (!m || !d) { root.innerHTML = '<p class="note">Market data not loaded.</p>'; return; }
  const areaId = app.area();
  const A = AREA[areaId];
  const scopes = { national: ['national'], state: [A.state], local: A.local };
  const levelFor = { national: ['national'], state: [A.state], local: A.levels };
  const tl = m.timeline.filter((t) => scopes[ui.scope].includes(t.scope)).sort((a, b) => (a.date || `${a.year}-12-31`).localeCompare(b.date || `${b.year}-12-31`));
  const inds = d.indicators.filter((i) => levelFor[ui.scope].includes(i.level));
  const demand = d.in_demand.filter((i) => levelFor[ui.scope].includes(i.level) || (ui.scope !== 'national' && i.level === A.state));
  const future = m.future.filter((f) => (ui.scope === 'national' ? f.area === 'national' : ui.scope === 'state' ? f.area === A.state : A.local.includes(f.area)));
  const amounts = tl.filter((t) => t.amount_inr_crore).sort((a, b) => b.amount_inr_crore - a.amount_inr_crore).slice(0, 5);
  const scopeName = { national: 'India', state: A.stateName, local: `${A.name} (about 100 km)` };
  root.innerHTML = `<div class="section-head">${artBox('market')}<div><div class="eyebrow">Market overview · ${esc(scopeName[ui.scope])}</div><h2>Ten years of change, and what comes next</h2><p>What has happened since 2016, how strong skill demand is today, the investments announced, and the work they could create. Each future project is linked to the skills it needs and the institutes nearby that teach them.</p></div></div>
  <div class="filterbar"><div class="filter-row"><div class="fgroup"><span class="flabel" id="scopeLbl">Show</span><div class="seg-group" role="group" aria-labelledby="scopeLbl">${[['national', 'India'], ['state', A.stateName], ['local', 'Within 100 km']].map(([v, l]) => `<button class="seg ${ui.scope === v ? 'active' : ''}" data-action="mk-scope" data-scope="${v}" aria-pressed="${ui.scope === v}">${esc(l)}</button>`).join('')}</div></div><p class="note" style="flex:1 1 300px">Area follows the location picker at the top: ${esc(A.name)}.</p></div></div>

  <div class="card"><div class="card-head"><h3>Skill demand today</h3><small>${inds.length} indicators · ${esc(scopeName[ui.scope])}</small></div>
    <div class="ind-grid">${inds.length ? inds.slice(0, 8).map((i) => `<div class="ind"><span class="ind-v ${String(i.value).length > 18 ? 'long' : ''}">${esc(i.value)}</span><span class="ind-m">${esc(i.metric)}</span><span class="note">${esc(i.period)} · <a href="${esc(i.source.url)}" target="_blank" rel="noopener">${esc(i.source.label.split(',')[0])}</a>${i.confidence === 'low' ? ' · low confidence' : ''}</span></div>`).join('') : '<p class="note" style="padding:0 20px 16px">No published figures found at this level. See the state and national views.</p>'}</div>
    ${inds.length > 8 ? `<details class="disclose" style="padding:0 20px 16px"><summary>All ${inds.length} indicators</summary><div class="table-scroll" style="margin-top:8px"><table class="minitable"><thead><tr><th>Indicator</th><th>Value</th><th>Period</th><th>Source</th></tr></thead><tbody>${inds.map((i) => `<tr><td>${esc(i.metric)}</td><td>${esc(i.value)}</td><td>${esc(i.period)}</td><td><a href="${esc(i.source.url)}" target="_blank" rel="noopener">${esc(i.source.label)}</a></td></tr>`).join('')}</tbody></table></div></details>` : ''}
  </div>

  <div class="card"><div class="card-head"><h3>2016 to 2026: what happened</h3><small>${tl.length} events · tap a dot</small></div>
    <div class="card-body">${yearStrip(tl)}<div class="legend" style="margin-top:10px">${Object.entries(KIND).map(([k, l]) => `<span><i class="k-${k}"></i>${esc(l)}</span>`).join('')}</div></div>
    <ol class="timeline">${tl.slice().reverse().map((t) => `<li class="${ui.open === t.title ? 'open' : ''}" id="tl-${esc(t.title.replace(/\W+/g, '-'))}"><div class="tl-when">${t.date ? fmtDate(t.date) : t.year}</div><div class="tl-body"><div class="badges"><span class="tag tk-${esc(t.kind)}">${esc(KIND[t.kind] || t.kind)}</span>${t.amount_inr_crore ? `<span class="tag">${crore(t.amount_inr_crore)}${t.kind === 'summit' ? ' in MoUs' : ''}</span>` : ''}${t.confidence !== 'high' ? `<span class="tag">${esc(t.confidence)} confidence</span>` : ''}</div><h4>${esc(t.title)}</h4><p>${esc(t.detail)}</p>${t.skills_implied?.length ? `<p class="note">Skills it needs (our reading): ${esc(t.skills_implied.join(', '))}</p>` : ''}<a class="note" href="${esc(t.source.url)}" target="_blank" rel="noopener">${esc(t.source.label)} ${icon('open_in_new')}</a></div></li>`).join('') || '<li class="note">No events found at this level.</li>'}</ol>
  </div>

  <div class="grid2">
    <div class="card"><div class="card-head"><h3>Largest announcements</h3><small>Stated amounts; summit figures are MoU totals, not money spent</small></div><div class="card-body">${amounts.length ? `<div class="bars">${amounts.map((t) => `<div class="bar-row"><div class="bar-label"><span>${esc(t.title)}</span><strong>${crore(t.amount_inr_crore)}</strong></div><div class="bar"><i style="width:${(t.amount_inr_crore / amounts[0].amount_inr_crore) * 100}%"></i></div></div>`).join('')}</div>` : '<p class="note">No amounts stated at this level.</p>'}</div></div>
    <div class="card"><div class="card-head"><h3>Skills and roles in demand</h3><small>From hiring reports</small></div><div class="card-body"><ul class="demand-list">${demand.map((x) => `<li><strong>${esc(x.skill_or_role)}</strong><div class="badges">${x.learner_types.map((l) => `<span class="tag">${esc({ college: 'College', iti: 'ITI', polytechnic: 'Polytechnic' }[l] || l)}</span>`).join('')}</div><p class="note">${esc(x.detail)} <a href="${esc(x.source.url)}" target="_blank" rel="noopener">Source</a></p></li>`).join('') || '<li class="note">No reports found at this level.</li>'}</ul></div></div>
  </div>

  <div class="card"><div class="card-head"><h3>What is coming</h3><small>${future.length} projects · announcements, not vacancies</small></div>
    <div class="future-grid">${future.map((f) => { const inst = institutesFor(f, areaId); return `<article class="future"><div class="badges"><span class="trust ${/construction|approved/i.test(f.status) ? 'plan' : 'old'}">${esc(f.status)}</span>${f.expected ? `<span class="tag">Expected ${esc(f.expected)}</span>` : ''}</div><h4>${esc(f.title)}</h4><p>${esc(f.detail)}</p>${f.jobs_claimed ? `<p class="note"><strong>Jobs claimed:</strong> ${esc(f.jobs_claimed)}</p>` : ''}${f.skills_implied?.length ? `<div class="section-label" style="margin:8px 0 4px">Skills it will need</div><div class="badges">${f.skills_implied.map((s) => `<span class="tag suit">${esc(s)}</span>`).join('')}</div>` : ''}${inst.length ? `<div class="section-label" style="margin:10px 0 4px">Nearby institutes that teach related trades</div><ul class="inst-mini">${inst.map((i) => `<li>${icon('location_city')}<span>${esc(i.name)} <span class="note">${esc(typeLabel[i.type])}</span></span></li>`).join('')}</ul>` : ''}<a class="note" href="${esc(f.source.url)}" target="_blank" rel="noopener">${esc(f.source.label)} ${icon('open_in_new')}</a></article>`; }).join('') || '<p class="note" style="padding:0 20px 20px">No projects found at this level.</p>'}</div>
  </div>
  <p class="note">${esc(m.method)} ${esc(d.method)} Amounts, dates and job numbers are as stated by companies, governments or news reports. Skills needed are our reading. Captured ${fmtDate(m.captured_at)}.</p>`;
}

app.actions['mk-scope'] = (el) => { ui.scope = el.dataset.scope; ui.open = null; renderMarket(); };
app.actions['tl-open'] = (el) => {
  ui.open = el.dataset.key;
  renderMarket();
  document.getElementById('tl-' + ui.open.replace(/\W+/g, '-'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
app.views.market = renderMarket;
