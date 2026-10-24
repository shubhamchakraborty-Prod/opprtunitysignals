// Header, team sign-in, help and the first-visit guided start.
import { app } from '../app.js';
import { esc, $, $$, toast, errorBox, fmtDate, icon } from '../ui.js';
import { ROLE_LABELS } from '../../../src/core/rbac.js';
import { renderNav, mobileNavigation, viewOf } from '../nav.js';

const ROLE_HINT = {
  observer: 'Look at jobs, maps and sources. Nothing to sign in.',
  researcher: 'Add new ads, review them, merge repeats, record interviews.',
  employer_verifier: 'Record calls with employers and the jobs they confirm.',
  administrator: 'Approve calls and data, and see the full change log.',
};

export function renderChrome() {
  const a = app.data.actor;
  const signedIn = a.role !== 'observer';
  $('#roleBtn').textContent = signedIn ? `${ROLE_LABELS[a.role]} ▾` : 'Team sign-in';
  $('#modePill').innerHTML = `<span class="dot"></span>${app.client.mode === 'api' ? 'Live pilot' : 'Offline copy'}`;
  const scan = app.data.records.map((r) => r.last_rechecked_at || r.captured_at).sort().pop();
  $('#scanDate').textContent = `Data checked ${fmtDate(scan)}`;
  const strip = $('#sandboxStrip');
  if (app.client.mode === 'local' && signedIn) {
    strip.textContent = `Practice mode: you are trying the ${ROLE_LABELS[a.role]} screens. Nothing you do here is saved or shared.`;
    strip.classList.remove('hide');
  } else strip.classList.add('hide');
  const k = app.derived.kpis;
  const total = app.data.records.filter((r) => r.review.state === 'approved').length;
  $('#footStats').textContent = `${total} ads on file · ${k.confirmedOpenings ? k.confirmedOpenings + ' jobs confirmed by employers' : 'no employer-confirmed jobs yet'} · as of ${fmtDate(app.data.asOf)}`;
  renderNav();
  if ((app.state.tab === 'review' && !app.can('read:review')) || (app.state.tab === 'verify' && !app.can('verify:submit'))) app.actions.tab({ dataset: { tab: 'home' } });
  if (app.can('read:review')) {
    app.client.reviewQueue().then((q) => {
      const n = q.pendingReview.length + q.duplicates.length + q.followups.length + q.verificationsAwaitingApproval.length + q.expired.possiblyClosed.length;
      const el = $('#reviewCount');
      if (el) el.textContent = n ? String(n) : '';
    }).catch(() => {});
  }
}

let returnFocus = null;
function openModal(html) {
  returnFocus = document.activeElement;
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hide');
  $('#modalBody').querySelector('button, select, input')?.focus();
}
export function closeModal() {
  $('#modal').classList.add('hide');
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
}

export function openRoleDialog() {
  const cur = app.data.actor.role;
  if (app.client.mode === 'api') {
    openModal(`<div><div class="eyebrow">Team sign-in</div><h2 id="modalTitle">Sign in to the team tools</h2></div><p>Everyone can view jobs, maps and sources without signing in. Researchers, employer callers and administrators use the access code they were given.</p>
    <form class="form" data-form="signin"><div><label for="tok">Access code</label><input id="tok" name="token" type="password" autocomplete="off" required/></div><div class="actions"><button class="btn primary" type="submit">Sign in</button>${cur !== 'observer' ? '<button class="btn" type="button" data-action="signout">Sign out</button>' : ''}<button class="btn ghost" type="button" data-action="close-modal">Cancel</button></div></form>`);
  } else {
    openModal(`<div><div class="eyebrow">Practice mode</div><h2 id="modalTitle">Try the team screens</h2></div><p>This copy runs without a server, so there is no real sign-in. Pick a role to see what that person would see. Changes disappear when you reload.</p>
    <div class="tile-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">${Object.entries(ROLE_LABELS).map(([k, v]) => `<button class="tile ${cur === k ? 'active' : ''}" aria-pressed="${cur === k}" data-action="sandbox-role" data-role="${k}"><b>${esc(k === 'observer' ? 'Public viewer' : v)}</b><span>${esc(ROLE_HINT[k])}</span></button>`).join('')}</div><div class="actions"><button class="btn ghost" data-action="close-modal">Close</button></div>`);
  }
}

export function openHelp() {
  openModal(`<div><div class="eyebrow">How to read this</div><h2 id="modalTitle">A job ad is not yet a job</h2></div>
  <p>We find job ads on public websites. An ad tells us what kind of work employers want, but not whether the job is still open or how many people they will hire. So we call the employer. Only jobs the employer confirms, and a second team member approves, count for ITI planning.</p>
  <div><div class="section-label">The coloured labels</div><div class="fit-list">
    <div class="fit"><span class="trust warn">Seen online · not checked yet</span><span class="note">Real ad, not yet confirmed</span></div>
    <div class="fit"><span class="trust plan">Employer call planned</span><span class="note">On the team’s call list</span></div>
    <div class="fit"><span class="trust ok">Confirmed by employer</span><span class="note">Counts for ITI planning</span></div>
    <div class="fit"><span class="trust old">Old ad / Closed</span><span class="note">Background only</span></div>
    <div class="fit"><span class="trust bad">Location unclear, not counted</span><span class="note">May be outside Sector 62 or 63</span></div>
  </div></div>
  <div><div class="section-label">Words we use</div><dl class="glossary">
    <dt>May suit</dt><dd>A learner shares some of the skills and no firm rule in the ad rules them out. The employer still decides.</dd>
    <dt>What the ad says</dt><dd>Facts copied from the ad, with the date we saw it.</dd>
    <dt>What we think</dt><dd>Our reading of the ad, for example which ITI trade it relates to.</dd>
    <dt>What to do next</dt><dd>The suggested action: plan, call the employer, or keep as background.</dd>
    <dt>Working conditions</dt><dd>Things like night shifts written in the ad. They are not workers’ opinions.</dd>
    <dt>Dots on the map</dt><dd>Show the sector, not the exact office, unless the dot is square.</dd>
  </dl></div>
  <div class="actions"><button class="btn primary" data-action="close-modal">Got it</button><button class="btn" data-action="tab" data-tab="home">Go to the home page</button></div>`);
}

