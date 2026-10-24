// Live demo mode: simulated activity so the site looks like a running service
// (new ads arriving, learners building skill plans, feeds updating).
// It never changes a real count, never names a real employer or institute,
// and every item it shows is labelled "Demo".
import { app } from './app.js';
import { $, $$, esc, icon } from './ui.js';
import { pulseSector } from './map.js';

const ROLES = { '62': ['Customer Support Executive', 'Data Entry Operator', 'Inside Sales Associate', 'MIS Executive', 'IT Helpdesk Associate'], '63': ['Electronics Technician', 'SMT Machine Operator', 'Quality Inspector', 'CNC Operator', 'Maintenance Electrician', 'Store Assistant'] };
const LEARNERS = ['An ITI Electrician learner', 'An ITI COPA learner', 'A polytechnic diploma student', 'A B.Com graduate', 'An ITI Fitter learner', 'A Class 12 pass learner'];
const FEEDS = ['National Career Service', 'Apprenticeship India', 'Udyam MSME registrations', 'Skill India Digital Hub'];

const st = {
  on: false, timer: 0, tick: 0, last: Date.now(),
  online: 41, plans: 214, enrolled: 63, newAds: 0,
  feed: /** @type {{at:number, ico:string, text:string, kind:string}[]} */ ([]),
};
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

function event() {
  const saa = app.data?.saa?.courses || [];
  const k = st.tick % 5;
  const sector = Math.random() < 0.4 ? '62' : '63';
  if (k === 0 || k === 3) {
    st.newAds++;
    return { kind: 'ad', ico: 'work', text: `New job ad found · ${pick(ROLES[sector])} · Sector ${sector}`, sector };
  }
  if (k === 1) {
    st.plans++;
    return { kind: 'plan', ico: 'school', text: `${pick(LEARNERS)} built a skill plan · ${2 + rnd(6)} more jobs within reach` };
  }
  if (k === 2 && saa.length) {
    st.enrolled++;
    const c = pick(saa.filter((x) => x.track !== 'aiml'));
    return { kind: 'enrol', ico: 'school', text: `${pick(LEARNERS)} started “${c.title}” on Swift AI Academy` };
  }
  return { kind: 'feed', ico: 'cell_tower', text: `${pick(FEEDS)} sent ${3 + rnd(40)} new records` };
}

const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 5 ? 'just now' : s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`; };

function notify(e) {
  const box = $('#liveToasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'live-toast k-' + e.kind;
  el.innerHTML = `<span class="lt-ico">${icon(e.ico)}</span><span class="lt-body"><b>${esc(e.text)}</b><small>just now · <span class="demo-tag">Demo</span></small></span>`;
  box.prepend(el);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 5200);
}

/** Render the parts of the page that show live activity. */
export function renderLive() {
  const pill = $('#livePill');
  if (pill) {
    pill.classList.toggle('off', !st.on);
    pill.innerHTML = `<span class="live-dot"></span>${st.on ? 'Live demo' : 'Demo paused'}`;
    pill.setAttribute('aria-pressed', String(st.on));
  }
  const upd = $('#liveUpdated');
  if (upd) upd.textContent = st.on ? `Updated ${ago(st.last)}` : 'Live demo paused';
  const nb = $('#liveNewAds');
  if (nb) nb.innerHTML = st.on && st.newAds ? `<span class="live-dot"></span>${st.newAds} new ad${st.newAds > 1 ? 's' : ''} since you opened this page <span class="demo-tag">Demo</span>` : '';
  const home = $('#homeLive');
  if (home) {
    home.innerHTML = `<div class="hl-stats"><div><span class="big">${st.online}</span><span>people using the explorer now</span></div><div><span class="big">${st.plans}</span><span>skill plans built today</span></div><div><span class="big">${st.enrolled}</span><span>Swift AI Academy enrolments today</span></div></div>
    <ul class="hl-feed">${st.feed.slice(0, 6).map((e, i) => `<li class="${i === 0 && Date.now() - e.at < 1500 ? 'fresh' : ''}"><span class="lt-ico k-${e.kind}">${icon(e.ico)}</span><span>${esc(e.text)}</span><time data-at="${e.at}">${ago(e.at)}</time></li>`).join('')}</ul>`;
  }
}

function step() {
  st.tick++;
  st.online = Math.max(18, Math.min(90, st.online + rnd(7) - 3));
  const e = event();
  st.last = Date.now();
  st.feed.unshift({ ...e, at: st.last });
  st.feed.length = Math.min(st.feed.length, 12);
  if (e.kind === 'ad' && app.state.tab === 'discover') pulseSector(e.sector);
  if (!document.hidden && !$('#modal:not(.hide)') && (e.kind === 'ad' || e.kind === 'enrol')) notify(e);
  renderLive();
}

export function setLive(on) {
  st.on = on;
  clearInterval(st.timer);
  if (on) st.timer = window.setInterval(step, 4200);
  app.ls.set('opx-live', on);
  renderLive();
}
export const liveOn = () => st.on;

export function initLive() {
  // Seed a believable recent history so the feed is full at rest.
  for (let i = 0; i < 6; i++) { st.tick++; const e = event(); st.feed.push({ ...e, at: Date.now() - (i + 1) * 47000 }); }
  st.newAds = 0;
  const pill = $('#livePill');
  if (pill) pill.onclick = () => setLive(!st.on);
  setInterval(() => {
    if (!st.on) return;
    const u = $('#liveUpdated');
    if (u) u.textContent = `Updated ${ago(st.last)}`;
    $$('#homeLive time').forEach((t) => { t.textContent = ago(Number(t.dataset.at)); });
  }, 1000);
  // On by default in the demo copy; off on the live server unless switched on.
  setLive(app.ls.get('opx-live', app.client.mode === 'local'));
}
