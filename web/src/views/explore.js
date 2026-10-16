// Explore opportunities: metrics, insight panel, evidence list and detail.
import { app } from '../app.js';
import { esc, $, $$, fmtDate, statusChip, staleBadge, postedText, toast, errorBox, BASIS_LABEL, PRECISION_LABEL, KIND_LABEL } from '../ui.js';
import { explainRecord, wageText } from '../../../src/core/decisions.js';
import { extractEmploymentTerms } from '../../../src/core/terms.js';
import { evidenceStrength } from '../../../src/core/schema.js';
import { isOlder, isInScope } from '../../../src/core/filters.js';
import { SOURCE_FLAG_TYPES } from '../../../src/core/constants.js';
import { renderPins } from '../map.js';

function metrics() {
  const k = app.derived.kpis;
  $('#mCount').textContent = k.signalCount;
  const extra = [k.mirrorsCollapsed ? `${k.mirrorsCollapsed} mirror${k.mirrorsCollapsed > 1 ? 's' : ''} counted once` : '', k.olderShown ? `${k.olderShown} older shown, not counted` : '', k.unclearShown ? `${k.unclearShown} unclear location not counted` : ''].filter(Boolean).join(' · ');
  $('#mCountSub').innerHTML = esc(extra || 'Deduplicated sampled listings, not vacancies');
  $('#m62').textContent = k.sector62;
  $('#m63').textContent = k.sector63;
  const prec = (p) => (p.precise + p.labelOnly ? `${p.precise} stated in listing · ${p.labelOnly} portal label or transcribed` : 'Within current filters');
  $('#m62Sub').textContent = prec(k.sector62Precision);
  $('#m63Sub').textContent = prec(k.sector63Precision);
  $('#mConfirmed').textContent = k.confirmedOpenings;
  const subs = [];
  if (k.confirmedAsOf) subs.push(`As of ${fmtDate(k.confirmedAsOf.latest)} · ${k.confirmedRecords} employer${k.confirmedRecords > 1 ? 's' : ''}`);
  else subs.push('No employer verification completed');
  if (k.pendingApprovalOpenings) subs.push(`${k.pendingApprovalOpenings} awaiting approval`);
  if (k.claimedButUnverified) subs.push(`${k.claimedButUnverified} claimed in adverts, not counted`);
  $('#mConfirmedSub').textContent = subs.join(' · ');
}

function insight() {
  const k = app.derived.kpis;
  const s = app.data.sentiment;
  $('#insightPanel').innerHTML = `<div><span class="mini-tag">What the evidence means</span><h3>Do not confuse a job advertisement with a confirmed vacancy.</h3><p>The public postings below show real <strong>occupational signals</strong>. A vacancy counts towards ITI course or cohort planning only after the employer confirms openings, terms and start date, and a second reviewer approves the record.</p></div>
  <div class="divider" style="margin:14px 0"></div>
  <div><h4>In the current view</h4>
  <div class="kv"><span>Current public signals</span><strong>${k.signalCount}</strong></div>
  <div class="kv"><span>Employer-confirmed openings</span><strong>${k.confirmedOpenings}</strong></div>
  <div class="kv"><span>Openings claimed in adverts (not counted)</span><strong>${k.claimedButUnverified}</strong></div>
  <div class="kv"><span>Collected</span><strong>${k.signalWindow ? (k.signalWindow.from === k.signalWindow.to ? fmtDate(k.signalWindow.from) : fmtDate(k.signalWindow.from) + ' – ' + fmtDate(k.signalWindow.to)) : '-'}</strong></div></div>
  <div class="notice"><strong>${esc(s.message)}</strong><br/>Night shifts, English level, six-day weeks or self-commuting are <em>advertised employment terms</em>, not worker sentiment. See “Worker &amp; employer voice”.</div>`;
}

