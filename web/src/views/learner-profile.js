// The learner's profile: what kind of learner (ITI, polytechnic, college) and
// what they studied. Chosen once, remembered, and followed by every learner page.
import { app } from '../app.js';
import { esc, $ } from '../ui.js';
import { LEARNER_TYPES, learnerFit } from '../../../src/core/learners.js';
import { comparisonBase } from '../../../src/core/analytics.js';

const DEFAULT = { iti: 'Electronics Mechanic', polytechnic: 'dip-ece', college: 'bcom' };

export function profile() {
  const saved = app.ls.get('opx-learner', null);
  const type = saved && LEARNER_TYPES[saved.type] ? saved.type : 'iti';
  const id = saved?.type === type ? saved.programme : DEFAULT[type];
  return { type, programme: programmeFor(type, id) || programmeFor(type, DEFAULT[type]) };
}

/** A trade (ITI) or a programme (diploma, degree), shaped the same way. */
export function programmeFor(type, id) {
  if (type === 'iti') {
    const t = app.data.trades?.trades.find((x) => x.trade === id);
    return t ? { id: t.trade, name: t.trade, ...t } : null;
  }
  const p = (app.data.programmes?.programmes || []).find((x) => x.id === id && x.type === type);
  return p ? { ...p, trade: p.name } : null;
}

export function setProfile(type, id) {
  app.ls.set('opx-learner', { type, programme: id || DEFAULT[type] });
  app.views[app.state.tab]?.();
}

export function currentAds() {
  return comparisonBase(app.data.records.filter((r) => r.review.state === 'approved'), 'all');
}

/** Fit for the current profile against current ads. */
export function fitNow() {
  const p = profile();
  return { p, ads: currentAds(), fit: learnerFit({ type: /** @type {any} */ (p.type), programme: p.programme }, currentAds()) };
}

export function profileBar() {
  const p = profile();
  const opts = p.type === 'iti'
    ? [...new Set(app.data.trades.trades.map((t) => t.sector))].map((s) => `<optgroup label="${esc(s)}">${app.data.trades.trades.filter((t) => t.sector === s).map((t) => `<option value="${esc(t.trade)}" ${t.trade === p.programme.id ? 'selected' : ''}>${esc(t.trade)}</option>`).join('')}</optgroup>`).join('')
    : (app.data.programmes?.programmes || []).filter((x) => x.type === p.type).map((x) => `<option value="${esc(x.id)}" ${x.id === p.programme.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  return `<div class="profile-bar" role="group" aria-label="About you">
    <span class="pb-label">I am</span>
    <div class="seg-group" role="group" aria-label="Type of learner">${Object.entries(LEARNER_TYPES).map(([k, t]) => `<button class="seg ${p.type === k ? 'active' : ''}" data-action="lp-type" data-type="${k}" aria-pressed="${p.type === k}">${esc(t.label)}</button>`).join('')}</div>
    <span class="pb-label">${p.type === 'iti' ? 'in the trade' : 'studying'}</span>
    <label class="screenreader" for="lpProg">${p.type === 'iti' ? 'ITI trade' : 'Programme'}</label>
    <select id="lpProg" class="input">${opts}</select>
    <span class="note">Remembered on this device</span>
  </div>`;
}

app.actions['lp-type'] = (el) => setProfile(el.dataset.type, null);
document.addEventListener('change', (e) => {
  const t = /** @type {HTMLSelectElement} */ (e.target);
  if (t.id === 'lpProg') setProfile(profile().type, t.value);
});
