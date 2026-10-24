// Kalyani and Siliguri: where industry is, on the same zoomable map, with the
// same honesty rules (presence is not a vacancy; positions are approximate).
import { app } from '../app.js';
import { esc, $, $$, artBox } from '../ui.js';
import { createStreetMap, attachSvgZoom, projector } from '../geo-map.js';
import { openTrade } from './trades.js';

const KIND = {
  industrial_park: { label: 'Industrial park', cls: 'k-park', text: 'P' },
  industrial_cluster: { label: 'Industry cluster', cls: 'k-cluster', text: 'I' },
  employer_group: { label: 'Named employers', cls: 'k-employer', text: 'E' },
  logistics: { label: 'Logistics', cls: 'k-logistics', text: 'L' },
  training: { label: 'Training (ITI)', cls: 'k-training', text: 'T' },
  proposal: { label: 'Proposed', cls: 'k-proposal', text: '+' },
};
const ui = { region: 'kalyani', selected: null };
let street = null;
let streetRegion = null;

function pinsFor(reg) {
  return [
    ...reg.sites.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, kind: s.kind, label: `${s.name} (${KIND[s.kind].label})` })),
    ...reg.announcements.map((a) => ({ id: a.id, lat: a.lat, lon: a.lon, kind: 'proposal', label: `${a.title} (proposed)` })),
  ];
}

