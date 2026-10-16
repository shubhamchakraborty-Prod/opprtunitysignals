// Employer verification form: dated notes, confirmed roles and openings, entry
// pay, start dates, pre-screen requirements, outreach contact and consent basis.
import { app } from '../app.js';
import { esc, $, $$, toast, errorBox, lockNotice } from '../ui.js';
import { TRADES, VERIFICATION_METHODS, VERIFICATION_OUTCOMES } from '../../../src/core/service.js';
import { CONSENT_BASES, OCCUPATION_FAMILIES } from '../../../src/core/constants.js';
import { isInScope, isOlder } from '../../../src/core/filters.js';

let message = '';

const roleRow = (i, r = {}) => `<div class="role-row" data-role="${i}">
<div><label for="rt${i}">Role</label><input id="rt${i}" name="role_title" value="${esc(r.role_title || '')}" required/></div>
<div><label for="rf${i}">Occupation group</label><select id="rf${i}" name="occupation_family">${OCCUPATION_FAMILIES.map((f) => `<option ${r.occupation_family === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
<div><label for="ro${i}">Openings</label><input id="ro${i}" name="openings" type="number" min="1" step="1" required/></div>
<div><label for="rtr${i}">ITI trade</label><select id="rtr${i}" name="trade">${TRADES.map((t) => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('')}</select></div>
<div><label for="rw1${i}">Entry pay min (₹)</label><input id="rw1${i}" name="entry_wage_min" type="number" min="0"/></div>
<div><label for="rw2${i}">Entry pay max (₹)</label><input id="rw2${i}" name="entry_wage_max" type="number" min="0"/></div>
<div><label for="rp${i}">Per</label><select id="rp${i}" name="wage_period"><option>month</option><option>day</option><option>year</option></select></div>
<div><label for="rs${i}">Expected start</label><input id="rs${i}" name="start_date" type="date"/></div>
<div><label for="rq${i}">Interview / pre-screen</label><input id="rq${i}" name="prescreen" placeholder="e.g. practical soldering test"/></div>
<div>${i > 0 ? `<button type="button" class="btn small" data-action="remove-role" data-i="${i}" aria-label="Remove role">×</button>` : ''}</div>
</div>`;

export function renderVerify() {
  const root = $('#verify');
  if (!app.can('verify:submit')) {
    root.innerHTML = lockNotice('Record an employer call', 'This form is for the team member who phones or visits employers. Each call needs a dated note, the confirmed jobs and the legal basis for contact, and a second person approves it.');
    return;
  }
  const candidates = app.data.records.filter((r) => r.review.state === 'approved' && isInScope(r) && !isOlder(r) && r.evidence_type !== 'employer_presence');
  const pre = app.data.records.find((r) => r.source_id === app.state.verifyPrefill);
  const today = app.data.asOf;
  root.innerHTML = `<div class="section-head"><div><h2>Record an employer call</h2><p>Fill this in after speaking to the employer. Contact details are visible only to the team. The jobs count only after a second person approves this in the Review queue.</p></div></div>${message}
  <form class="form card card-body" data-form="verification" novalidate>
  <div class="form-grid">
  <div class="full"><label for="vRec">Public signal being verified</label><select id="vRec" name="record_id"><option value="">None - new opening reported directly by the employer</option>${candidates.map((r) => `<option value="${esc(r.source_id)}" ${pre?.source_id === r.source_id ? 'selected' : ''}>${esc(r.source_id)} · ${esc(r.role_title_raw)} · ${esc(r.employer_identity || r.recruiter_identity || 'Undisclosed')} · Sector ${esc(r.sector)}</option>`).join('')}</select></div>
  <div><label for="vEmp">Employer (legal or trading name)</label><input id="vEmp" name="employer_identity" required value="${esc(pre?.employer_identity || '')}"/></div>
  <div><label for="vUrl">Employer website or careers page</label><input id="vUrl" name="evidence_url" type="url" placeholder="Required when no public signal is linked"/></div>
  <div><label for="vDate">Date of contact</label><input id="vDate" name="verified_at" type="date" max="${today}" value="${today}" required/></div>
  <div><label for="vMethod">Method</label><select id="vMethod" name="method">${VERIFICATION_METHODS.map((m) => `<option value="${m}">${m.replace(/_/g, ' ')}</option>`).join('')}</select></div>
  <div><label for="vOutcome">Outcome</label><select id="vOutcome" name="outcome">${VERIFICATION_OUTCOMES.map((m) => `<option value="${m}">${m.replace(/_/g, ' ')}</option>`).join('')}</select><div class="hint">“Contradicted” or “filled or closed” removes the signal from planning; “no response” keeps it pending.</div></div>
  <div><label for="vValid">Valid until (optional)</label><input id="vValid" name="valid_until" type="date"/><div class="hint">Defaults to 90 days after contact.</div></div>
  <fieldset class="full"><legend>Jobs the employer confirmed</legend><div id="roleRows">${roleRow(0, pre ? { role_title: pre.role_title_raw, occupation_family: pre.occupation_family } : {})}</div><button type="button" class="btn small" data-action="add-role">Add another role</button></fieldset>
  <fieldset class="full"><legend>Work location</legend><div class="form-grid">
  <div><label for="vSec">Sector</label><select id="vSec" name="sector"><option value="62" ${pre?.sector === '62' ? 'selected' : ''}>62</option><option value="63" ${pre?.sector === '63' ? 'selected' : ''}>63</option></select></div>
  <div><label for="vPrec">Precision confirmed</label><select id="vPrec" name="granularity"><option value="sector">Sector only</option><option value="locality">Locality / block</option><option value="address">Street address</option><option value="building">Building</option></select></div>
  <div class="full"><label for="vLoc">Address or block as stated by employer</label><input id="vLoc" name="locality_text" placeholder="e.g. C Block, Sector 63"/></div>
  <div><label for="vLat">Latitude (optional)</label><input id="vLat" name="lat" type="number" step="0.000001" min="28.4" max="28.8"/></div>
  <div><label for="vLon">Longitude (optional)</label><input id="vLon" name="lon" type="number" step="0.000001" min="77.2" max="77.6"/></div>
  <div class="full"><label class="checkline" style="text-transform:none;letter-spacing:0"><input type="checkbox" name="geocode_verified"/> I checked these coordinates against the employer's address (adds a square pin to the verified-address layer)</label></div></div></fieldset>
  <fieldset class="full"><legend>Dated notes</legend><div id="noteRows"><div class="form-grid"><div><label for="n0d">Date</label><input id="n0d" type="date" name="note_date" value="${today}"/></div><div><label for="n0t">Note</label><input id="n0t" name="note_text" required placeholder="What the employer said"/></div></div></div><button type="button" class="btn small" data-action="add-note" style="margin-top:8px">Add another note</button></fieldset>
  <fieldset class="full"><legend>Outreach contact (restricted)</legend><div class="form-grid"><div><label for="cName">Contact name</label><input id="cName" name="contact_name"/></div><div><label for="cDes">Designation</label><input id="cDes" name="contact_designation"/></div><div><label for="cCh">Channel</label><input id="cCh" name="contact_channel" placeholder="phone / email / visit"/></div></div><div class="hint">Shown only to verifiers and administrators. Never shown on public views or exports for observers.</div></fieldset>
  <div><label for="vConsent">Consent or legal basis</label><select id="vConsent" name="consent_basis">${CONSENT_BASES.map((b) => `<option value="${b}">${b.replace(/_/g, ' ')}</option>`).join('')}</select></div>
  <div><label for="vConsentNote">Consent note</label><input id="vConsentNote" name="consent_note" placeholder="e.g. HR agreed to be recontacted"/></div>
  </div><div class="actions"><button class="btn primary" type="submit">Send for approval</button></div></form>`;
  app.state.verifyPrefill = null;
  message = '';
}

app.actions['add-role'] = () => {
  const rows = $('#roleRows');
  rows.insertAdjacentHTML('beforeend', roleRow(rows.children.length));
};
app.actions['remove-role'] = (el) => el.closest('.role-row').remove();
app.actions['add-note'] = () => {
  const i = $('#noteRows').children.length;
  $('#noteRows').insertAdjacentHTML('beforeend', `<div class="form-grid" style="margin-top:8px"><div><label for="n${i}d">Date</label><input id="n${i}d" type="date" name="note_date" value="${app.data.asOf}"/></div><div><label for="n${i}t">Note</label><input id="n${i}t" name="note_text"/></div></div>`);
};

app.forms.verification = async (form) => {
  const fd = new FormData(form);
  const roles = $$('.role-row', form).map((row) => {
    const v = (n) => row.querySelector(`[name=${n}]`).value;
    return { role_title: v('role_title'), occupation_family: v('occupation_family'), openings: Number(v('openings')), trade: v('trade'), entry_wage_min: v('entry_wage_min'), entry_wage_max: v('entry_wage_max'), wage_period: v('wage_period'), start_date: v('start_date') || null, prescreen: v('prescreen') || null };
  });
  const dates = fd.getAll('note_date'), texts = fd.getAll('note_text');
  const payload = {
    record_id: fd.get('record_id') || null,
    employer_identity: fd.get('employer_identity'),
    evidence_url: fd.get('evidence_url') || null,
    verified_at: fd.get('verified_at'),
    method: fd.get('method'),
    outcome: fd.get('outcome'),
    valid_until: fd.get('valid_until') || null,
    roles: fd.get('outcome') === 'confirmed' ? roles : [],
    work_location: { sector: fd.get('sector'), granularity: fd.get('granularity'), locality_text: fd.get('locality_text') || null, lat: fd.get('lat') ? Number(fd.get('lat')) : null, lon: fd.get('lon') ? Number(fd.get('lon')) : null, geocode_verified: !!fd.get('geocode_verified') },
    notes: texts.map((t, i) => ({ date: dates[i], text: t })).filter((n) => String(n.text).trim()),
    contact: fd.get('contact_name') || fd.get('contact_designation') ? { name: fd.get('contact_name'), designation: fd.get('contact_designation'), channel: fd.get('contact_channel') } : null,
    consent_basis: fd.get('consent_basis'),
    consent_note: fd.get('consent_note') || null,
  };
  try {
    const v = await app.client.submitVerification(payload);
    message = `<div class="ok-box" role="status"><strong>Submitted ${esc(v.id)}.</strong> It is waiting for approval by a second person in the Source review queue. The verified-openings figure will not change until then.</div>`;
    toast('Verification submitted for approval');
    await app.refresh();
  } catch (e) {
    form.insertAdjacentHTML('beforebegin', errorBox(e));
    form.previousElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

app.views.verify = renderVerify;
