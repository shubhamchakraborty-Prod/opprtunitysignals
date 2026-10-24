// Institutes nearby: ITIs, polytechnics and colleges within about 100 km of
// the chosen area, on the same zoomable map, with the skills local employers
// and announced projects ask for, and how Swift AI Academy can partner.
import { app } from '../app.js';
import { esc, $, $$, artBox, icon } from '../ui.js';
import { createStreetMap, attachSvgZoom, projector } from '../geo-map.js';

const ui = { type: 'all', selected: null };
const TYPE = { iti: { label: 'ITI', cls: 'k-training', text: 'I' }, polytechnic: { label: 'Polytechnic', cls: 'k-cluster', text: 'P' }, college: { label: 'College', cls: 'k-park', text: 'C' }, university: { label: 'University', cls: 'k-employer', text: 'U' } };
const NAME = { noida_ncr: 'Noida and NCR', kalyani: 'Kalyani', siliguri: 'Siliguri' };
const PARTNER = {
  iti: ['Workplace Communication Pro for every trade batch', 'Spreadsheets to SQL for COPA and office-bound learners', 'Interview and group discussion practice before campus drives'],
  polytechnic: ['Business Data Analyst pathway alongside the diploma', 'Workplace Communication for supervisor and quality roles', 'Apprenticeship (NATS) readiness sessions'],
  college: ['Applied AI/ML and Business Data Analyst pathways as credit electives', 'Workplace Communication for placement season', 'Market signals for the placement cell'],
  university: ['Applied AI/ML and Business Data Analyst pathways as credit electives', 'Workplace Communication for placement season', 'Market signals for the placement cell'],
};
let street = null;
let streetKey = '';

function bounds(list) {
  const lats = list.map((i) => i.lat), lons = list.map((i) => i.lon);
  const pad = 0.04;
  return [[Math.min(...lats) - pad, Math.min(...lons) - pad], [Math.max(...lats) + pad, Math.max(...lons) + pad]];
}

