// Header, sign-in / sandbox role dialog and first-run guided discovery.
import { app } from '../app.js';
import { esc, $, $$, toast, errorBox, fmtDate } from '../ui.js';
import { ROLE_LABELS } from '../../../src/core/rbac.js';
import { OCCUPATION_FAMILIES } from '../../../src/core/constants.js';

const TRADE_TO = {
  iti_electronics: { family: 'Electronics & manufacturing', persona: 'iti_electronics' },
  iti_fitter: { family: 'Mechanical & production', persona: 'iti_fitter' },
  iti_machinist: { family: 'Mechanical & production', persona: 'iti_machinist' },
  iti_copa: { family: 'Administration', persona: 'iti_copa' },
  class12: { family: 'all', persona: 'class12' },
};

export function renderChrome() {
  const a = app.data.actor;
  $('#roleBtn').textContent = `Viewing as: ${ROLE_LABELS[a.role] || a.role}`;
  $('#modePill').textContent = app.client.mode === 'api' ? 'Research pilot · live API' : 'Research pilot · offline snapshot';
  const scan = app.data.records.map((r) => r.captured_at).sort().pop();
  $('#scanDate').textContent = `Source scan: ${fmtDate(scan)}`;
  const strip = $('#sandboxStrip');
  if (app.client.mode === 'local' && a.role !== 'observer') {
    strip.textContent = `Offline demo sandbox: acting as ${ROLE_LABELS[a.role]}. Changes stay in this browser tab only, are not saved, and are not shared with anyone.`;
    strip.classList.remove('hide');
  } else strip.classList.add('hide');
  const k = app.derived.kpis;
  const total = app.data.records.filter((r) => r.review.state === 'approved').length;
  $('#footStats').textContent = `${total} approved records · ${k.confirmedOpenings ? k.confirmedOpenings + ' employer-confirmed openings' : 'No employer-confirmed vacancy data'} · As of ${fmtDate(app.data.asOf)}`;
  $$('.tab').forEach((t) => {
    const locked = (t.dataset.tab === 'review' && !app.can('read:review')) || (t.dataset.tab === 'verify' && !app.can('verify:submit'));
    t.title = locked ? 'Requires a signed-in role' : '';
  });
  if (app.can('read:review')) {
    app.client.reviewQueue().then((q) => {
      const n = q.pendingReview.length + q.duplicates.length + q.followups.length + q.verificationsAwaitingApproval.length + q.expired.possiblyClosed.length;
      $('#reviewCount').textContent = n ? String(n) : '';
    }).catch(() => {});
  } else $('#reviewCount').textContent = '';
}

function openModal(html) {
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hide');
  const first = $('#modalBody').querySelector('button, select, input');
  first?.focus();
}
export function closeModal() {
  $('#modal').classList.add('hide');
}

export function openRoleDialog() {
  if (app.client.mode === 'api') {
    openModal(`<span class="mini-tag">Sign in</span><h2 id="modalTitle">Choose how you view the pilot</h2><p>Without a token you see the public observer view. Researchers, employer verifiers and administrators sign in with the access token issued to them.</p>
    <form class="form" data-form="signin"><label for="tok">Access token</label><input id="tok" name="token" type="password" autocomplete="off" required/><div class="detail-actions"><button class="btn strong" type="submit">Sign in</button><button class="btn" type="button" data-action="signout">Continue as observer</button><button class="btn" type="button" data-action="close-modal">Cancel</button></div></form>`);
  } else {
    openModal(`<span class="mini-tag">Offline demo sandbox</span><h2 id="modalTitle">View the pilot as a different role</h2><p>This offline copy has no server, so no sign-in is possible. You can preview each role's screens. Changes stay in this tab only and disappear on reload.</p>
    <div class="form">${Object.entries(ROLE_LABELS).map(([k, v]) => `<button class="btn ${app.data.actor.role === k ? 'active' : ''}" style="display:block;width:100%;text-align:left;margin:6px 0" data-action="sandbox-role" data-role="${k}">${esc(v)}</button>`).join('')}</div><div class="detail-actions"><button class="btn" data-action="close-modal">Close</button></div>`);
  }
}

export function openGuide() {
  const fams = OCCUPATION_FAMILIES.map((f) => `<option value="fam:${esc(f)}">${esc(f)}</option>`).join('');
  const trades = app.data.profiles.map((p) => `<option value="trade:${esc(p.id)}">${esc(p.label)}</option>`).join('');
  openModal(`<span class="mini-tag">Guided start · 2 steps</span><h2 id="modalTitle">What would you like to see?</h2><p>Pick an area and an occupation or ITI trade. You can change these filters at any time.</p>
  <div class="form"><span class="lbl" id="gSecLbl">1. Area</span><div class="choice-row" role="group" aria-labelledby="gSecLbl">${['all', '62', '63'].map((s) => `<button class="seg ${app.state.filters.sector === s ? 'active' : ''}" data-action="guide-sector" data-sector="${s}" aria-pressed="${app.state.filters.sector === s}">${s === 'all' ? 'Both sectors' : 'Sector ' + s}</button>`).join('')}</div>
  <label for="gOcc">2. Occupation or ITI trade</label><select id="gOcc"><option value="all">All occupations</option><optgroup label="Occupation groups">${fams}</optgroup><optgroup label="ITI trade or learner profile">${trades}</optgroup></select>
  <div class="detail-actions"><button class="btn strong" data-action="guide-go">Show the evidence</button><button class="btn" data-action="guide-skip">Skip</button></div></div>
  <p class="note">Counts are a small public sample, not total jobs. Only employer-confirmed openings are counted as vacancies.</p>`);
}

app.actions['close-modal'] = closeModal;
app.actions['guide-sector'] = (el) => {
  app.state.filters.sector = /** @type {any} */ (el.dataset.sector);
  $$('[data-action=guide-sector]').forEach((b) => { b.classList.toggle('active', b === el); b.setAttribute('aria-pressed', String(b === el)); });
};
app.actions['guide-go'] = () => {
  const v = $('#gOcc').value;
  const f = app.state.filters;
  if (v.startsWith('fam:')) f.family = v.slice(4);
  else if (v.startsWith('trade:')) {
    const t = TRADE_TO[v.slice(6)];
    f.family = t?.family || 'all';
    app.state.persona = t?.persona || app.state.persona;
  } else f.family = 'all';
  app.ls.set('noida-guide-done', true);
  closeModal();
  app.views.syncFilters();
  app.actions.tab({ dataset: { tab: 'discover' } });
  app.compute();
  app.views.discover();
  toast(`Showing ${f.sector === 'all' ? 'both sectors' : 'Sector ' + f.sector}${f.family !== 'all' ? ' · ' + f.family : ''}`);
};
app.actions['guide-skip'] = () => {
  app.ls.set('noida-guide-done', true);
  closeModal();
};
app.actions['sandbox-role'] = async (el) => {
  await app.client.signIn(el.dataset.role);
  closeModal();
  await app.refresh();
  toast(`Viewing as ${ROLE_LABELS[el.dataset.role]}`);
};
app.actions.signout = async () => {
  app.client.signOut();
  closeModal();
  await app.refresh();
};
app.forms = app.forms || {};
app.forms.signin = async (form) => {
  try {
    const actor = await app.client.signIn(String(new FormData(form).get('token')).trim());
    closeModal();
    await app.refresh();
    toast(`Signed in as ${actor.name} (${ROLE_LABELS[actor.role]})`);
  } catch (e) {
    form.insertAdjacentHTML('afterbegin', errorBox(e));
  }
};

app.views.chrome = renderChrome;
