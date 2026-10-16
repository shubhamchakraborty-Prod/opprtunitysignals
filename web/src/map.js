// Map: OpenFreeMap street tiles (MapLibre, zoomable) when available, otherwise
// a clearly labelled, zoomable schematic sketch. Pins are grouped by employer, sector and
// location precision. Approximate (sector-level) and verified-address pins are
// separate layers; employer presence is its own layer and never a vacancy.
import { app } from './app.js';
import { esc, $, $$ } from './ui.js';
import { isOlder, displaySector } from '../../src/core/filters.js';
import { select } from './views/explore.js';
import { renderDetail } from './views/explore.js';
import { createStreetMap, attachSvgZoom } from './geo-map.js';

const SCHEMATIC_CENTRES = { '62': [262, 218], '63': [482, 246] };
/** @type {any} */
let street = null;

/** Group records so one employer at one precision is one pin. */
export function groupRecords(records, kind) {
  const groups = new Map();
  for (const r of records) {
    const sector = displaySector(r);
    if (!sector) continue;
    const precise = kind === 'presence' ? 'presence' : r.geo.geocode_verified ? 'verified' : 'approx';
    const who = (r.employer_identity || r.recruiter_identity || 'Undisclosed').trim();
    const key = `${precise}|${sector}|${who.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { key, precise, sector, employer: who, records: [], label: precise === 'verified' ? 'exact address checked' : precise === 'presence' ? 'employer with no job ad' : 'placed by sector, not exact' });
    groups.get(key).records.push(r);
  }
  return [...groups.values()];
}

function currentGroups() {
  const L = app.state.layers;
  const vacancyGroups = groupRecords(app.derived.reps, 'vacancy').filter((g) => (g.precise === 'verified' ? L.verified : L.approx));
  const presence = L.presence ? groupRecords(app.derived.presence, 'presence') : [];
  return [...vacancyGroups, ...presence];
}

function sectorIndex(groups, g) {
  return groups.filter((x) => x.sector === g.sector).indexOf(g);
}

function approxLatLng(g, i) {
  const c = app.data.geometry.sectors[g.sector].centre;
  const t = i * 2.39996;
  const spread = 0.0013 * Math.sqrt(i + 1);
  return [c[0] + Math.sin(t) * spread, c[1] + Math.cos(t) * spread];
}

function activate(g) {
  if (g.records.length === 1) return select(g.records[0].source_id);
  app.state.selected = null;
  app.state.selectedGroup = g;
  renderDetail();
  renderPins();
}

function pinLabel(g) {
  const n = g.records.length;
  return `${g.employer}: ${n} job ad${n > 1 ? 's' : ''}, Sector ${g.sector}, ${g.label}`;
}

function renderSchematic(groups) {
  const pins = $('#svgPins');
  if (!pins) return;
  pins.innerHTML = groups.map((g) => {
    const i = sectorIndex(groups, g);
    const t = i * 2.39996;
    const rad = Math.sqrt(i + 1) * 17;
    const c = SCHEMATIC_CENTRES[g.sector];
    const x = c[0] + Math.cos(t) * rad, y = c[1] + Math.sin(t) * rad;
    const older = g.records.every(isOlder);
    const fill = g.precise === 'presence' ? 'ppres' : older ? 'pold' : g.precise === 'verified' ? 'pver' : 'p' + g.sector;
    const sel = g.records.some((r) => r.source_id === app.state.selected) || app.state.selectedGroup?.key === g.key;
    const ring = `ring ${sel ? 'sel' : ''} ${g.precise === 'presence' ? 'pres' : ''}`;
    const shape = g.precise === 'verified'
      ? `<rect class="${fill} ${ring}" x="${x - 11}" y="${y - 11}" width="22" height="22" rx="4" stroke-width="3"/>`
      : `<circle class="${fill} ${ring}" cx="${x}" cy="${y}" r="12" stroke-width="3"/>`;
    const badge = g.records.length > 1 ? `<circle class="badge" cx="${x + 11}" cy="${y - 10}" r="7.5"/><text class="badge-t" x="${x + 11}" y="${y - 7}" font-size="9" font-weight="700" text-anchor="middle">${g.records.length}</text>` : '';
    return `<g class="fpin" tabindex="0" role="button" aria-label="${esc(pinLabel(g))}" data-key="${esc(g.key)}">${shape}<text class="${g.precise === 'presence' ? 'tpres' : ''}" x="${x}" y="${y + 3}" font-size="9" font-weight="700" text-anchor="middle">${g.precise === 'presence' ? 'P' : g.sector}</text>${badge}<title>${esc(pinLabel(g))}</title></g>`;
  }).join('');
  $$('.fpin').forEach((el) => {
    const g = groups.find((x) => x.key === el.dataset.key);
    el.onclick = () => activate(g);
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(g); } };
  });
}

function streetPins(groups) {
  return groups.map((g) => {
    const i = sectorIndex(groups, g);
    const verified = g.precise === 'verified';
    const r0 = g.records[0];
    const [lat, lon] = verified ? [r0.geo.lat, r0.geo.lon] : approxLatLng(g, i);
    const older = g.records.every(isOlder);
    return { lat, lon, g, label: pinLabel(g), count: g.records.length, text: g.precise === 'presence' ? 'P' : g.sector, cls: [g.sector === '63' ? 'm63' : '', older ? 'older' : '', verified ? 'verified' : g.precise === 'presence' ? 'presence' : 'approx'].join(' ') };
  });
}

export function renderPins() {
  if (!app.data) return;
  const groups = currentGroups();
  renderSchematic(groups);
  if (street) street.setPins(streetPins(groups), (p) => activate(p.g));
  const anyVerified = groups.some((g) => g.precise === 'verified');
  $('#mapLabel').textContent = street
    ? `Round dots show the sector, not the exact office.${anyVerified ? ' Square dots are checked addresses.' : ''}`
    : 'Sketch only. Dots show the sector, not the exact office.';
}

function useFallback(reason) {
  street = null;
  $('#leafletMap').style.display = 'none';
  $('#fallback').style.display = 'block';
  $('#fallbackReason').textContent = reason;
  renderPins();
}

/** Street map from OpenFreeMap when reachable; the zoomable sketch otherwise. */
export function initMap() {
  $('#fallback').style.display = 'block';
  $('#leafletMap').style.display = 'none';
  attachSvgZoom(/** @type {any} */ ($('#fallback svg')), $('#fallback'));
  renderPins();
  const geo = app.data.geometry;
  const css = getComputedStyle(document.documentElement);
  const el = $('#leafletMap');
  el.style.display = 'block';
  el.style.visibility = 'hidden';
  createStreetMap(el, {
    center: [(geo.fit_bounds[0][0] + geo.fit_bounds[1][0]) / 2, (geo.fit_bounds[0][1] + geo.fit_bounds[1][1]) / 2],
    zoom: 14,
    bounds: geo.fit_bounds,
    areas: Object.entries(geo.sectors).map(([sec, a]) => ({ label: 'Sector ' + sec, centre: a.centre, radius_m: a.radius_m, colour: css.getPropertyValue(sec === '62' ? '--s62' : '--s63').trim() || a.colour })),
  }).then((m) => {
    street = m;
    el.style.visibility = 'visible';
    $('#fallback').style.display = 'none';
    renderPins();
  }).catch((e) => {
    el.style.visibility = 'visible';
    useFallback(e.message);
  });
}

export function invalidateMap() {
  if (street) setTimeout(() => street.resize(), 30);
}