function sketch(list, b) {
  const W = 700, H = 420, p = projector(b, W, H);
  const towns = new Map();
  for (const i of list) { const t = i.town.split(/[(,]/)[0].trim(); if (!towns.has(t)) towns.set(t, []); towns.get(t).push(i); }
  const labels = [...towns.entries()].map(([t, xs]) => { const [x, y] = p([xs.reduce((n, i) => n + i.lat, 0) / xs.length, xs.reduce((n, i) => n + i.lon, 0) / xs.length]); return `<text class="sch-town" x="${x}" y="${y - 22}" text-anchor="middle">${esc(t.toUpperCase())}</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Simplified sketch of institutes around ${esc(NAME[app.area()])}, not geographically exact"><rect class="sch-bg" width="${W}" height="${H}"/>${labels}${list.map((i) => { const [x, y] = p([i.lat, i.lon]); const t = TYPE[i.type]; return `<g class="fpin" tabindex="0" role="button" data-inst="${esc(i.name)}" aria-label="${esc(i.name)} (${t.label})"><circle class="ring kpin ${t.cls} ${ui.selected === i.name ? 'sel' : ''}" cx="${x}" cy="${y}" r="13" stroke-width="3"/><text x="${x}" y="${y + 4}" font-size="11" font-weight="600" text-anchor="middle">${t.text}</text><title>${esc(i.name)}</title></g>`; }).join('')}</svg>`;
}

function detail(i, area) {
  if (!i) return `<div class="card card-body"><p class="note">Tap an institute on the map or in the list.</p></div>`;
  const t = TYPE[i.type];
  const fut = (app.data.market?.future || []).filter((f) => f.area === area).slice(0, 3);
  return `<div class="card feed"><div class="feed-head"><div><h3>${esc(i.name)}</h3><div class="note">${esc(t.label)} · ${esc(i.town)}</div></div><span class="trust plan">${esc(t.label)}</span></div>
  ${i.offers?.length ? `<div><div class="section-label">Trades and branches</div><div class="badges">${i.offers.map((o) => `<span class="tag">${esc(o)}</span>`).join('')}</div></div>` : '<p class="note">Trades or branches not listed in our sources.</p>'}
  ${fut.length ? `<div><div class="section-label">Coming up nearby</div><ul class="plain">${fut.map((f) => `<li>${esc(f.title)} <span class="note">· ${esc(f.status)}${f.skills_implied?.length ? ' · needs ' + esc(f.skills_implied.slice(0, 3).join(', ')) : ''}</span></li>`).join('')}</ul></div>` : ''}
  <div><div class="section-label">How Swift AI Academy can partner</div><ul class="plain">${PARTNER[i.type].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <p class="note">${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">Institute website ${icon('open_in_new')}</a> · ` : ''}Map position: ${esc(i.position || 'unknown')}.</p></div>`;
}

export function renderInstitutes() {
  const root = $('#institutes');
  const d = app.data.demand;
  if (!d) { root.innerHTML = '<p class="note">Institute data not loaded.</p>'; return; }
  const area = app.area();
  const all = d.institutes.filter((i) => i.area === area && i.lat != null);
  const list = all.filter((i) => ui.type === 'all' || i.type === ui.type || (ui.type === 'college' && i.type === 'university'));
  const sel = all.find((i) => i.name === ui.selected) || null;
  const count = (t) => all.filter((i) => i.type === t || (t === 'college' && i.type === 'university')).length;
  const b = bounds(all.length ? all : d.institutes.filter((i) => i.lat != null));
  root.innerHTML = `<div class="section-head">${artBox('institutes')}<div><div class="eyebrow">For institutions · ${esc(NAME[area])}</div><h2>Institutes within 100 km, and what local employers need from them</h2><p>ITIs, polytechnics and colleges around ${esc(NAME[area])}, with their trades and branches, the projects coming up nearby, and where Swift AI Academy courses fit in. Switch area with the location picker at the top.</p></div></div>
  <div class="answers">
    <div class="answer"><span class="label">${icon('location_city')}Institutes listed</span><span class="big">${all.length}</span><span class="sub">Within about 100 km</span></div>
    <div class="answer"><span class="label">${icon('construction')}ITIs</span><span class="big">${count('iti')}</span><span class="sub">Government and private</span></div>
    <div class="answer"><span class="label">${icon('engineering')}Polytechnics</span><span class="big">${count('polytechnic')}</span><span class="sub">Diploma programmes</span></div>
    <div class="answer"><span class="label">${icon('school')}Colleges and universities</span><span class="big">${count('college')}</span><span class="sub">Degree programmes</span></div>
  </div>
  <div class="filterbar"><div class="chips">${[['all', 'All'], ['iti', 'ITIs'], ['polytechnic', 'Polytechnics'], ['college', 'Colleges']].map(([v, l]) => `<button class="fchip ${ui.type === v ? 'active' : ''}" data-action="inst-type" data-type="${v}" aria-pressed="${ui.type === v}">${l}</button>`).join('')}</div></div>
  <div class="explore">
    <div class="card map-card"><div class="card-head"><h2>Where they are</h2><small>Scroll or + and − to zoom</small></div>
      <div class="mapwrap"><div class="fallback" id="instSketch">${sketch(list, b)}<div class="fallback-banner"><strong>Simplified sketch, not geographically exact.</strong> <span id="instReason">Loading the street map…</span></div></div><div id="instMap" class="map"></div></div>
      <div class="map-foot"><div class="legend">${Object.values(TYPE).map((t) => `<span><i class="kdot ${t.cls}"></i>${esc(t.label)}</span>`).join('')}</div><p>Most positions are approximate (town or campus area). Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>.</p></div></div>
    <div class="region-side"><div id="instDetail">${detail(sel, area)}</div>
      <div class="card"><div class="card-head"><h3>Institutes (${list.length})</h3></div><div class="cards">${list.map((i) => `<article class="job ${ui.selected === i.name ? 'selected' : ''}" role="button" tabindex="0" data-action="inst" data-name="${esc(i.name)}"><div class="badges"><span class="trust plan">${esc(TYPE[i.type].label)}</span></div><h4>${esc(i.name)}</h4><div class="facts">${esc(i.town)}${i.offers?.length ? ' · ' + esc(i.offers.slice(0, 4).join(', ')) : ''}</div></article>`).join('')}</div></div></div>
  </div>
  <p class="note">${esc(d.method)} Institute lists are a starting set, not a census. Check AISHE, NCVT MIS and AICTE for the full list.</p>`;
  const host = $('#instSketch');
  attachSvgZoom(/** @type {any} */ (host.querySelector('svg')), host);
  $$('#instSketch .fpin').forEach((el) => { el.onclick = () => pick(el.dataset.inst); });
  const key = area + ui.type;
  const el = $('#instMap');
  el.style.visibility = 'hidden';
  streetKey = key;
  createStreetMap(el, { center: [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2], zoom: 10, bounds: /** @type {any} */ (b) }).then((m) => {
    if (streetKey !== key) return;
    street = m;
    el.style.visibility = 'visible';
    host.style.display = 'none';
    street.setPins(list.map((i) => ({ id: i.name, lat: i.lat, lon: i.lon, label: i.name, cls: TYPE[i.type].cls, text: TYPE[i.type].text })), (p) => pick(p.id));
  }).catch((e) => { el.style.display = 'none'; const r = $('#instReason'); if (r) r.textContent = e.message; });
}

function pick(name) {
  ui.selected = name;
  const i = app.data.demand.institutes.find((x) => x.name === name);
  $('#instDetail').innerHTML = detail(i, app.area());
  $$('#institutes .cards .job').forEach((j) => j.classList.toggle('selected', j.dataset.name === name));
  $$('#instSketch .kpin').forEach((c) => c.classList.toggle('sel', c.parentElement.dataset.inst === name));
}

app.actions['inst-type'] = (el) => { ui.type = el.dataset.type; renderInstitutes(); };
app.actions.inst = (el) => pick(el.dataset.name);
app.views.institutes = renderInstitutes;