function card(r) {
  const older = isOlder(r);
  const mirrors = app.mirrorsOf(r).length;
  const sector = r.sector || r.geo.claimed_sector;
  return `<article tabindex="0" role="button" aria-pressed="${app.state.selected === r.source_id}" data-action="select" data-id="${esc(r.source_id)}" class="job ${app.state.selected === r.source_id ? 'selected' : ''}">
  <div class="jobtop"><div><h4>${esc(r.role_title_raw)}</h4><div class="meta">${esc(r.employer_identity || 'Employer undisclosed')}${r.recruiter_identity ? ' via ' + esc(r.recruiter_identity) : ''} · ${isInScope(r) ? 'Noida Sector ' + esc(r.sector) : 'Location unclear (listed under ' + esc(sector) + ')'}</div></div><span class="sq">${isInScope(r) ? 'SECTOR ' + esc(r.sector) : 'NOT COUNTED'}</span></div>
  <div class="tags">${older ? `<span class="chip amber">${r.verification_status === 'historical' ? 'Older signal · ' + esc(postedText(r)) : 'Expired'}</span>` : statusChip(r.verification_status)}<span class="chip">${esc(r.occupation_family)}</span><span class="chip">${esc(r.experience.raw)}</span>${mirrors ? `<span class="chip violet">Possible duplicate · counted once</span>` : ''}${!isInScope(r) ? '<span class="chip red">Unclear / adjacent location</span>' : ''}${staleBadge(r, app.data.asOf)}</div>
  <div class="salary">${esc(wageText(r.wage))}</div></article>`;
}

function list() {
  const reps = app.derived.reps;
  $('#listCount').textContent = `${reps.length} record${reps.length === 1 ? '' : 's'} shown`;
  $('#jobCards').innerHTML = reps.length ? reps.map(card).join('') : '<div class="empty">No matching signals in this small sample. Clear filters to see more.</div>';
}

function fir(e) {
  return `<div class="fir"><div class="fact"><h5>Source fact</h5><ul>${e.facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="infer"><h5>Inference</h5><ul>${e.inferences.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="rec"><h5>Recommendation · ${esc(e.tierLabel)}</h5><p>${esc(e.recommendation)}</p></div></div>`;
}

function detailEmpty() {
  return '<div class="panel-head"><h3>Opportunity detail</h3><span class="count">Select an item</span></div><div class="detail-empty">Select any opportunity above or on the map.<small>You will see the source, facts, inferences and the recommended next step.</small></div>';
}

function groupDetail(g) {
  return `<div class="detail-head"><div><span class="mini-tag">Map group · ${esc(g.label)}</span><h3>${esc(g.employer)}</h3></div><button class="close" data-action="close-detail" aria-label="Close group">×</button></div>
  <div class="detail-company">${g.records.length} records share this employer and location precision. Pins are grouped so one employer is not shown as many places.</div>
  ${g.records.map((r) => `<div class="job" role="button" tabindex="0" data-action="select" data-id="${esc(r.source_id)}"><h4>${esc(r.role_title_raw)}</h4><div class="meta">${esc(r.source_id)} · ${esc(wageText(r.wage))}</div></div>`).join('')}`;
}