function sketch(reg) {
  const W = 700, H = 420;
  const p = projector(reg.bounds, W, H);
  const [cx, cy] = p(reg.centre);
  const pins = pinsFor(reg).map((x) => {
    const [x0, y0] = p([x.lat, x.lon]);
    const sel = ui.selected === x.id;
    return `<g class="fpin" tabindex="0" role="button" data-site="${esc(x.id)}" aria-label="${esc(x.label)}"><circle class="ring kpin ${KIND[x.kind].cls} ${sel ? 'sel' : ''}" cx="${x0}" cy="${y0}" r="13" stroke-width="3"/><text x="${x0}" y="${y0 + 4}" font-size="11" font-weight="700" text-anchor="middle">${KIND[x.kind].text}</text><title>${esc(x.label)}</title></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Simplified sketch of ${esc(reg.name)}, not geographically exact"><rect class="sch-bg" width="${W}" height="${H}"/><circle class="sch-62" cx="${cx}" cy="${cy}" r="70" stroke-width="2" opacity=".6"/><text class="sch-t62" x="${cx}" y="${cy - 78}" text-anchor="middle" font-size="16" font-weight="700">${esc(reg.name.toUpperCase())}</text>${pins}</svg>`;
}

function siteDetail(reg) {
  const s = reg.sites.find((x) => x.id === ui.selected);
  const a = reg.announcements.find((x) => x.id === ui.selected);
  if (s) return `<div class="card feed"><div class="feed-head"><div><h3>${esc(s.name)}</h3><div class="note">${esc(KIND[s.kind].label)} · ${esc(reg.name)}</div></div><span class="trust old">Presence, not a vacancy</span></div><p>${esc(s.what)}</p><div><div class="section-label">Industries</div><div class="badges">${s.sectors.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div></div>${s.trades.length ? `<div><div class="section-label">ITI trades likely to be useful (our reading)</div><div class="badges">${s.trades.map((t) => `<button class="tag linktag" data-action="goto-trade" data-trade="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>` : ''}<p class="note">Source: <a href="${esc(s.source.url)}" target="_blank" rel="noopener">${esc(s.source.label)} ↗</a> · ${esc(s.source.date)}. Pin position is approximate.</p></div>`;
  if (a) return `<div class="card feed"><div class="feed-head"><div><h3>${esc(a.title)}</h3><div class="note">${esc(a.where)}</div></div><span class="trust old">${esc(a.stage)}</span></div><p>${esc(a.detail)}</p><p class="note">Source: <a href="${esc(a.source.url)}" target="_blank" rel="noopener">${esc(a.source.label)} ↗</a></p></div>`;
  return '<div class="card card-body"><p class="note">Tap a pin on the map or a place in the list to see what is there.</p></div>';
}

export function renderRegions() {
  const data = app.data.regions;
  if (!data) { $('#regions').innerHTML = '<p class="note">Region data not loaded.</p>'; return; }
  const reg = data.regions.find((r) => r.id === ui.region) || data.regions[0];
  $('#regions').innerHTML = `<div class="section-head">${artBox('regions')}<div><div class="eyebrow">${esc(reg.district)}, West Bengal</div><h2>Industry around ${esc(reg.name)}</h2><p>${esc(reg.summary)} Use the location picker at the top to switch between Kalyani, Siliguri and Noida. These are places, not job vacancies.</p></div></div>
  <div class="callout warn"><strong>Job ads:</strong> ${esc(reg.job_search)}</div>
  <div class="explore">
    <div class="card map-card"><div class="card-head"><h2>Where industry is in ${esc(reg.name)}</h2><small>Zoom with + and −, drag to move</small></div>
      <div class="mapwrap"><div class="fallback" id="regionSketch">${sketch(reg)}<div class="fallback-banner" id="regionBanner"><strong>Simplified sketch - not geographically exact.</strong> <span id="regionReason">Loading the street map…</span></div></div><div id="regionMap" class="map"></div></div>
      <div class="map-foot"><div class="legend">${Object.values(KIND).map((k) => `<span><i class="kdot ${k.cls}"></i>${esc(k.label)}</span>`).join('')}</div><p>Pins are approximate placements from official and published descriptions, not surveyed addresses.</p></div>
    </div>
    <div class="region-side"><div id="siteDetail">${siteDetail(reg)}</div>
      <div class="card"><div class="card-head"><h3>Places (${reg.sites.length + reg.announcements.length})</h3></div><div class="cards">${[...reg.sites.map((s) => ({ ...s, k: s.kind })), ...reg.announcements.map((a) => ({ id: a.id, name: a.title, what: a.detail, k: 'proposal', sectors: [] }))].map((s) => `<article class="job ${ui.selected === s.id ? 'selected' : ''}" role="button" tabindex="0" data-action="site" data-id="${esc(s.id)}"><div class="badges"><span class="trust old">${esc(KIND[s.k].label)}</span></div><h4>${esc(s.name)}</h4><div class="facts">${esc((s.sectors || []).join(' · '))}</div></article>`).join('')}</div></div>
    </div>
  </div>
  <p class="note">${esc(data.note)}</p>`;
  bindSketch();
  mountStreet(reg);
}

function bindSketch() {
  const host = $('#regionSketch');
  attachSvgZoom(/** @type {any} */ (host.querySelector('svg')), host);
  $$('#regionSketch .fpin').forEach((el) => {
    el.onclick = () => selectSite(el.dataset.site);
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSite(el.dataset.site); } };
  });
}

function mountStreet(reg) {
  const el = $('#regionMap');
  el.style.visibility = 'hidden';
  street = null;
  streetRegion = reg.id;
  createStreetMap(el, { center: reg.centre, zoom: reg.zoom, bounds: reg.bounds }).then((m) => {
    if (streetRegion !== reg.id) return;
    street = m;
    el.style.visibility = 'visible';
    $('#regionSketch').style.display = 'none';
    street.setPins(pinsFor(reg).map((p) => ({ ...p, cls: KIND[p.kind].cls, text: KIND[p.kind].text })), (p) => selectSite(p.id));
  }).catch((e) => {
    el.style.display = 'none';
    const r = $('#regionReason');
    if (r) r.textContent = e.message;
  });
}

function selectSite(id) {
  ui.selected = id;
  const reg = app.data.regions.regions.find((r) => r.id === ui.region);
  $('#siteDetail').innerHTML = siteDetail(reg);
  $$('#regions .cards .job').forEach((j) => j.classList.toggle('selected', j.dataset.id === id));
  $$('#regionSketch .kpin').forEach((c) => c.classList.toggle('sel', c.parentElement.dataset.site === id));
}

app.actions.region = (el) => { setRegion(el.dataset.region); renderRegions(); };
/** Choose Kalyani or Siliguri (called by the location picker). */
export function setRegion(id) { if (ui.region !== id) { ui.region = id; ui.selected = null; } }
export const currentRegion = () => ui.region;
app.actions.site = (el) => selectSite(el.dataset.id);

app.views.regions = renderRegions;
export { openTrade };
