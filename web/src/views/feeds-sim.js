// Simulated live feed: how government data would stream into this site once
// API keys and data-sharing agreements are in place. Every number here is
// generated in the browser from a fixed seed. Nothing is real data.
import { esc, icon } from '../ui.js';

const SOURCES = [
  { id: 'ncs', short: 'NCS', name: 'National Career Service', what: 'Vacancies posted by employers', mode: 'stream', every: 1 },
  { id: 'naps', short: 'NAPS', name: 'Apprenticeship India (NAPS)', what: 'Apprentice seats offered', mode: 'stream', every: 2 },
  { id: 'udyam', short: 'Udyam', name: 'Udyam MSME registrations', what: 'New small firms registered', mode: 'poll', every: 3 },
  { id: 'sidh', short: 'SIDH', name: 'Skill India Digital Hub', what: 'Course enrolments and completions', mode: 'poll', every: 3 },
  { id: 'ncvt', short: 'NCVT MIS', name: 'NCVT MIS (DGT)', what: 'ITI admissions and results', mode: 'batch', every: 6 },
  { id: 'eshram', short: 'e-Shram', name: 'e-Shram', what: 'Informal worker registrations', mode: 'poll', every: 4 },
  { id: 'epfo', short: 'EPFO', name: 'EPFO payroll', what: 'New members on formal payroll', mode: 'batch', every: 8 },
  { id: 'plfs', short: 'PLFS', name: 'MoSPI PLFS', what: 'Labour force survey figures', mode: 'batch', every: 12 },
];
const MODE = { stream: ['c-stream', 'Streaming', 'Live'], poll: ['c-poll', 'Every few minutes', 'Poll'], batch: ['c-batch', 'Daily or monthly file', 'File'] };
const SERIES = [
  { id: 'elec', label: 'Electrical and electronics', cls: 'c1' },
  { id: 'mech', label: 'Machines and production', cls: 'c2' },
  { id: 'office', label: 'Office, sales and customer service', cls: 'c3' },
];
const TRADES = { elec: ['Electronics Mechanic', 'Electrician', 'SMT Operator', 'Wireman'], mech: ['Fitter', 'Machinist', 'Turner', 'CNC Operator'], office: ['Customer Support', 'Data Entry Operator', 'Sales Executive', 'COPA'] };
const PLACES = ['Sector 62', 'Sector 63', 'Sector 63A', 'Greater Noida', 'Ecotech III'];

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** @param {HTMLElement} root */
export function mountSimulation(root) {
  const rand = rng(20261024);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const HIST = 36;
  const st = {
    tick: 0, running: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, timer: 0, clock: 0,
    t0: Date.now(),
    tiles: {
      vac: { label: 'Open vacancies near Sector 62 and 63', src: 'NCS', v: 142, h: [] },
      app: { label: 'Apprentice seats offered', src: 'Apprenticeship India', v: 58, h: [] },
      msme: { label: 'New MSMEs this month, Gautam Buddh Nagar', src: 'Udyam', v: 311, h: [] },
      ur: { label: 'Urban unemployment rate, Uttar Pradesh', src: 'PLFS', v: 6.4, h: [], dec: 1, unit: '%' },
    },
    series: Object.fromEntries(SERIES.map((s) => [s.id, []])),
    times: [],
    health: Object.fromEntries(SOURCES.map((s) => [s.id, { last: 0, today: int(40, 400), ms: int(120, 900) }])),
    events: [],
    packets: [],
  };
  const base = { elec: 6, mech: 4, office: 7 };

  function step(silent) {
    st.tick++;
    const now = st.t0 + st.tick * 60000;
    st.times.push(now);
    for (const s of SERIES) st.series[s.id].push(Math.max(0, Math.round(base[s.id] + Math.sin((st.tick + s.id.length) / 4) * 2 + (rand() - 0.4) * 4)));
    for (const k of Object.keys(st.series)) if (st.series[k].length > HIST) st.series[k].shift();
    if (st.times.length > HIST) st.times.shift();
    const T = st.tiles;
    T.vac.v = Math.max(80, T.vac.v + int(-3, 6));
    T.app.v = Math.max(20, T.app.v + int(-1, 3));
    if (st.tick % 3 === 0) T.msme.v += int(0, 4);
    if (st.tick % 12 === 0) T.ur.v = Math.max(3, +(T.ur.v + (rand() - 0.55) * 0.2).toFixed(1));
    for (const t of Object.values(T)) { t.h.push(t.v); if (t.h.length > HIST) t.h.shift(); }
    const due = SOURCES.filter((s) => st.tick % s.every === 0);
    const src = pick(due.length ? due : SOURCES);
    const h = st.health[src.id];
    h.last = Date.now(); h.today += int(1, 12); h.ms = Math.max(80, Math.round(h.ms * 0.7 + int(100, 900) * 0.3));
    const fam = pick(SERIES).id;
    const n = int(1, 5);
    const text = {
      ncs: () => `+${n} vacanc${n > 1 ? 'ies' : 'y'} · ${pick(TRADES[fam])} · ${pick(PLACES)}`,
      naps: () => `+${n} apprentice seat${n > 1 ? 's' : ''} · ${pick(TRADES[fam])} · ${pick(PLACES)}`,
      udyam: () => `New MSME registered · ${pick(['Electronics assembly', 'Sheet metal', 'Plastic moulding', 'IT services', 'Packaging'])} · Gautam Buddh Nagar`,
      sidh: () => `${int(20, 90)} course completions · ${pick(['Spoken English', 'Excel basics', 'Solar PV installer', 'Data entry', 'AI for all'])}`,
      ncvt: () => `Result file · ${pick(['Electrician', 'Fitter', 'COPA', 'Electronics Mechanic'])} · ${int(30, 140)} pass-outs · Govt ITI (sample)`,
      eshram: () => `+${int(10, 80)} registrations · ${pick(['Construction', 'Domestic work', 'Delivery', 'Manufacturing helper'])} · Gautam Buddh Nagar`,
      epfo: () => `Monthly payroll file · Uttar Pradesh · +${int(40, 90)},${int(100, 999)} new members`,
      plfs: () => `Quarterly bulletin · UP urban unemployment ${T.ur.v.toFixed(1)}%`,
    }[src.id]();
    st.events.unshift({ at: Date.now(), src, text });
    st.events.length = Math.min(st.events.length, 14);
    if (!silent) st.packets.push({ src: src.id, t: 0 });
  }
  for (let i = 0; i < HIST; i++) step(true);
  st.events.forEach((e, i) => { e.at = Date.now() - i * 4000; });

  root.innerHTML = `
  <div class="sim-banner" role="note"><span class="sim-badge"><span class="live-dot"></span>SIMULATION</span><p>This is how live government data would look once API keys and data-sharing agreements are in place. <strong>Every number on this panel is made up in your browser.</strong> Real connection status is further down.</p>
    <div class="actions"><button class="btn small tonal" id="simToggle"></button><label class="check" style="min-height:0"><span class="note">Speed</span><select id="simSpeed" class="input" style="min-height:32px"><option value="1">1×</option><option value="3">3×</option></select></label></div></div>
  <div class="sim-tiles" id="simTiles"></div>
  <div class="sim-grid">
    <div class="region-side">
      <div class="card"><div class="card-head"><h3>How the data flows</h3><small>Each dot is one update arriving</small></div><div class="pipeline" id="simPipe"></div></div>
      <div class="card"><div class="card-head"><h3>Vacancies posted per minute, by type of work</h3><span class="sim-badge">SIMULATED</span></div><div class="chart" id="simChart"></div><div class="chart-legend">${SERIES.map((s) => `<span><i class="${s.cls}"></i>${esc(s.label)}</span>`).join('')}</div></div>
    </div>
    <div class="card"><div class="card-head"><h3>Live updates</h3><span class="sim-badge">SIMULATED</span></div><div class="stream" id="simStream" aria-live="off"></div></div>
  </div>
  <div class="card"><div class="card-head"><h3>Connection health</h3><span class="sim-badge">SIMULATED</span></div><div class="card-body"><div class="table-scroll"><table class="minitable health"><thead><tr><th>Source</th><th>What it sends</th><th>How it connects</th><th>Last update</th><th>Records today</th><th>Response time</th></tr></thead><tbody id="simHealth"></tbody></table></div></div></div>`;

  const $ = (s) => /** @type {HTMLElement} */ (root.querySelector(s));
  const spark = (h) => {
    const W = 200, H = 36, min = Math.min(...h), max = Math.max(...h), r = max - min || 1;
    const pts = h.map((v, i) => [(i / (h.length - 1)) * W, H - 4 - ((v - min) / r) * (H - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const [ex, ey] = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="spark-area" d="${d}L${W} ${H}L0 ${H}Z"/><path class="spark-line" d="${d}" vector-effect="non-scaling-stroke"/><circle class="spark-end" cx="${ex}" cy="${ey}" r="3.5"/></svg>`;
  };
  function drawTiles() {
    $('#simTiles').innerHTML = Object.entries(st.tiles).map(([k, t]) => {
      const d = t.h.length > 1 ? t.v - t.h[0] : 0;
      const fmt = (x) => (t.dec ? x.toFixed(t.dec) : Math.round(x).toLocaleString('en-IN')) + (t.unit || '');
      return `<div class="sim-tile" data-k="${k}"><span class="label">${esc(t.label)}</span><span class="big">${fmt(t.v)}</span><span class="delta ${(k === 'ur' ? d > 0 : d < 0) ? 'down' : ''}">${d >= 0 ? '▲' : '▼'} ${fmt(Math.abs(d))} in the last ${HIST} min</span>${spark(t.h)}<span class="src">Source: ${esc(t.src)} · simulated</span></div>`;
    }).join('');
  }
  // Pipeline: sources on the left, the platform in the middle, outputs on the right.
  const PW = 640, PH = 300, hub = { x: 300, y: 150 }, outs = [['Jobs map', 70], ['Learner skill plans', 150], ['Market signals', 230]];
  const sy = (i) => 22 + i * ((PH - 44) / (SOURCES.length - 1));
  const path = (i) => `M150 ${sy(i)} C 220 ${sy(i)}, 230 ${hub.y}, ${hub.x - 64} ${hub.y}`;
  function drawPipe() {
    $('#simPipe').innerHTML = `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Diagram: eight government sources feed the platform, which updates the jobs map, learner skill plans and market signals">
      ${SOURCES.map((s, i) => `<path class="pl-edge" id="e-${s.id}" d="${path(i)}"/>`).join('')}
      ${outs.map(([, y]) => `<path class="pl-edge" d="M${hub.x + 64} ${hub.y} C 420 ${hub.y}, 430 ${y}, 488 ${y}"/>`).join('')}
      ${SOURCES.map((s, i) => `<g class="pl-node" id="n-${s.id}"><rect x="4" y="${sy(i) - 14}" width="146" height="28" rx="8"/><text x="14" y="${sy(i) + 4}">${esc(s.short)}</text><text class="sub" x="142" y="${sy(i) + 4}" text-anchor="end">${esc(MODE[s.mode][2])}</text></g>`).join('')}
      <g class="pl-hub"><rect x="${hub.x - 64}" y="${hub.y - 38}" width="128" height="76" rx="14"/><text x="${hub.x}" y="${hub.y - 6}" text-anchor="middle">Opportunity</text><text x="${hub.x}" y="${hub.y + 10}" text-anchor="middle">Explorer</text><text class="sub" x="${hub.x}" y="${hub.y + 26}" text-anchor="middle">check · dedupe · log</text></g>
      ${outs.map(([l, y]) => `<g class="pl-node pl-out"><rect x="488" y="${y - 16}" width="148" height="32" rx="8"/><text x="500" y="${y + 4}">${esc(l)}</text></g>`).join('')}
      <g id="pkts"></g></svg>`;
  }
  function drawPackets() {
    const g = root.querySelector('#pkts');
    if (!g) return;
    st.packets = st.packets.filter((p) => p.t <= 1);
    g.innerHTML = st.packets.map((p) => {
      const el = /** @type {SVGPathElement|null} */ (root.querySelector('#e-' + p.src));
      if (!el) return '';
      const pt = el.getPointAtLength(el.getTotalLength() * p.t);
      return `<circle class="pl-packet k-${p.src}" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="5"/>`;
    }).join('');
    SOURCES.forEach((s) => root.querySelector('#n-' + s.id)?.classList.toggle('active', st.packets.some((p) => p.src === s.id)));
  }
  // Streaming line chart with a hover crosshair.
  const CW = 640, CH = 230, PAD = { l: 34, r: 12, t: 12, b: 26 };
  let hover = -1;
  function drawChart() {
    const all = SERIES.flatMap((s) => st.series[s.id]);
    const max = Math.max(10, Math.ceil(Math.max(...all) / 5) * 5);
    const x = (i) => PAD.l + (i / (HIST - 1)) * (CW - PAD.l - PAD.r);
    const y = (v) => CH - PAD.b - (v / max) * (CH - PAD.t - PAD.b);
    const ticks = [0, max / 2, max];
    const tl = (i) => new Date(st.times[i]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const xt = [0, Math.floor((HIST - 1) / 2), HIST - 1];
    $('#simChart').innerHTML = `<svg viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Simulated vacancies per minute for three types of work over the last ${HIST} minutes">
      <text class="watermark" x="${CW / 2}" y="${CH / 2 + 14}" text-anchor="middle">SIMULATION</text>
      <g class="grid">${ticks.map((t) => `<line x1="${PAD.l}" x2="${CW - PAD.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
      <g class="axis">${ticks.map((t) => `<text x="${PAD.l - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('')}${xt.map((i) => `<text x="${x(i)}" y="${CH - 6}" text-anchor="${i === 0 ? 'start' : i === HIST - 1 ? 'end' : 'middle'}">${tl(i)}</text>`).join('')}</g>
      ${SERIES.map((s) => `<path class="series ${s.cls}" d="${st.series[s.id].map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('')}"/>`).join('')}
      ${SERIES.map((s) => { const v = st.series[s.id][HIST - 1]; return `<circle class="${s.cls}" cx="${x(HIST - 1)}" cy="${y(v)}" r="4" stroke="var(--surface)" stroke-width="2"/>`; }).join('')}
      ${hover >= 0 ? `<line class="xhair" x1="${x(hover)}" x2="${x(hover)}" y1="${PAD.t}" y2="${CH - PAD.b}"/>${SERIES.map((s) => `<circle class="${s.cls}" cx="${x(hover)}" cy="${y(st.series[s.id][hover])}" r="4" stroke="var(--surface)" stroke-width="2"/>`).join('')}` : ''}
      <rect id="simHit" x="${PAD.l}" y="0" width="${CW - PAD.l - PAD.r}" height="${CH}" fill="transparent"/></svg>
      ${hover >= 0 ? `<div class="chart-tip" style="left:${(x(hover) / CW) * 100}%;top:20px"><b>${tl(hover)}</b> · simulated<br/>${SERIES.map((s) => `<i class="${s.cls}"></i>${esc(s.label)}: ${st.series[s.id][hover]}`).join('<br/>')}</div>` : ''}`;
    const hit = root.querySelector('#simHit');
    hit?.addEventListener('pointermove', (e) => {
      const r = /** @type {Element} */ (hit).getBoundingClientRect();
      const svgX = PAD.l + ((e.clientX - r.left) / r.width) * (CW - PAD.l - PAD.r);
      const i = Math.round(((svgX - PAD.l) / (CW - PAD.l - PAD.r)) * (HIST - 1));
      if (i !== hover) { hover = Math.max(0, Math.min(HIST - 1, i)); drawChart(); }
    });
    hit?.addEventListener('pointerleave', () => { hover = -1; drawChart(); });
  }
  const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`; };
  function drawStream(fresh) {
    $('#simStream').innerHTML = st.events.map((e, i) => `<div class="ev" style="${i === 0 && fresh ? '' : 'animation:none'}"><time>${new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time><b>${esc(e.text)}</b><span class="src">${esc(e.src.name)} · simulated</span></div>`).join('');
  }
  function drawHealth() {
    $('#simHealth').innerHTML = SOURCES.map((s) => {
      const h = st.health[s.id];
      return `<tr><td>${esc(s.name)}</td><td>${esc(s.what)}</td><td><span class="conn ${MODE[s.mode][0]}">${esc(MODE[s.mode][1])}</span></td><td class="ago">${h.last ? ago(h.last) : 'Waiting'}</td><td>${h.today.toLocaleString('en-IN')}</td><td>${h.ms} ms</td></tr>`;
    }).join('');
  }
  function drawAll(fresh) { drawTiles(); drawChart(); drawStream(fresh); drawHealth(); }
  function setBtn() {
    $('#simToggle').innerHTML = st.running ? `${icon('pause')}Pause` : `${icon('play_arrow')}Play`;
    root.classList.toggle('paused', !st.running);
  }
  let raf = 0, last = 0, acc = 0, secAcc = 0;
  function loop(ts) {
    const dt = last ? Math.min(100, ts - last) : 16;
    last = ts;
    if (st.running) {
      acc += dt * st.speed;
      secAcc += dt;
      st.packets.forEach((p) => { p.t += (dt * st.speed) / 1400; });
      drawPackets();
      if (acc >= 2600) { acc = 0; step(false); drawAll(true); }
      else if (secAcc >= 1000) { secAcc = 0; drawHealth(); }
    }
    raf = requestAnimationFrame(loop);
  }
  drawPipe();
  drawAll(false);
  setBtn();
  $('#simToggle').onclick = () => { st.running = !st.running; setBtn(); };
  $('#simSpeed').onchange = (e) => { st.speed = Number(/** @type {HTMLSelectElement} */ (e.target).value); };
  raf = requestAnimationFrame(loop);
  return {
    stop() { cancelAnimationFrame(raf); raf = 0; last = 0; },
    start() { if (!raf) raf = requestAnimationFrame(loop); },
  };
}
