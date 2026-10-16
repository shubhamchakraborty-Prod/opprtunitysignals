// Street map: MapLibre GL with OpenFreeMap vector tiles (no API key), with
// zoom and pan controls. When tiles cannot load (offline, blocked, no WebGL)
// callers fall back to a zoomable sketch. Also provides the sketch helpers.
import { esc } from './ui.js';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const ATTRIBUTION = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

let libPromise = null;
function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'vendor/maplibre/maplibre-gl.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'vendor/maplibre/maplibre-gl.js';
    s.onload = () => (window.maplibregl ? resolve(window.maplibregl) : reject(new Error('Map library did not start')));
    s.onerror = () => reject(new Error('The map library could not be loaded'));
    document.head.appendChild(s);
  });
  return libPromise;
}

/** Polygon approximating a circle, for approximate area outlines. */
function circle([lat, lon], radiusM, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const dLat = (radiusM / 111320) * Math.sin(a);
    const dLon = (radiusM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a);
    pts.push([lon + dLon, lat + dLat]);
  }
  return pts;
}

/**
 * @param {HTMLElement} container
 * @param {{center:[number,number], zoom:number, bounds?:[[number,number],[number,number]], areas?:{label:string,centre:[number,number],radius_m:number,colour:string}[]}} opts
 * @returns {Promise<{setPins:(pins:any[], onClick:(p:any)=>void)=>void, resize:()=>void, flyTo:(c:[number,number], z:number)=>void}>}
 */
export async function createStreetMap(container, opts) {
  if (window.__NO_STREET_MAP__) throw new Error(window.__NO_STREET_MAP__);
  if (!navigator.onLine) throw new Error('This device is offline.');
  const maplibregl = await loadMapLibre();
  if (!maplibregl.supported || (typeof maplibregl.supported === 'function' && !maplibregl.supported())) throw new Error('This browser cannot draw the street map.');
  const map = new maplibregl.Map({ container, style: STYLE, center: [opts.center[1], opts.center[0]], zoom: opts.zoom, attributionControl: false, cooperativeGestures: false });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }));
  map.scrollZoom.enable();
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('The street map did not load in time (offline or blocked).')), 9000);
    map.once('load', () => { clearTimeout(t); resolve(null); });
    map.on('error', (e) => { if (!map.loaded()) { clearTimeout(t); reject(new Error('The street map could not load (offline or blocked).')); } });
  }).catch((e) => { map.remove(); throw e; });
  if (opts.bounds) map.fitBounds([[opts.bounds[0][1], opts.bounds[0][0]], [opts.bounds[1][1], opts.bounds[1][0]]], { padding: 30, duration: 0 });
  (opts.areas || []).forEach((a, i) => {
    map.addSource('area' + i, { type: 'geojson', data: { type: 'Feature', properties: { label: a.label }, geometry: { type: 'Polygon', coordinates: [circle(a.centre, a.radius_m)] } } });
    map.addLayer({ id: 'area-fill' + i, type: 'fill', source: 'area' + i, paint: { 'fill-color': a.colour, 'fill-opacity': 0.08 } });
    map.addLayer({ id: 'area-line' + i, type: 'line', source: 'area' + i, paint: { 'line-color': a.colour, 'line-width': 1.5, 'line-dasharray': [3, 3] } });
  });
  let markers = [];
  return {
    setPins(pins, onClick) {
      markers.forEach((m) => m.remove());
      markers = pins.map((p) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = `marker ${p.cls || ''}`;
        el.setAttribute('aria-label', p.label);
        el.title = p.label;
        el.innerHTML = `${esc(p.text || '')}${p.count > 1 ? `<span class="badge">${p.count}</span>` : ''}`;
        el.onclick = (e) => { e.stopPropagation(); onClick(p); };
        return new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(map);
      });
    },
    resize: () => map.resize(),
    flyTo: (c, z) => map.jumpTo({ center: [c[1], c[0]], zoom: z }),
  };
}

/**
 * Zoom and pan for an SVG sketch: +/- buttons, reset, mouse wheel and drag.
 * @param {SVGSVGElement} svg
 * @param {HTMLElement} host element that receives the control buttons
 */
export function attachSvgZoom(svg, host) {
  const vb0 = svg.viewBox.baseVal;
  const base = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height };
  let v = { ...base };
  const apply = () => svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  const zoom = (f, cx = v.x + v.w / 2, cy = v.y + v.h / 2) => {
    const w = Math.min(base.w, Math.max(base.w / 8, v.w * f));
    const h = (w / v.w) * v.h;
    v = { x: cx - ((cx - v.x) * w) / v.w, y: cy - ((cy - v.y) * h) / v.h, w, h };
    apply();
  };
  if (!host.querySelector('.zoom-ctl')) {
    host.insertAdjacentHTML('beforeend', '<div class="zoom-ctl" role="group" aria-label="Zoom"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="reset" aria-label="Reset view">⟲</button></div>');
  }
  host.querySelector('.zoom-ctl').onclick = (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest('button');
    if (!b) return;
    if (b.dataset.z === 'in') zoom(0.7);
    else if (b.dataset.z === 'out') zoom(1 / 0.7);
    else { v = { ...base }; apply(); }
  };
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 0.85 : 1 / 0.85, v.x + ((e.clientX - r.left) / r.width) * v.w, v.y + ((e.clientY - r.top) / r.height) * v.h);
  }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    if (/** @type {Element} */ (e.target).closest('.fpin')) return;
    drag = { x: e.clientX, y: e.clientY, v: { ...v } };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    v = { ...drag.v, x: drag.v.x - ((e.clientX - drag.x) / r.width) * drag.v.w, y: drag.v.y - ((e.clientY - drag.y) / r.height) * drag.v.h };
    apply();
  });
  svg.addEventListener('pointerup', () => { drag = null; });
}

/** Project lat/lon into a sketch box. */
export function projector(bounds, w, h, pad = 40) {
  const [[s, wst], [n, e]] = bounds;
  return ([lat, lon]) => [pad + ((lon - wst) / (e - wst)) * (w - 2 * pad), pad + ((n - lat) / (n - s)) * (h - 2 * pad)];
}
