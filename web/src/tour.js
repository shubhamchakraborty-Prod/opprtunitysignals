// "Watch the demo": a self-playing walkthrough with captions and a visible
// pointer, using the real pages and real controls. Esc or Exit stops it.
import { app } from './app.js';
import { $, $$, esc, icon } from './ui.js';

let run = 0;
let paused = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wait(ms, id) {
  const end = Date.now() + ms;
  while (Date.now() < end || paused) {
    if (id !== run) throw new Error('stopped');
    await sleep(100);
  }
}
const q = (s) => /** @type {HTMLElement|null} */ (document.querySelector(s));

function cursor() {
  let c = $('#tourCursor');
  if (!c) { document.body.insertAdjacentHTML('beforeend', '<div id="tourCursor" aria-hidden="true"></div>'); c = $('#tourCursor'); }
  return c;
}
async function point(sel, id, click = true) {
  const el = typeof sel === 'string' ? q(sel) : sel;
  if (!el) return null;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(500, id);
  const r = el.getBoundingClientRect();
  const c = cursor();
  c.style.transform = `translate(${r.left + Math.min(r.width / 2, 60)}px, ${r.top + r.height / 2}px)`;
  c.classList.add('show');
  await wait(750, id);
  if (click) { c.classList.add('tap'); el.click(); setTimeout(() => c.classList.remove('tap'), 350); }
  return el;
}
async function choose(sel, value, id) {
  const el = /** @type {HTMLSelectElement|null} */ (await point(sel, id, false));
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
async function scrollTo(sel, id, ms = 900) {
  const el = q(sel);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await wait(ms, id);
}
const view = (v, id) => point(`.aud-tab[data-view=${v}]`, id);
const tab = (t, id) => point(`#subTabs .tab[data-tab=${t}]`, id);

const STEPS = [
  { title: 'Four interfaces, one set of facts', text: 'Learners, institutions, industry and our own team each get their own screens. Pick yours with the tabs at the top.',
    async go(id) { app.actions.tab({ dataset: { tab: 'home' } }); await wait(1600, id); await scrollTo('#homeLive', id, 2200); await scrollTo('#home', id, 600); } },
  { title: 'Learners: your next step in three moves', text: 'A learner says what they studied once. Jobs, a first course and a portal to register on follow.',
    async go(id) { await view('learners', id); await wait(900, id); await point('[data-action=lp-type][data-type=iti]', id); await wait(700, id); await scrollTo('.moves', id, 2400); } },
  { title: 'A skill plan for every kind of learner', text: 'ITI trades, diploma branches and degrees each get their own plan, with Swift AI Academy courses that open more jobs.',
    async go(id) { await tab('learn', id); await wait(700, id); await point('[data-action=lp-type][data-type=polytechnic]', id); await wait(1100, id); await scrollTo('.learn-grid', id, 2200); await point('[data-action=lp-type][data-type=iti]', id); await wait(400, id); } },
  { title: 'Jobs for me, live on the map', text: 'Every ad carries a trust label. Pointing at a job finds it on the map; new ads ripple in as they arrive.',
    async go(id) {
      await tab('discover', id); await wait(900, id);
      for (const j of $$('#jobCards .job').slice(0, 3)) { j.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await point(j, id, false); await wait(450, id); }
      await point('#jobCards .job', id); await wait(2200, id); app.actions['close-detail']?.(/** @type {any} */ ({}), /** @type {any} */ ({})); await wait(400, id);
    } },
  { title: 'Institutions: do our programmes match demand?', text: 'An ITI, polytechnic or college sees demand for each trade or programme, skills to add, and employers to call.',
    async go(id) { await view('institution', id); await wait(900, id); await point('[data-action=inst-home-type][data-type=polytechnic]', id); await wait(1200, id); await scrollTo('#ihome .grid2', id, 2000); await point('[data-action=inst-home-type][data-type=iti]', id); await wait(300, id); } },
  { title: 'Industry: talent, not job ads', text: 'Employers see where the skills they need are trained within 100 km, what fresh hires know, and local pay.',
    async go(id) { await view('industry', id); await wait(1200, id); await scrollTo('.pool-grid', id, 1600); await tab('hire', id); await wait(600, id); await point('[data-action=hire-role][data-role=support]', id); await wait(1000, id); await scrollTo('.fit-cols', id, 2000); } },
  { title: 'Internal: what we build next', text: 'For the Swift AI Academy team: employer demand against our catalogue and other providers, by learner type.',
    async go(id) { await view('internal', id); await wait(1200, id); await scrollTo('.rec-board', id, 2200); await scrollTo('.matrix', id, 1600); } },
  { title: 'Government data, streaming in', text: 'How live government feeds will look once keys and data-sharing agreements are in place. This panel is a simulation.',
    async go(id) { await tab('feeds', id); await wait(1200, id); await scrollTo('#simTiles', id, 2600); await scrollTo('.sim-grid', id, 2200); } },
  { title: 'That is the tour', text: 'Pick your interface at the top, or replay the demo from the home page.',
    async go(id) { app.actions.tab({ dataset: { tab: 'home' } }); await wait(2400, id); } },
];

function bar(i) {
  let b = $('#tourBar');
  if (!b) {
    document.body.insertAdjacentHTML('beforeend', '<div id="tourBar" role="status" aria-live="polite"></div>');
    b = $('#tourBar');
  }
  const s = STEPS[i];
  b.innerHTML = `<div class="tb-prog">${STEPS.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>
  <div class="tb-row"><div class="tb-text"><span class="tb-step">Demo · ${i + 1} of ${STEPS.length}</span><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div>
  <div class="tb-actions"><button class="btn tonal small" id="tourPause">${paused ? icon('play_arrow') + 'Resume' : icon('pause') + 'Pause'}</button><button class="btn text small" id="tourExit">${icon('close')}Exit</button></div></div>`;
  $('#tourPause').onclick = () => { paused = !paused; bar(i); };
  $('#tourExit').onclick = stopTour;
}

export function stopTour() {
  run++;
  paused = false;
  $('#tourBar')?.remove();
  $('#tourCursor')?.remove();
  document.documentElement.classList.remove('touring');
}

export async function startTour() {
  stopTour();
  const id = run;
  document.documentElement.classList.add('touring');
  try {
    for (let i = 0; i < STEPS.length; i++) {
      bar(i);
      await STEPS[i].go(id);
    }
  } catch { /* stopped */ }
  if (id === run) stopTour();
}

app.actions.tour = () => startTour();
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#tourBar')) stopTour(); });
