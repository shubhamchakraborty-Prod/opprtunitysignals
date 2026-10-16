// Source review queue: uploads awaiting review, employer checks, duplicates,
// unverifiable and expired signals, source follow-ups, verification approvals
// and the audit log. Every action goes through the service (RBAC + audit).
import { app } from '../app.js';
import { esc, $, toast, errorBox, lockNotice, fmtDate, statusChip, staleBadge, download, KIND_LABEL } from '../ui.js';
import { wageText } from '../../../src/core/decisions.js';

let lastError = '';

const rec = (r) => r ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.source_id)} ↗</a> ${esc(r.role_title_raw)} · ${esc(r.employer_identity || r.recruiter_identity || 'Undisclosed')}` : 'Record not found';
const sec = (title, desc, inner, n) => `<div class="queue-section"><h3>${esc(title)} <span class="tab-count">${n ?? ''}</span></h3><p>${esc(desc)}</p>${inner}</div>`;
const empty = '<p class="note">Nothing waiting.</p>';

export async function renderReview() {
  const root = $('#review');
  if (!app.can('read:review')) {
    root.innerHTML = lockNotice('Review queue', 'This area is for the research team: checking new ads, repeat ads, broken links and employer calls.');
    return;
  }
  root.innerHTML = '<p class="note">Loading the queue…</p>';
  let q, audit = [];
  try {
    q = await app.client.reviewQueue();
    if (app.can('read:audit')) audit = await app.client.auditLog();
  } catch (e) {
    root.innerHTML = errorBox(e);
    return;
  }
  const can = (p) => app.can(p);
  const ex = q.expired;
  root.innerHTML = `<div class="section-head"><div><h2>Review queue</h2><p>Nothing is shown publicly or counted until a person has reviewed it. As of ${fmtDate(q.asOf)}.</p></div></div>${lastError}
  ${sec('Uploaded records awaiting review', 'CSV rows enter here. They are not shown publicly or counted until approved.', `${can('ingest:csv') ? `<form class="inline-form" data-form="csv"><label for="csvFile" class="screenreader">CSV file</label><input type="file" id="csvFile" name="file" accept=".csv,text/csv" required/><button class="btn small" type="submit">Upload CSV for review</button><button type="button" class="btn small" data-action="csv-template">Download template</button></form>` : ''}
    ${q.pendingReview.length ? `<table class="minitable" style="margin-top:10px"><tr><th>Record</th><th>Sector</th><th>Source</th><th>Captured</th><th>Action</th></tr>${q.pendingReview.map((r) => `<tr><td>${rec(r)}</td><td>${esc(r.sector || 'unclear (' + (r.geo.claimed_sector || '?') + ')')}</td><td>${esc(r.platform)} · ${esc(KIND_LABEL[r.source_url_kind] || '')}</td><td>${fmtDate(r.captured_at)}</td><td>${can('review:record') ? `<button class="btn small" data-action="review-record" data-id="${esc(r.source_id)}" data-decision="approve">Approve</button> <button class="btn small warn" data-action="review-record" data-id="${esc(r.source_id)}" data-decision="reject">Reject</button>` : '-'}</td></tr>`).join('')}</table>` : empty}`, q.pendingReview.length)}
  ${sec('Pending employer verification', 'Current, in-scope public signals with no employer confirmation yet. Priority items first.', q.awaitingEmployerCheck.length ? `<table class="minitable"><tr><th>Record</th><th>Sector</th><th>Status</th><th>Priority</th><th>Pay</th><th>Action</th></tr>${q.awaitingEmployerCheck.map(({ record: r, tier, lastAttempt }) => `<tr><td>${rec(r)}${staleBadge(r, q.asOf)}</td><td>${esc(r.sector)}</td><td>${statusChip(r.verification_status)}${lastAttempt ? `<div class="note">Last attempt ${fmtDate(lastAttempt.verified_at)}: ${esc(lastAttempt.outcome)}</div>` : ''}</td><td>${esc(tier.tier.replace(/_/g, ' '))}</td><td>${esc(wageText(r.wage))}</td><td>${can('verify:submit') ? `<button class="btn small" data-action="verify-this" data-id="${esc(r.source_id)}">Record verification</button>` : ''} ${can('queue:outreach') && r.verification_status === 'observed_public' ? `<button class="btn small" data-action="queue-outreach" data-id="${esc(r.source_id)}">Queue</button>` : ''}</td></tr>`).join('')}</table>` : empty, q.awaitingEmployerCheck.length)}
  ${sec('Duplication review', 'Records that look like the same post on different portals. They are counted once until you decide.', q.duplicates.length ? q.duplicates.map((d) => `<div class="section-panel"><strong>${esc(d.cluster)}</strong><ul class="note">${d.members.map((m) => `<li>${rec(m)} · ${esc(m.platform)}</li>`).join('')}</ul>${can('review:dedupe') ? `<button class="btn small" data-action="dedupe" data-cluster="${esc(d.cluster)}" data-decision="same_post">Same post (keep one)</button> <button class="btn small" data-action="dedupe" data-cluster="${esc(d.cluster)}" data-decision="different_posts">Different posts</button>` : ''}</div>`).join('') : empty, q.duplicates.length)}
  ${sec('Unverifiable sources', 'Flagged as unverifiable, or the employer did not respond.', q.unverifiable.length ? `<ul class="note">${q.unverifiable.map((u) => `<li>${rec(u.record)} · ${esc(u.flag.type.replace(/_/g, ' '))}${u.flag.note ? ': ' + esc(u.flag.note) : ''}</li>`).join('')}</ul>` : empty, q.unverifiable.length)}
  ${sec('Expired and stale signals', 'Possibly closed, past expiry, not rechecked for 14 days, or employer confirmation older than 90 days.', `
    ${ex.possiblyClosed.length ? `<h4>Possibly closed</h4><ul class="note">${ex.possiblyClosed.map((x) => `<li>${rec(x.record)} · ${esc(x.flag.note || '')} ${can('expire:record') ? `<form class="inline-form" data-form="expire" data-id="${esc(x.record.source_id)}" style="margin-top:6px"><input name="reason" required value="Ad no longer accepting applications" aria-label="Reason"/><button class="btn small warn" type="submit">Mark closed</button></form>` : ''} ${can('review:record') ? `<button class="btn small" data-action="resolve-flag" data-id="${esc(x.flag.id)}" data-ok="1">Rechecked: still open</button>` : ''}</li>`).join('')}</ul>` : ''}
    ${ex.pastExpiry.length ? `<h4>Past expiry date</h4><ul class="note">${ex.pastExpiry.map((r) => `<li>${rec(r)} · expiry ${fmtDate(r.expiry)} ${can('expire:record') ? `<form class="inline-form" data-form="expire" data-id="${esc(r.source_id)}" style="margin-top:6px"><input name="reason" required value="Past expiry date" aria-label="Reason"/><button class="btn small warn" type="submit">Mark closed</button></form>` : ''}</li>`).join('')}</ul>` : ''}
    ${ex.stale.length ? `<h4>Not rechecked for over 14 days</h4><ul class="note">${ex.stale.map((r) => `<li>${rec(r)} · last rechecked ${fmtDate(r.last_rechecked_at)}</li>`).join('')}</ul>` : ''}
    ${ex.staleVerification.length ? `<h4>Employer confirmation older than 90 days</h4><ul class="note">${ex.staleVerification.map((r) => `<li>${rec(r)} · verified ${fmtDate(r.verified_at)}</li>`).join('')}</ul>` : ''}
    ${ex.marked.length ? `<h4>Marked expired</h4><ul class="note">${ex.marked.map((r) => `<li>${rec(r)}</li>`).join('')}</ul>` : ''}
    ${!ex.possiblyClosed.length && !ex.pastExpiry.length && !ex.stale.length && !ex.staleVerification.length && !ex.marked.length ? empty : ''}`, ex.possiblyClosed.length + ex.pastExpiry.length + ex.stale.length + ex.staleVerification.length)}
  ${sec('Source follow-ups', 'Broken links, location mismatches and other flags raised by reviewers or the link checker.', q.followups.length ? `<ul class="note">${q.followups.map((x) => `<li>${rec(x.record)} · <strong>${esc(x.flag.type.replace(/_/g, ' '))}</strong> ${esc(x.flag.note || '')} <small>raised by ${esc(x.flag.raised_by)}</small> ${can('review:record') ? `<button class="btn small" data-action="resolve-flag" data-id="${esc(x.flag.id)}" data-ok="1">Rechecked and fine</button> <button class="btn small" data-action="resolve-flag" data-id="${esc(x.flag.id)}">Close flag</button>` : ''}</li>`).join('')}</ul>` : empty, q.followups.length)}
  ${sec('Employer verifications awaiting second-person approval', 'Openings count towards the verified KPI only after someone other than the submitter approves.', q.verificationsAwaitingApproval.length ? `<table class="minitable"><tr><th>Employer</th><th>Linked record</th><th>Outcome</th><th>Roles and openings</th><th>Contacted</th><th>Contact</th><th>Submitted by</th><th>Action</th></tr>${q.verificationsAwaitingApproval.map((v) => `<tr><td>${esc(v.employer_identity)}</td><td>${esc(v.record_id || 'New employer opening')}</td><td>${esc(v.outcome)}</td><td>${v.roles.map((x) => `${esc(x.role_title)} × ${x.openings} (${esc(x.trade.replace(/_/g, ' '))})`).join('<br/>') || '-'}</td><td>${fmtDate(v.verified_at)} · ${esc(v.method)}</td><td>${v.contact ? esc([v.contact.name, v.contact.designation].filter(Boolean).join(', ')) : '-'}</td><td>${esc(v.submitted_by)}</td><td>${can('verify:approve') ? `<button class="btn small" data-action="decide-verification" data-id="${esc(v.id)}" data-decision="approve">Approve</button> <button class="btn small warn" data-action="decide-verification" data-id="${esc(v.id)}" data-decision="reject">Reject</button>` : 'Needs administrator'}</td></tr>`).join('')}</table>` : empty, q.verificationsAwaitingApproval.length)}
  ${q.interviewsAwaitingApproval.length ? sec('Interviews awaiting approval', 'Consented interview records before they can feed the sentiment layer.', `<ul class="note">${q.interviewsAwaitingApproval.map((i) => `<li>${esc(i.respondent_group)} · Sector ${esc(i.sector || '-')} · ${fmtDate(i.interview_date)} · themes: ${esc(i.themes.map((t) => t.theme).join(', '))} <button class="btn small" data-action="decide-interview" data-id="${esc(i.id)}" data-decision="approve">Approve</button> <button class="btn small warn" data-action="decide-interview" data-id="${esc(i.id)}" data-decision="reject">Reject</button></li>`).join('')}</ul>`, q.interviewsAwaitingApproval.length) : ''}
  ${can('read:audit') ? sec('Audit log', 'Append-only record of every change: who, what, when.', audit.length ? `<div style="max-height:320px;overflow:auto"><table class="minitable"><tr><th>When (UTC)</th><th>Who</th><th>Role</th><th>Action</th><th>Summary</th></tr>${audit.map((a) => `<tr><td>${esc(a.at.replace('T', ' ').slice(0, 19))}</td><td>${esc(a.actor_id)}</td><td>${esc(a.actor_role)}</td><td>${esc(a.action)}</td><td>${esc(a.summary)}</td></tr>`).join('')}</table></div>` : '<p class="note">No changes recorded yet in this session.</p>', audit.length) : ''}
  `;
  lastError = '';
}

async function act(fn, msg) {
  try {
    await fn();
    toast(msg);
  } catch (e) {
    lastError = errorBox(e);
  }
  await app.refresh();
}

app.actions['review-record'] = (el) => act(() => app.client.reviewRecord(el.dataset.id, { decision: el.dataset.decision }), `Record ${el.dataset.decision}d`);
app.actions.dedupe = (el) => act(() => app.client.resolveDuplicate(el.dataset.cluster, { decision: el.dataset.decision }), 'Duplicate decision saved');
app.actions['resolve-flag'] = (el) => act(() => app.client.resolveFlag(el.dataset.id, { recheckedOk: el.dataset.ok === '1', note: el.dataset.ok === '1' ? 'Source rechecked by reviewer' : 'Closed by reviewer' }), 'Flag resolved');
app.forms.expire = (form) => {
  const reason = String(new FormData(form).get('reason') || '').trim();
  if (!reason) return;
  return act(() => app.client.expireRecord(form.dataset.id, { reason }), 'Ad marked closed');
};
app.actions['decide-verification'] = (el) => act(() => app.client.decideVerification(el.dataset.id, { decision: el.dataset.decision }), `Verification ${el.dataset.decision}d`);
app.actions['decide-interview'] = (el) => act(() => app.client.decideInterview(el.dataset.id, { decision: el.dataset.decision }), `Interview ${el.dataset.decision}d`);
app.actions['csv-template'] = async () => {
  const { REGISTER_COLUMNS } = await import('../../../src/core/schema.js');
  await download('evidence_upload_template.csv', '\uFEFF' + REGISTER_COLUMNS.filter((c) => !['source_url_kind', 'evidence_strength', 'verification_status', 'verification_contact', 'verified_at', 'vacancy_count_verified', 'start_date', 'dedupe_cluster', 'duplicate_status', 'review_state', 'open_flags'].includes(c)).join(',') + '\r\n', 'text/csv;charset=utf-8');
};
app.forms.csv = async (form) => {
  const file = form.querySelector('input[type=file]').files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const res = await app.client.importCsv(text, { label: `Upload ${file.name}` });
    lastError = res.rejected.length ? `<div class="errors" role="alert"><strong>${res.rejected.length} row(s) rejected</strong><ul>${res.rejected.map((r) => `<li>Row ${r.row}: ${esc(r.errors.join('; '))}</li>`).join('')}</ul></div>` : '';
    toast(`${res.accepted.length} row(s) accepted for review`);
  } catch (e) {
    lastError = errorBox(e);
  }
  await app.refresh();
};

app.views.review = renderReview;
