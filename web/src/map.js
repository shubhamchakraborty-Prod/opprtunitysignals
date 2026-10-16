// Map: OpenStreetMap tiles via Leaflet when available, otherwise a clearly
// labelled schematic fallback. Pins are grouped by employer, sector and
// location precision. Approximate (sector-level) and verified-address pins are
// separate layers; employer presence is its own layer and never a vacancy.
import { app } from './app.js';
import { esc, $, $$ } from './ui.js';
import { isOlder, displaySector } from '../../src/core/filters.js';
import { select } from './views/explore.js';
import { renderDetail } from './views/explore.js';

const COLOURS = { '62': '#337e79', '63': '#625cb0' };
const SCHEMATIC_CENTRES = { '62': [255, 205], '63': [471, 235] };
let map = null;
let markers = [];
let tilesOk = false;

/** Group records so one employer at one precision is one pin. */
export function groupRecords(records, kind) {
  const groups = new Map();
  for (const r of records) {
    const sector = displaySector(r);
    if (!sector) continue;
    const precise = kind === 'presence' ? 'presence' : r.geo.geocode_verified ? 'verified' : 'approx';
    const who = (r.employer_identity || r.recruiter_identity || 'Undisclosed').trim();
    const key = `${precise}|${sector}|${who.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { key, precise, sector, employer: who, records: [], label: precise === 'verified' ? 'verified address' : precise === 'presence' ? 'employer presence (not a vacancy)' : 'sector-level, approximate' });
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
  return `${g.employer}: ${n} record${n > 1 ? 's' : ''}, Sector ${g.sector}, ${g.label}`;
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
    const fill = g.precise === 'presence' ? '#ffffff' : older ? '#9caab1' : g.precise === 'verified' ? '#172c41' : COLOURS[g.sector];
    const sel = g.records.some((r) => r.source_id === app.state.selected) || app.state.selectedGroup?.key === g.key;
    const shape = g.precise === 'verified'
      ? `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="${fill}" stroke="${sel ? '#f0a33a' : '#fff'}" stroke-width="3"/>`
      : `<circle cx="${x}" cy="${y}" r="11" fill="${fill}" stroke="${sel ? '#f0a33a' : g.precise === 'presence' ? '#8d9aa2' : '#fff'}" stroke-width="3" ${g.precise === 'approx' ? '' : ''}/>`;
    const badge = g.records.length > 1 ? `<circle cx="${x + 10}" cy="${y - 9}" r="7" fill="#bd7c37" stroke="#fff" stroke-width="1.5"/><text x="${x + 10}" y="${y - 6}" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle">${g.records.length}</text>` : '';
    return `<g class="fpin" tabindex="0" role="button" aria-label="${esc(pinLabel(g))}" data-key="${esc(g.key)}">${shape}<text x="${x}" y="${y + 3}" font-size="8" font-weight="bold" fill="${g.precise === 'presence' ? '#5c6d78' : '#fff'}" text-anchor="middle">${g.precise === 'presence' ? 'P' : g.sector}</text>${badge}</g>`;
  }).join('');
  $$('.fpin').forEach((el) => {
    const g = groups.find((x) => x.key === el.dataset.key);
    el.onclick = () => activate(g);
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(g); } };
  });
}

function renderLeaflet(groups) {
  const L = window.L;
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  for (const g of groups) {
    const i = sectorIndex(groups, g);
    const verified = g.precise === 'verified';
    const r0 = g.records[0];
    const loc = verified ? [r0.geo.lat, r0.geo.lon] : approxLatLng(g, i);
    const older = g.records.every(isOlder);
    const cls = ['marker', g.sector === '63' ? 'm63' : '', older ? 'older' : '', verified ? 'verified' : g.precise === 'presence' ? 'presence' : 'approx'].join(' ');
    const badge = g.records.length > 1 ? `<span class="badge">${g.records.length}</span>` : '';
    const icon = L.divIcon({ className: '', html: `<div class="${cls}" title="${esc(g.label)}">${g.precise === 'presence' ? 'P' : g.sector}${badge}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
    const m = L.marker(loc, { icon, keyboard: true, title: pinLabel(g), alt: pinLabel(g) }).addTo(map);
    m.bindTooltip(esc(pinLabel(g)), { direction: 'top' });
    m.on('click', () => activate(g));
    markers.push(m);
  }
}

export function renderPins() {
  if (!app.data) return;
  const groups = currentGroups();
  renderSchematic(groups);
  if (map && tilesOk) renderLeaflet(groups);
  const anyVerified = groups.some((g) => g.precise === 'verified');
  $('#mapLabel').textContent = tilesOk
    ? `Round pins are sector-level groupings, not employer addresses.${anyVerified ? ' Square pins are verified addresses.' : ''}`
    : 'Schematic view - not geographically exact. Pins are sector-level groupings.';
}

function useFallback(reason) {
  tilesOk = false;
  $('#leafletMap').style.display = 'none';
  $('#fallback').style.display = 'block';
  $('#fallbackReason').textContent = reason;
  renderPins();
}

function initLeaflet() {
  const L = window.L;
  const geo = app.data.geometry;
  $('#leafletMap').style.display = 'block';
  map = L.map('leafletMap', { zoomControl: true, scrollWheelZoom: false });
  let loaded = 0, failed = 0;
  const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 18 });
  layer.on('tileload', () => {
    loaded++;
    if (!tilesOk) {
      tilesOk = true;
      $('#fallback').style.display = 'none';
      renderPins();
    }
  });
  layer.on('tileerror', () => {
    failed++;
    if (!loaded && failed >= 3) useFallback('Street map tiles could not be loaded (offline or blocked).');
  });
  layer.addTo(map);
  for (const [sec, s] of Object.entries(geo.sectors)) {
    L.circle(s.centre, { radius: s.radius_m, color: s.colour, weight: 1, dashArray: '5,6', fillOpacity: 0.05 }).addTo(map).bindTooltip(`Sector ${sec}: approximate visual guide, not an official boundary`);
  }
  map.fitBounds(geo.fit_bounds, { padding: [22, 22] });
  setTimeout(() => { if (!loaded) useFallback('Street map tiles did not load in time (offline or blocked).'); }, 6000);
}

/** Load Leaflet from the bundled vendor copy; schematic stays usable throughout. */
export function initMap() {
  $('#fallback').style.display = 'block';
  $('#leafletMap').style.display = 'none';
  renderPins();
  if (!navigator.onLine) return useFallback('This device is offline.');
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'vendor/leaflet/leaflet.css';
  document.head.appendChild(css);
  const s = document.createElement('script');
  s.src = 'vendor/leaflet/leaflet.js';
  s.onload = () => {
    try { initLeaflet(); } catch { useFallback('The interactive map could not start.'); }
  };
  s.onerror = () => useFallback('The map library could not be loaded.');
  document.head.appendChild(s);
}

export function invalidateMap() {
  if (map) setTimeout(() => map.invalidateSize(), 30);
}
