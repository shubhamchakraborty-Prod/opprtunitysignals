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
const view = (v, id) => point(`.vbtn[data-view=${v}]`, id);
const tab = (t, id) => point(`#navLinks .tab[data-tab=${t}]`, id);

const STEPS = [
  { title: 'One place for skills and jobs', text: 'The explorer tracks job ads, investments and government data around Noida, Kalyani and Siliguri, and turns them into plans.',
    async go(id) { app.actions.tab({ dataset: { tab: 'home' } }); await wait(1800, id); await scrollTo('#homeLive', id, 2600); await scrollTo('#home', id, 800); } },
  { title: 'Learners see where to apply', text: 'An ITI learner sees the job ads open to them and the official portals to apply on.',
    async go(id) { await point('.door[data-view=learners]', id); await wait(900, id); await point('.type-tab[data-type=iti]', id); await wait(800, id); await scrollTo('.route-grid', id, 2200); } },
  { title: 'A skill plan in one click', text: 'Pick a trade. The plan lists the Swift AI Academy courses that open more jobs, and where else to learn.',
    async go(id) { await tab('learn', id); await wait(700, id); await choose('#learnTrade', 'Electrician', id); await wait(900, id); await scrollTo('.learn-grid', id, 2600); } },
  { title: 'A live jobs map', text: 'Every ad carries a trust label. Pointing at a job finds it on the map; new ads ripple in as they arrive.',
    async go(id) {
      await view('industry', id); await wait(900, id);
      for (const j of $$('#jobCards .job').slice(0, 3)) { j.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await point(j, id, false); await wait(500, id); }
      await point('#jobCards .job', id); await wait(2600, id); app.actions['close-detail']?.(/** @type {any} */ ({}), /** @type {any} */ ({})); await wait(500, id);
    } },
  { title: 'Ten years of change', text: 'Investments, policies and projects since 2016, and what is coming, linked to the skills they need. Switch area at the top.',
    async go(id) { await tab('market', id); await wait(900, id); await scrollTo('.year-strip', id, 900); await point('.ys-dot', id); await wait(1600, id); await choose('#location', 'kalyani', id); await wait(1800, id); await choose('#location', 'all', id); await wait(400, id); } },
  { title: 'Institutes nearby', text: 'ITIs, polytechnics and colleges within 100 km, with projects coming up nearby and how to partner with them.',
    async go(id) { await view('institution', id); await tab('institutes', id); await wait(800, id); await point('#institutes .cards .job', id); await wait(2200, id); } },
  { title: 'Government data, streaming in', text: 'How live government feeds will look once keys and data-sharing agreements are in place. This panel is a simulation.',
    async go(id) { await view('industry', id); await tab('feeds', id); await wait(1200, id); await scrollTo('#simTiles', id, 3200); await scrollTo('.sim-grid', id, 2600); } },
  { title: 'What we build next', text: 'Internal view for the Swift AI Academy team: employer demand against our catalogue and other providers.',
    async go(id) { await view('internal', id); await wait(1200, id); await scrollTo('.rec-board', id, 2400); await scrollTo('.matrix', id, 2200); } },
  { title: 'That is the tour', text: 'Explore on your own, or replay the demo from the home page.',
    async go(id) { app.actions.tab({ dataset: { tab: 'home' } }); await wait(2600, id); } },
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
