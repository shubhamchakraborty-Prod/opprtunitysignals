// Jobs map: answer cards, filter bar, job list and the detail drawer.
import { app, SOME_OVERLAP } from '../app.js';
import { esc, $, $$, icon, fmtDate, trustBadge, staleBadge, postedText, sectorTag, toast, errorBox, familyLabel, BASIS_LABEL, PRECISION_LABEL, KIND_LABEL } from '../ui.js';
import { explainRecord, wageText } from '../../../src/core/decisions.js';
import { extractEmploymentTerms } from '../../../src/core/terms.js';
import { matchRecord } from '../../../src/core/matching.js';
import { freshness } from '../../../src/core/analytics.js';
import { isOlder, isInScope, filterOpportunities } from '../../../src/core/filters.js';
import { representatives } from '../../../src/core/dedupe.js';
import { SOURCE_FLAG_TYPES, OCCUPATION_FAMILIES } from '../../../src/core/constants.js';
import { renderPins, highlightRecord } from '../map.js';

const FLAG_LABEL = { broken_link: 'Link does not open', stale: 'Looks out of date', possibly_closed: 'Ad may be closed', unverifiable: 'Cannot be checked', location_mismatch: 'Wrong location', other: 'Something else' };

function answers() {
  const k = app.derived.kpis;
  const sec = app.state.filters.sector;
  $('#heroTitle').textContent = sec === 'all' ? 'Jobs in Sector 62 and 63, and who could fill them' : `Jobs in Sector ${sec}, and who could fill them`;
  $('#mCount').textContent = k.signalCount;
  const both = k.sector62 + k.sector63 || 1;
  $('#split62').style.flex = String(k.sector62 / both);
  $('#split63').style.flex = String(k.sector63 / both);
  $('#confirmedBar').style.width = `${k.signalCount ? Math.min(100, (k.confirmedOpenings / k.signalCount) * 100) : 0}%`;
  $('#priorityBar').style.width = `${k.signalCount ? (app.derived.board.outreach_priority.length / k.signalCount) * 100 : 0}%`;
  $('#m62').textContent = k.sector62;
  $('#m63').textContent = k.sector63;
  const extra = [k.mirrorsCollapsed ? `${k.mirrorsCollapsed} repeat ad${k.mirrorsCollapsed > 1 ? 's' : ''} counted once` : '', k.olderShown ? `${k.olderShown} old ad${k.olderShown > 1 ? 's' : ''} shown, not counted` : '', k.unclearShown ? `${k.unclearShown} with unclear location, not counted` : ''].filter(Boolean).join(' · ');
  $('#mCountSub').textContent = extra;
  $('#mConfirmed').textContent = k.confirmedOpenings;
  $('#confirmedCard').className = 'answer ' + (k.confirmedOpenings ? 'good' : 'wait');
  const subs = [];
  if (k.confirmedAsOf) subs.push(`From ${k.confirmedRecords} employer call${k.confirmedRecords > 1 ? 's' : ''}, latest ${fmtDate(k.confirmedAsOf.latest)}`);
  else subs.push('No employer has confirmed a job yet');
  if (k.pendingApprovalOpenings) subs.push(`${k.pendingApprovalOpenings} awaiting approval`);
  if (k.claimedButUnverified) subs.push(`ads mention ${k.claimedButUnverified} more, not counted until confirmed`);
  $('#mConfirmedSub').textContent = subs.join(' · ');
  $('#mPriority').textContent = app.derived.board.outreach_priority.length;
  const fr = freshness(app.data.records.filter((r) => r.review.state === 'approved'), app.data.asOf);
  const days = fr.newest ? Math.max(0, Math.round((Date.parse(app.data.asOf) - Date.parse(fr.newest)) / 86400000)) : null;
  $('#mFreshDays').textContent = days == null ? '-' : days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`;
  $('#mFresh').textContent = days == null ? 'No checks yet' : `Last checked ${fmtDate(fr.newest)}${fr.stale ? ` · ${fr.stale} ad${fr.stale > 1 ? 's' : ''} need rechecking` : ''}`;
}

function chips() {
  const f = app.state.filters;
  const base = representatives(filterOpportunities(app.data.records, { ...f, family: 'all' }));
  const count = (fam) => base.filter((r) => r.occupation_family === fam).length;
  const fams = OCCUPATION_FAMILIES.filter((x) => count(x) || f.family === x);
  $('#familyChips').innerHTML = `<button class="fchip ${f.family === 'all' ? 'active' : ''}" data-action="family" data-family="all" aria-pressed="${f.family === 'all'}">All work <span class="n">${base.length}</span></button>` +
    fams.map((x) => `<button class="fchip ${f.family === x ? 'active' : ''}" data-action="family" data-family="${esc(x)}" aria-pressed="${f.family === x}">${esc(familyLabel(x))} <span class="n">${count(x)}</span></button>`).join('');
  const p = app.state.suits && app.profile(app.state.suits);
  const af = [];
  if (f.sector !== 'all') af.push(['sector', `Sector ${f.sector}`]);
  if (f.query) af.push(['query', `“${f.query}”`]);
  if (f.family !== 'all') af.push(['family', familyLabel(f.family)]);
  if (p) af.push(['suits', `May suit: ${p.label.replace(/ \(.*\)$/, '')}`]);
  if (f.career !== 'all') af.push(['career', f.career]);
  if (f.verification !== 'all') af.push(['verification', $('#verification option:checked')?.textContent || f.verification]);
  if (f.includeHistorical) af.push(['historic', 'Old ads shown']);
  if (f.includeUnclear) af.push(['unclear', 'Unclear locations shown']);
  $('#activeFilters').innerHTML = af.length ? `<span>Showing ${app.derived.reps.length} ad${app.derived.reps.length === 1 ? '' : 's'} for</span>${af.map(([k, l]) => `<button class="afchip" data-action="clear-one" data-key="${k}" aria-label="Remove filter: ${esc(l)}">${esc(l)}${icon('close')}</button>`).join('')}` : '';
  const note = $('#suitsNote');
  if (p) {
    note.innerHTML = `Showing ads that may suit an <strong>${esc(p.label)}</strong>: they share some skills and no stated rule (experience, qualification, language) rules this learner out. The employer still decides. <button class="linkbtn" data-action="tab" data-tab="match">See why in Match a learner →</button>`;
    note.classList.remove('hide');
  } else note.classList.add('hide');
}

function card(r) {
  const mirrors = app.mirrorsOf(r).length;
  const suits = app.suitsFor(r).map((id) => app.profile(id)?.label.replace(/ \(.*\)$/, '')).filter(Boolean);
  return `<article tabindex="0" role="button" aria-pressed="${app.state.selected === r.source_id}" data-action="select" data-id="${esc(r.source_id)}" class="job ${app.state.selected === r.source_id ? 'selected' : ''}">
  <div class="job-top"><div class="badges">${trustBadge(r, app.data.asOf)}${staleBadge(r, app.data.asOf)}</div>${sectorTag(r)}</div>
  <div><h4>${esc(r.role_title_raw)}</h4><div class="who">${esc(r.employer_identity || 'Employer not named')}${r.recruiter_identity ? ' · via ' + esc(r.recruiter_identity) : ''}</div></div>
  <div class="facts"><span>Pay <strong>${esc(wageText(r.wage))}</strong></span><span>Experience <strong>${esc(r.experience.raw)}</strong></span><span>${esc(familyLabel(r.occupation_family))}</span></div>
  ${suits.length || mirrors ? `<div class="badges">${suits.map((s) => `<span class="tag suit">May suit: ${esc(s)}</span>`).join('')}${mirrors ? '<span class="tag dup">Same ad on another site, counted once</span>' : ''}</div>` : ''}
  </article>`;
}

function list() {
  const reps = app.derived.reps;
  const box = $('#jobCards');
  if (!box.dataset.hover) {
    box.dataset.hover = '1';
    box.addEventListener('mouseover', (e) => highlightRecord(/** @type {HTMLElement} */ (e.target).closest('.job')?.dataset.id || null));
    box.addEventListener('mouseleave', () => highlightRecord(null));
    box.addEventListener('focusin', (e) => highlightRecord(/** @type {HTMLElement} */ (e.target).closest('.job')?.dataset.id || null));
  }
  $('#listCount').textContent = `${reps.length} shown`;
  const p = app.state.suits && app.profile(app.state.suits);
  $('#jobCards').innerHTML = reps.length ? reps.map(card).join('') : p
    ? `<div class="empty"><strong>No current ads suit an ${esc(p.label.replace(/ \(.*\)$/, ''))} as written.</strong><br/>Most ask for more experience or different skills. <button class="linkbtn" data-action="tab" data-tab="match">See the gaps in Match a learner</button> or <button class="linkbtn" data-action="clear-filters">show all ads</button>.</div>`
    : `<div class="empty"><strong>No ads match these filters.</strong><br/>Try another area or type of work, or <button class="linkbtn" data-action="clear-filters">clear all filters</button>.</div>`;
}

function stepper(r) {
  const s = r.verification_status;
  const confirmed = s === 'employer_confirmed';
  const st = (cls, title, text) => `<div class="step ${cls}"><b>${esc(title)}</b>${esc(text)}</div>`;
  if (s === 'contradicted') return `<div class="stepper">${st('done', '1. Seen online', fmtDate(r.captured_at))}${st('no', '2. Employer called', 'Employer says not hiring')}${st('', '3. Approved', 'Not used')}</div>`;
  if (isOlder(r)) return `<div class="stepper">${st('done', '1. Seen online', fmtDate(r.captured_at))}${st('', '2. Employer called', 'Not needed: old or closed')}${st('', '3. Approved', 'Not used for planning')}</div>`;
  return `<div class="stepper">${st('done', '1. Seen online', fmtDate(r.captured_at))}${st(confirmed ? 'done' : 'now', '2. Employer called', confirmed ? `${r.vacancy_count_verified} confirmed on ${fmtDate(r.verified_at)}` : s === 'pending_employer_check' ? 'Call planned' : 'Not yet')}${st(confirmed ? 'done' : '', '3. Approved by a second person', confirmed ? 'Counts for ITI planning' : 'Waiting for step 2')}</div>`;
}

function fitList(r) {
  const rows = (app.data.profiles || []).map((p) => {
    const m = matchRecord(p, r);
    const total = m.overlap.matched.length + m.overlap.missing.length;
    const fit = m.verdict === 'gate_not_met' ? ['fail', 'Not eligible as written', m.gaps[0], 2]
      : m.overlap.ratio >= SOME_OVERLAP ? ['pass', 'Worth a call', `${m.overlap.matched.length} of ${total} skills; confirm the rest with the employer`, 0]
      : ['not_stated', 'Few matching skills', `${m.overlap.matched.length} of ${total} skills`, 1];
    return { p, fit };
  }).sort((a, b) => a.fit[3] - b.fit[3]);
  return `<div class="fit-list">${rows.map(({ p, fit: [cls, label, why] }) => `<div class="fit"><span>${esc(p.label.replace(/ \(.*\)$/, ''))}<br/><small class="note">${esc(why)}</small></span><span class="status ${cls}">${label}</span></div>`).join('')}</div>`;
}

export function renderDetail() {
  const box = $('#detailPanel');
  const g = app.state.selectedGroup;
  const r = app.data.records.find((x) => x.source_id === app.state.selected);
  const open = !!(r || g);
  box.classList.toggle('open', open);
  box.setAttribute('aria-hidden', String(!open));
  $('#drawerBackdrop').classList.toggle('open', open);
  if (!open) { box.innerHTML = ''; return; }
  if (g && !r) {
    box.innerHTML = `<div class="drawer-in"><div class="drawer-head"><div><span class="sector-tag s${esc(g.sector)}">Sector ${esc(g.sector)}</span><h3>${esc(g.employer)}</h3><div class="who">${g.records.length} job ads from this employer</div></div><button class="close" data-action="close-detail" aria-label="Close">×</button></div>
    ${g.records.map((x) => `<div class="job" role="button" tabindex="0" data-action="select" data-id="${esc(x.source_id)}"><div class="badges">${trustBadge(x, app.data.asOf)}</div><h4>${esc(x.role_title_raw)}</h4><div class="facts"><span>Pay <strong>${esc(wageText(x.wage))}</strong></span><span>Experience <strong>${esc(x.experience.raw)}</strong></span></div></div>`).join('')}</div>`;
    return;
  }
  const e = explainRecord(r, app.data.asOf);
  const saved = app.state.shortlist.includes(r.source_id);
  const terms = extractEmploymentTerms(r);
  const mirrors = app.mirrorsOf(r);
  const geo = r.geo;
  box.innerHTML = `<div class="drawer-in">
  <div class="drawer-head"><div><div class="badges">${trustBadge(r, app.data.asOf)}${sectorTag(r)}${staleBadge(r, app.data.asOf)}</div><h3 id="detailTitle">${esc(r.role_title_raw)}</h3><div class="who">${esc(r.employer_identity || 'Employer not named')}${r.recruiter_identity ? ' · advertised by ' + esc(r.recruiter_identity) : ''}</div></div><button class="close" data-action="close-detail" aria-label="Close job details">×</button></div>
  <div class="pay">${esc(wageText(r.wage))}<small>Pay written in the ad. Not checked with the employer.</small></div>
  <dl class="kv">
    <div><dt>Experience needed</dt><dd>${esc(r.experience.raw)}</dd></div>
    <div><dt>Education asked for</dt><dd>${esc(r.education.raw)}</dd></div>
    <div><dt>Where</dt><dd>${esc(PRECISION_LABEL[geo.granularity])}${geo.locality_text ? ': ' + esc(geo.locality_text) : ''}<small>${esc(BASIS_LABEL[geo.basis] || geo.basis)}</small></dd></div>
    <div><dt>When</dt><dd>Seen ${fmtDate(r.captured_at)}<small>${esc(postedText(r))}</small></dd></div>
    <div><dt>Openings mentioned in the ad</dt><dd>${r.vacancy_claimed ? esc(r.vacancy_claimed) + '<small>The advertiser’s claim, not counted</small>' : 'Not mentioned'}</dd></div>
    <div><dt>Skills mentioned</dt><dd>${esc(r.skills.map((s) => s.name).join(', '))}</dd></div>
    ${r.verification_status === 'employer_confirmed' && r.start_date ? `<div><dt>Expected start</dt><dd>${fmtDate(r.start_date)}</dd></div>` : ''}
  </dl>
  <div><div class="section-label">Is this a real, open job?</div>${stepper(r)}</div>
  ${terms.length ? `<div class="terms-box"><strong>Working conditions in the ad:</strong> ${terms.map((t) => esc(t.label)).join(' · ')}. These are the employer’s terms, not what workers think of them.</div>` : ''}
  <div><div class="section-label">Who could do this job?</div>${fitList(r)}<p class="note" style="margin-top:6px">Example learner profiles. Sharing skills does not mean the employer will hire.</p></div>
  <div class="fir"><div class="fact"><h5>What the ad says</h5><ul>${e.facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="infer"><h5>What we think</h5><ul>${e.inferences.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="rec"><h5>What to do next · ${esc(e.tierLabel)}</h5><p>${esc(e.recommendation)}</p></div></div>
  ${mirrors.length ? `<p class="note"><strong>Same ad on another site:</strong> ${mirrors.map((m) => `<a href="${esc(m.source_url)}" target="_blank" rel="noopener">${esc(m.platform)} ↗</a>`).join(', ')}. Counted once.</p>` : ''}
  <div class="actions"><a class="btn primary" href="${esc(r.source_url)}" target="_blank" rel="noopener">Open the original ad ↗</a><button class="btn" data-action="shortlist" data-id="${esc(r.source_id)}">${saved ? 'Remove from my list' : 'Save to my list'}</button>
  ${app.can('queue:outreach') && r.verification_status === 'observed_public' && isInScope(r) ? `<button class="btn" data-action="queue-outreach" data-id="${esc(r.source_id)}">Plan an employer call</button>` : ''}
  ${app.can('verify:submit') && isInScope(r) && !isOlder(r) ? `<button class="btn" data-action="verify-this" data-id="${esc(r.source_id)}">Record employer call</button>` : ''}</div>
  ${app.can('flag:source') ? `<details class="disclose"><summary>Report a problem with this ad</summary><form class="inline-form" data-form="flag" data-id="${esc(r.source_id)}" style="margin-top:10px"><label class="screenreader" for="flagType">Problem</label><select id="flagType" name="type">${SOURCE_FLAG_TYPES.map((t) => `<option value="${t}">${esc(FLAG_LABEL[t])}</option>`).join('')}</select><input name="note" placeholder="Note (optional)" aria-label="Note"/><button class="btn small warn" type="submit">Send to review queue</button></form></details>` : ''}
  <p class="note">Source: ${esc(r.platform)}, ${esc(KIND_LABEL[r.source_url_kind] || '')}. Reference <span class="mono">${esc(r.source_id)}</span>. ${r.accessibility_restrictions.includes('may_require_login') ? 'The website may ask you to sign in. ' : ''}This page does not take job applications.</p>
  </div>`;
}

export function renderExplore() {
  answers();
  chips();
  list();
  if (app.state.selected && !app.data.records.some((r) => r.source_id === app.state.selected)) app.state.selected = null;
  renderDetail();
  renderPins();
  $('#verifiedLayerCount').textContent = `(${app.derived.reps.filter((r) => r.geo.geocode_verified).length})`;
  $('#presenceLayerCount').textContent = `(${app.derived.presence.length})`;
}

let lastFocus = null;
export function select(id) {
  lastFocus = document.activeElement;
  app.state.selected = id;
  app.state.selectedGroup = null;
  list();
  renderDetail();
  renderPins();
  $('#detailPanel .close')?.focus({ preventScroll: true });
}
export function closeDetail() {
  app.state.selected = null;
  app.state.selectedGroup = null;
  list();
  renderDetail();
  renderPins();
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

app.actions.select = (el) => select(el.dataset.id);
app.actions['close-detail'] = closeDetail;
app.actions.family = (el) => {
  app.state.filters.family = el.dataset.family;
  apply();
};
app.actions['clear-filters'] = () => clearFilters();
app.actions.shortlist = (el) => {
  const id = el.dataset.id;
  const s = app.state.shortlist;
  app.state.shortlist = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
  app.ls.set('noida-shortlist', app.state.shortlist);
  renderDetail();
  toast(app.state.shortlist.includes(id) ? 'Saved to your list on this device' : 'Removed from your list');
};
app.actions['queue-outreach'] = async (el) => {
  try {
    await app.client.queueOutreach(el.dataset.id);
    toast('Employer call planned');
    await app.refresh();
  } catch (e) {
    $('#detailPanel .drawer-in').insertAdjacentHTML('afterbegin', errorBox(e));
  }
};
app.actions['verify-this'] = (el) => {
  app.state.verifyPrefill = el.dataset.id;
  closeDetail();
  app.actions.tab({ dataset: { tab: 'verify' } });
};
app.forms.flag = async (form) => {
  const fd = new FormData(form);
  try {
    await app.client.flagSource(form.dataset.id, { type: fd.get('type'), note: fd.get('note') });
    toast('Sent to the review queue');
    await app.refresh();
  } catch (e) {
    form.insertAdjacentHTML('afterend', errorBox(e));
  }
};

function apply() {
  app.compute();
  renderExplore();
}

function clearFilters() {
  Object.assign(app.state.filters, { sector: 'all', query: '', family: 'all', career: 'all', verification: 'all', includeHistorical: false, includeUnclear: false });
  app.state.place = 'all';
  const l = /** @type {HTMLSelectElement} */ ($('#location'));
  if (l) l.value = 'all';
  app.state.suits = '';
  syncFilterControls();
  apply();
}

app.actions['clear-one'] = (el) => {
  const f = app.state.filters;
  const k = el.dataset.key;
  if (k === 'sector') { f.sector = 'all'; app.state.place = 'all'; const l = /** @type {HTMLSelectElement} */ ($('#location')); if (l) l.value = 'all'; }
  else if (k === 'query') f.query = '';
  else if (k === 'family') f.family = 'all';
  else if (k === 'suits') app.state.suits = '';
  else if (k === 'career') f.career = 'all';
  else if (k === 'verification') f.verification = 'all';
  else if (k === 'historic') f.includeHistorical = false;
  else if (k === 'unclear') f.includeUnclear = false;
  syncFilterControls();
  apply();
};

export function bindFilters() {
  const f = app.state.filters;
  $('#query').oninput = (e) => { f.query = e.target.value.trim(); apply(); };
  $('#career').onchange = (e) => { f.career = e.target.value; apply(); };
  $('#verification').onchange = (e) => { f.verification = e.target.value; apply(); };
  $('#historic').onchange = (e) => { f.includeHistorical = e.target.checked; apply(); };
  $('#unclear').onchange = (e) => { f.includeUnclear = e.target.checked; apply(); };
  $('#suits').onchange = (e) => {
    app.state.suits = e.target.value;
    if (e.target.value) app.state.persona = e.target.value;
    apply();
  };
  $('#moreBtn').onclick = () => {
    const p = $('#morePanel');
    p.classList.toggle('hide');
    $('#moreBtn').setAttribute('aria-expanded', String(!p.classList.contains('hide')));
  };
  $('#clearBtn').onclick = clearFilters;
  for (const [id, key] of [['#layerApprox', 'approx'], ['#layerVerified', 'verified'], ['#layerPresence', 'presence']]) {
    $(id).onchange = (e) => { app.state.layers[key] = e.target.checked; renderPins(); };
  }
}

export function fillSuitsOptions() {
  const sel = $('#suits');
  if (sel.options.length > 1) return;
  for (const p of app.data.profiles || []) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.label.replace(/ \(.*\)$/, '');
    sel.appendChild(o);
  }
}

export function syncFilterControls() {
  const f = app.state.filters;
  $('#query').value = f.query;
  $('#career').value = f.career;
  $('#verification').value = f.verification;
  $('#historic').checked = f.includeHistorical;
  $('#unclear').checked = f.includeUnclear;
  $('#suits').value = app.state.suits || '';
  if (f.includeHistorical || f.includeUnclear || f.career !== 'all' || f.verification !== 'all') {
    $('#morePanel').classList.remove('hide');
    $('#moreBtn').setAttribute('aria-expanded', 'true');
  }
}