export function renderDetail() {
  const box = $('#detailPanel');
  if (app.state.selectedGroup && !app.state.selected) {
    box.innerHTML = groupDetail(app.state.selectedGroup);
    return;
  }
  const r = app.data.records.find((x) => x.source_id === app.state.selected);
  if (!r) {
    box.innerHTML = detailEmpty();
    return;
  }
  const e = explainRecord(r, app.data.asOf);
  const saved = app.state.shortlist.includes(r.source_id);
  const terms = extractEmploymentTerms(r);
  const mirrors = app.mirrorsOf(r);
  const geo = r.geo;
  box.innerHTML = `<div class="detail-head"><div><span class="mini-tag">${isInScope(r) ? 'Sector ' + esc(r.sector) : 'Location unclear'} · ${esc(evidenceStrength(r))}</span><h3>${esc(r.role_title_raw)}</h3></div><button class="close" data-action="close-detail" aria-label="Close opportunity">×</button></div>
  <div class="detail-company">${esc(r.employer_identity || 'Employer undisclosed')}${r.recruiter_identity ? ' · advertised by recruiter ' + esc(r.recruiter_identity) : ''} · ${esc(r.source_id)}</div>
  <div class="tags">${statusChip(r.verification_status)}<span class="chip">Confidence: ${esc(r.confidence.level)}</span>${staleBadge(r, app.data.asOf)}${r.open_flags.map((f) => `<span class="chip red">Flag: ${esc(f.replace(/_/g, ' '))}</span>`).join('')}</div>
  <dl class="info-grid"><div><dt>Advertised pay</dt><dd>${esc(wageText(r.wage))}</dd></div><div><dt>Experience</dt><dd>${esc(r.experience.raw)}</dd></div><div><dt>Education stated</dt><dd>${esc(r.education.raw)}</dd></div><div><dt>Employer confirmation</dt><dd>${r.verification_status === 'employer_confirmed' ? `${r.vacancy_count_verified} opening(s), ${fmtDate(r.verified_at)}` : 'Not obtained'}</dd></div>
  <div><dt>Location precision</dt><dd>${esc(PRECISION_LABEL[geo.granularity])}${geo.locality_text ? ' · ' + esc(geo.locality_text) : ''}</dd></div><div><dt>Location basis</dt><dd>${esc(BASIS_LABEL[geo.basis] || geo.basis)}</dd></div>
  <div><dt>Captured / posted</dt><dd>${fmtDate(r.captured_at)} · ${esc(postedText(r))}</dd></div><div><dt>Openings claimed in advert</dt><dd>${r.vacancy_claimed ? esc(r.vacancy_claimed) + ' (unverified)' : 'Not stated'}</dd></div>
  ${r.verification_status === 'employer_confirmed' && r.start_date ? `<div><dt>Expected start</dt><dd>${fmtDate(r.start_date)}</dd></div>` : ''}<div><dt>Contract</dt><dd>${esc(r.contract_type.replace(/_/g, ' '))}</dd></div></dl>
  <div class="section-mini">Skills mentioned or suggested for screening</div><div class="tags">${r.skills.map((s) => `<span class="chip">${esc(s.name)}</span>`).join('')}</div>
  ${terms.length ? `<div class="terms-box"><strong>Employment terms (from the advert, not sentiment):</strong> ${terms.map((t) => esc(t.label)).join(' · ')}</div>` : ''}
  ${(r.verified_roles || []).length ? `<div class="section-mini">Employer-confirmed roles</div><table class="minitable"><tr><th>Role</th><th>Trade</th><th>Openings</th><th>Entry pay</th><th>Start</th><th>Pre-screen</th></tr>${r.verified_roles.map((v) => `<tr><td>${esc(v.role_title)}</td><td>${esc(v.trade.replace(/_/g, ' '))}</td><td>${esc(v.openings)}</td><td>${v.entry_wage_min != null || v.entry_wage_max != null ? '₹' + esc(v.entry_wage_min ?? '') + '–' + esc(v.entry_wage_max ?? '') + ' / ' + esc(v.wage_period) : 'Not given'}</td><td>${v.start_date ? fmtDate(v.start_date) : '-'}</td><td>${esc(v.prescreen || '-')}</td></tr>`).join('')}</table>` : ''}
  ${fir(e)}
  ${mirrors.length ? `<div class="note"><strong>Possible duplicate:</strong> also seen as ${mirrors.map((m) => `<a href="${esc(m.source_url)}" target="_blank" rel="noopener">${esc(m.source_id)} on ${esc(m.platform)} ↗</a>`).join(', ')}. Counted once.</div>` : ''}
  <div class="detail-actions"><a class="btn strong" href="${esc(r.source_url)}" target="_blank" rel="noopener">Open original source ↗</a><button class="btn" data-action="shortlist" data-id="${esc(r.source_id)}">${saved ? 'Remove from shortlist' : 'Save to shortlist'}</button>
  ${app.can('queue:outreach') && r.verification_status === 'observed_public' && isInScope(r) ? `<button class="btn" data-action="queue-outreach" data-id="${esc(r.source_id)}">Queue for employer check</button>` : ''}
  ${app.can('verify:submit') && isInScope(r) && !isOlder(r) ? `<button class="btn" data-action="verify-this" data-id="${esc(r.source_id)}">Record employer verification</button>` : ''}</div>
  ${app.can('flag:source') ? `<form class="inline-form" data-form="flag" data-id="${esc(r.source_id)}"><label class="screenreader" for="flagType">Flag type</label><select id="flagType" name="type">${SOURCE_FLAG_TYPES.map((t) => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('')}</select><input name="note" placeholder="Note (optional)" aria-label="Flag note"/><button class="btn small warn" type="submit">Flag source for follow-up</button></form>` : ''}
  <div class="note">Source: ${esc(r.platform)} ${esc(KIND_LABEL[r.source_url_kind] || '')} · captured ${fmtDate(r.captured_at)} · last rechecked ${fmtDate(r.last_rechecked_at)}. ${r.accessibility_restrictions.includes('may_require_login') ? 'The source may ask you to sign in. ' : ''}This is not an application portal.</div>`;
}

export function renderExplore() {
  metrics();
  insight();
  list();
  if (app.state.selected && !app.data.records.some((r) => r.source_id === app.state.selected)) app.state.selected = null;
  renderDetail();
  renderPins();
  $('#verifiedLayerCount').textContent = `(${app.derived.reps.filter((r) => r.geo.geocode_verified).length})`;
  $('#presenceLayerCount').textContent = `(${app.derived.presence.length})`;
}

export function select(id) {
  app.state.selected = id;
  app.state.selectedGroup = null;
  list();
  renderDetail();
  renderPins();
  if (innerWidth < 900) $('#detailPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

app.actions.select = (el) => select(el.dataset.id);
app.actions['close-detail'] = () => {
  app.state.selected = null;
  app.state.selectedGroup = null;
  list();
  renderDetail();
  renderPins();
};
app.actions.shortlist = (el) => {
  const id = el.dataset.id;
  const s = app.state.shortlist;
  app.state.shortlist = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
  app.ls.set('noida-shortlist', app.state.shortlist);
  renderDetail();
};
app.actions['queue-outreach'] = async (el) => {
  try {
    await app.client.queueOutreach(el.dataset.id);
    toast(`${el.dataset.id} queued for employer check`);
    await app.refresh();
  } catch (e) {
    $('#detailPanel').insertAdjacentHTML('afterbegin', errorBox(e));
  }
};
app.actions['verify-this'] = (el) => {
  app.state.verifyPrefill = el.dataset.id;
  app.actions.tab({ dataset: { tab: 'verify' } });
};
app.forms = app.forms || {};
app.forms.flag = async (form) => {
  const fd = new FormData(form);
  try {
    await app.client.flagSource(form.dataset.id, { type: fd.get('type'), note: fd.get('note') });
    toast('Source flagged for follow-up in the review queue');
    await app.refresh();
  } catch (e) {
    form.insertAdjacentHTML('afterend', errorBox(e));
  }
};

export function bindFilters() {
  const f = app.state.filters;
  const apply = () => {
    app.compute();
    renderExplore();
  };
  $$('.seg').forEach((b) => (b.onclick = () => {
    f.sector = /** @type {any} */ (b.dataset.sector);
    syncFilterControls();
    apply();
  }));
  $('#query').oninput = (e) => { f.query = e.target.value.trim(); apply(); };
  $('#family').onchange = (e) => { f.family = e.target.value; apply(); };
  $('#career').onchange = (e) => { f.career = e.target.value; apply(); };
  $('#verification').onchange = (e) => { f.verification = e.target.value; apply(); };
  $('#historic').onchange = (e) => { f.includeHistorical = e.target.checked; apply(); };
  $('#unclear').onchange = (e) => { f.includeUnclear = e.target.checked; apply(); };
  $('#clearBtn').onclick = () => {
    Object.assign(f, { sector: 'all', query: '', family: 'all', career: 'all', verification: 'all', includeHistorical: false, includeUnclear: false });
    syncFilterControls();
    apply();
  };
  for (const [id, key] of [['#layerApprox', 'approx'], ['#layerVerified', 'verified'], ['#layerPresence', 'presence']]) {
    $(id).onchange = (e) => { app.state.layers[key] = e.target.checked; renderPins(); };
  }
}

export function syncFilterControls() {
  const f = app.state.filters;
  $$('.seg').forEach((x) => { x.classList.toggle('active', x.dataset.sector === f.sector); x.setAttribute('aria-pressed', String(x.dataset.sector === f.sector)); });
  $('#query').value = f.query;
  $('#family').value = f.family;
  $('#career').value = f.career;
  $('#verification').value = f.verification;
  $('#historic').checked = f.includeHistorical;
  $('#unclear').checked = f.includeUnclear;
}