export function openGuide() {
  const area = app.state.filters.sector;
  const who = app.state.suits || '';
  openModal(`<div><div class="eyebrow">Quick start</div><h2 id="modalTitle">What are you looking for?</h2></div>
  <div><div class="section-label" id="gSecLbl">1. Which area?</div><div class="tile-grid" role="group" aria-labelledby="gSecLbl">${[['all', 'Both sectors', 'Sector 62 and 63'], ['62', 'Sector 62', 'Offices, IT and customer service'], ['63', 'Sector 63', 'Factories, electronics and sales']].map(([v, t, d]) => `<button class="tile" data-action="guide-sector" data-sector="${v}" aria-pressed="${area === v}"><b>${t}</b><span>${d}</span></button>`).join('')}</div></div>
  <div><div class="section-label" id="gWhoLbl">2. Who are you finding jobs for?</div><div class="tile-grid" role="group" aria-labelledby="gWhoLbl"><button class="tile" data-action="guide-who" data-who="" aria-pressed="${!who}"><b>Just looking</b><span>Show every job ad</span></button>${app.data.profiles.map((p) => `<button class="tile" data-action="guide-who" data-who="${esc(p.id)}" aria-pressed="${who === p.id}"><b>${esc(p.label.replace(/ \(.*\)$/, ''))}</b><span>Example learner</span></button>`).join('')}</div></div>
  <div class="actions"><button class="btn primary" data-action="guide-go">Show me the jobs</button><button class="btn ghost" data-action="guide-skip">Skip</button></div>
  <p class="note">These are a small set of real ads from public websites, not every job in the area.</p>`);
}

/** Overflow pages remain reachable without crowding the mobile navigation bar. */
export function openMobileMore() {
  const { overflow } = mobileNavigation();
  if (!overflow.length) return;
  const v = viewOf(app.state.view);
  openModal(`<div><div class="eyebrow">${esc(v.label)}</div><h2 id="modalTitle">More pages</h2><p>Choose another page in this interface.</p></div>
    <div class="mobile-more-list">${overflow.map(([tab, label, ic]) => {
      const active = app.state.tab === tab;
      return `<button class="mobile-more-link ${active ? 'active' : ''}" type="button" data-action="mobile-more-tab" data-tab="${tab}" ${active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(label)}</span>${active ? '<strong>Current</strong>' : icon('arrow_forward')}</button>`;
    }).join('')}</div>
    <div class="actions"><button class="btn ghost" type="button" data-action="close-modal">Close</button></div>`);
}

app.actions['mobile-more'] = openMobileMore;
app.actions['mobile-more-tab'] = (el) => {
  closeModal();
  app.actions.tab(el);
};

app.actions['close-modal'] = closeModal;
app.actions['open-signin'] = openRoleDialog;
app.actions['open-guide'] = openGuide;
app.actions['guide-sector'] = (el) => {
  app.state.filters.sector = /** @type {any} */ (el.dataset.sector);
  $$('[data-action=guide-sector]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
};
app.actions['guide-who'] = (el) => {
  app.state.suits = el.dataset.who;
  if (el.dataset.who) app.state.persona = el.dataset.who;
  $$('[data-action=guide-who]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
};
app.actions['guide-go'] = () => {
  app.ls.set('noida-guide-done', true);
  closeModal();
  app.views.syncFilters();
  app.actions.tab({ dataset: { tab: 'discover' } });
  app.compute();
  app.views.discover();
  const f = app.state.filters;
  const p = app.state.suits && app.profile(app.state.suits);
  toast(`Showing ${f.sector === 'all' ? 'both sectors' : 'Sector ' + f.sector}${p ? ' · jobs that may suit an ' + p.label.replace(/ \(.*\)$/, '') : ''}`);
};
app.actions['guide-skip'] = () => {
  app.ls.set('noida-guide-done', true);
  closeModal();
};
app.actions['sandbox-role'] = async (el) => {
  await app.client.signIn(el.dataset.role);
  closeModal();
  await app.refresh();
  toast(el.dataset.role === 'observer' ? 'Back to the public view' : `Practising as ${ROLE_LABELS[el.dataset.role]}`);
};
app.actions.signout = async () => {
  app.client.signOut();
  closeModal();
  await app.refresh();
  toast('Signed out');
};
app.forms.signin = async (form) => {
  try {
    const actor = await app.client.signIn(String(new FormData(form).get('token')).trim());
    closeModal();
    await app.refresh();
    toast(`Signed in as ${actor.name}`);
  } catch (e) {
    form.insertAdjacentHTML('afterbegin', errorBox({ message: e.status === 401 ? 'That access code was not recognised. Check it and try again.' : e.message }));
  }
};

app.views.chrome = renderChrome;
