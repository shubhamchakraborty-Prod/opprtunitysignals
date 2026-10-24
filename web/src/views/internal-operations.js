// Research operations and permissions: summary-only screens.
// All privileged read/write actions continue to use existing service-layer RBAC.
import { app } from '../app.js';
import { esc, $, icon, artBox, errorBox, lockNotice, fmtDate } from '../ui.js';
import { researchQuality, researchQueueSummary } from '../../../src/core/research-ops.js';
import { PERMISSIONS, ROLE_LABELS } from '../../../src/core/rbac.js';

const access = (root, title) => {
  if (app.can('read:review')) return true;
  root.innerHTML = lockNotice(title, 'Research metrics and operational queues require an authorised team role. Public visitors cannot inspect unreviewed records or approval activity.');
  return false;
};
const acts = (items) => `<div class="iro-actions">${items.map(([tab,label,ic])=>`<button class="btn outlined small" data-action="tab" data-tab="${tab}">${icon(ic)}${esc(label)}</button>`).join('')}</div>`;
const notes = () => `<div class="iro-note" role="note"><strong>${icon('info')} Evidence rules</strong><p>Public advertisements are research signals, not confirmed vacancies. Only approved employer confirmations that meet the existing validity rules contribute to verified-opening counts. Noida is the collected pilot area; figures are not estimates for Kalyani or Siliguri.</p></div>`;
const heading = (name,title,lead,key='signals') => `<div class="section-head iro-head">${artBox(key)}<div><div class="eyebrow">Internal · ${esc(name)}</div><h2>${esc(title)}</h2><p>${esc(lead)}</p></div></div>`;
const metric = (label,value,desc) => `<div class="iro-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(desc)}</small></div>`;

export async function renderInternalOperations() {
  const root = $('#iops');
  if (!access(root,'Research operations')) return;
  root.innerHTML = '<p class="note">Reading authorised research queue…</p>';
  let queue;
  try {
    queue = researchQueueSummary(await app.client.reviewQueue());
    // A sign-out while a network request is in flight must not reveal the response.
    if (!app.can('read:review')) { access(root,'Research operations'); return; }
  } catch (e) { root.innerHTML = errorBox(e); return; }
  const q = researchQuality(app.data.records,app.data.asOf);
  const rows = [
    ['New submissions',queue.pendingReview,'CSV rows awaiting human review','review'],
    ['Employer checks',queue.employerChecks,'Ads to recheck with employers','review'],
    ['Possible duplicates',queue.duplicates,'Review deduplication evidence','review'],
    ['Source follow-ups',queue.followups,'Broken links or location concerns','review'],
    ['Employer approvals',queue.pendingEmployerApprovals,'Require second-person approval','review'],
    ['Interviews awaiting approval',queue.pendingInterviewApprovals,'Consent and record checks','review'],
    ['Unverifiable',queue.unverifiable,'Flagged sources needing investigation','review'],
    ['Stale records',queue.stale,'Records not rechecked in the queue window','review'],
  ];
  root.innerHTML = `${heading('Research overview','What needs attention today?','Review the actual research queue, understand evidence readiness and open the authorised workbench. No background checks run from this dashboard.')}
    ${app.client.mode === 'local' ? '<div class="callout"><strong>Offline practice mode.</strong> The queue uses the embedded dataset and sandbox role. Nothing is submitted to a live server.</div>' : ''}
    ${notes()}
    <div class="iro-kpis">
      ${metric('Research records',q.allRecords,'Including pending and unpublished records')}
      ${metric('Distinct current ads',q.distinctAds,'Deduplicated approved ads, not vacancies')}
      ${metric('Verified openings',q.confirmedOpenings,'Independent current employer confirmation only')}
      ${metric('Pending review',queue.pendingReview,'Research records awaiting approval')}
    </div>
    <div class="iro-main-grid">
      <section class="card"><div class="card-head"><h3>Research workbench</h3><small>Separate queues may overlap; do not add these counts</small></div>
      <div class="iro-queue">${rows.map(([label,num,desc,tab])=>`<button class="iro-queue-row" data-action="tab" data-tab="${tab}"><span><strong>${label}</strong><small>${desc}</small></span><b>${num}</b>${icon('arrow_forward')}</button>`).join('')}</div>
      </section>
      <section class="card"><div class="card-head"><h3>From collection to publication</h3><small>Existing approval process</small></div>
      <ol class="iro-steps"><li><span>01</span><div><strong>Capture source evidence</strong><p>Record where and when an advertisement was observed.</p></div></li>
      <li><span>02</span><div><strong>Review quality and duplicates</strong><p>Verify source, scope, dates and fields. Public visibility is controlled.</p></div></li>
      <li><span>03</span><div><strong>Check with employer</strong><p>A call or visit adds a dated, attributed verification record.</p></div></li>
      <li><span>04</span><div><strong>Second-person approval</strong><p>Only permitted administrators can approve a confirmation under existing controls.</p></div></li></ol>
      ${acts([['iquality','Inspect data quality','fact_check'],['evidence','View published sources','source_notes'],['signals','Course and market signals','trending_up']])}
      </section>
    </div>
    <p class="note">Queue and record snapshot: ${esc(fmtDate(queue.asOf||q.asOf))}. Queue metrics are operational workloads, not employment results. Review, verification and approval actions remain on their existing permission-controlled screens.</p>`;
}

let qualityFilter = 'all';
const qualityOptions = [['all','All diagnostics'],['source','Source link'],['date','Publication date'],['location','Location'],['experience','Experience'],['education','Education'],['pay','Advertised pay'],['stale','Freshness'],['verified','Verification']];
const reasonMatches = (issue,key) => {
  const s = issue.reasons.join(' ');
  return key === 'source' ? /Source URL/ : key === 'date' ? /Publication date/ : key === 'location' ? /sector not|Location basis/i : key === 'experience' ? /Experience/ : key === 'education' ? /Education/ : key === 'pay' ? /pay/ : key === 'stale' ? /rechecked|Last checked/i : /confirmation/i;
};
const matchIssue = (issue,key) => key === 'all' || reasonMatches(issue,key).test(issue.reasons.join(' '));

export function renderInternalQuality() {
  const root = $('#iquality');
  if (!access(root,'Data quality')) return;
  const q = researchQuality(app.data.records,app.data.asOf);
  const matches = q.issues.filter((issue)=>matchIssue(issue,qualityFilter));
  root.innerHTML = `${heading('Evidence diagnostics','Can we trust the records behind the charts?','Inspect missing fields, source provenance and recheck delays. These flags are diagnostics only; they do not change approval states.','evidence')}
    ${notes()}
    <div class="iro-kpis">
      ${metric('Approved records',q.approvedRecords,'Including older and non-ad evidence')}
      ${metric('Current distinct ads',q.distinctAds,'Denominator for diagnostics below')}
      ${metric('Mirrored listings',q.mirrorRecords,'Collapsed by existing deduplication rules')}
      ${metric('Published confirmed openings',q.confirmedOpenings,'Only currently valid approvals')}
    </div>
    <section class="card iro-quality">
      <div class="card-head"><h3>Field coverage</h3><small>Distinct current approved ads, n=${q.denominator}</small></div>
      <div class="iro-quality-grid">${q.metrics.map((x)=>`<button data-action="iro-quality-filter" data-filter="${x.key}" class="iro-quality-tile ${qualityFilter===x.key?'active':''}" aria-pressed="${qualityFilter===x.key}"><span>${esc(x.label)}</span><strong>${x.count}<small> / ${q.denominator}</small></strong>
        <span class="iro-quality-meter" aria-hidden="true"><i style="width:${q.denominator?Math.round(x.count/q.denominator*100):0}%"></i></span></button>`).join('')}</div>
      <p class="note iro-footnote">Missing fields are not necessarily inaccurate: for example, an employer may not publish pay. A missing item must not be imputed from another source.</p>
    </section>
    <section class="card"><div class="card-head"><h3>Records to investigate</h3>
      <label class="iro-filter-label">Issue type <select id="iroQualityFilter" aria-label="Filter research quality issues">${qualityOptions.map(([v,label])=>`<option value="${v}" ${v===qualityFilter?'selected':''}>${label}</option>`).join('')}</select></label></div>
      <div class="iro-issues">${matches.length ? matches.slice(0,30).map((x)=>`<article class="iro-issue">
        <div><strong>${esc(x.role)}</strong><span class="note">${esc(x.employer)} · ${esc(x.sector ? 'Sector '+x.sector : 'Area not established')} · ${esc(x.id)}</span></div>
        <ul>${x.reasons.map((r)=>`<li>${esc(r)}</li>`).join('')}</ul>
        <div class="iro-issue-link">${/^https:\\/\\//.test(x.sourceUrl) ? `<a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener">Open public source ${icon('open_in_new')}</a>` : '<span class="note">No HTTPS source link available</span>'}</div></article>`).join('') : '<p class="empty">No records match this diagnostic in the current approved ad sample.</p>'}</div>
      <div class="iro-footer-actions">${acts([['review','Open authorised review queue','inbox'],['evidence','Published evidence register','source_notes']])}</div>
    </section>
    <p class="note">Showing ${Math.min(30,matches.length)} of ${matches.length} records with selected diagnostics. Results use the dataset as of ${esc(fmtDate(q.asOf))}; this screen never auto-rejects or auto-approves records.</p>`;
  $('#iroQualityFilter').onchange = (event) => { qualityFilter = event.target.value; renderInternalQuality(); };
}

const CAPABILITIES = [
  ['read:review','Read queues and internal analysis'],
  ['ingest:csv','Upload evidence for review'],
  ['review:record','Approve or reject submitted evidence'],
  ['review:dedupe','Resolve duplicate records'],
  ['verify:submit','Record employer verification'],
  ['verify:approve','Approve employer verification'],
  ['read:audit','Inspect audit trail'],
  ['admin:feeds','Manage government feed settings'],
  ['admin:passouts','Manage approved pass-out figures'],
];
export function renderInternalAccess() {
  const root = $('#iaccess');
  if (!access(root,'Permissions and controls')) return;
  const role = app.data.actor?.role || 'observer';
  root.innerHTML = `${heading('Access and controls','Who can perform each research action?','Read the service-layer permission matrix and navigate to permitted workflows. This page does not grant roles or change access settings.','feeds')}
    <div class="iro-note"><strong>${icon('shield')} Current role: ${esc(ROLE_LABELS[role] || role)}</strong>
      <p>${app.client.mode==='local'?'Offline sandbox roles are for demonstration only; they do not provide live access.':'Production permissions are checked by the API service. Hiding a button alone is never an authorisation control.'} The existing repository has no user-provisioning endpoint in this workflow.</p></div>
    <div class="card"><div class="card-head"><h3>Permission overview</h3><small>Read-only configuration from current source code</small></div>
      <div class="table-scroll"><table class="minitable iro-access-table"><thead><tr><th>Capability</th>${Object.keys(ROLE_LABELS).map((r)=>`<th>${esc(ROLE_LABELS[r])}</th>`).join('')}</tr></thead><tbody>
        ${CAPABILITIES.map(([key,label])=>`<tr><td><strong>${esc(label)}</strong><div class="note">${esc(key)}</div></td>${Object.keys(ROLE_LABELS).map((r)=>`<td><span aria-label="${PERMISSIONS[r].includes(key)?'Allowed':'Not allowed'}">${PERMISSIONS[r].includes(key)?'Allowed':'—'}</span></td>`).join('')}</tr>`).join('')}
      </tbody></table></div></div>
    <div class="card card-body"><h3>Where actions are performed</h3><p>Use the established, audited workflows rather than attempting actions from this permissions overview.</p>
      ${acts([['review','Review and approvals','inbox'],['verify','Employer verification','call'],['feeds','Government feeds','cell_tower']])}
      <p class="note">If an action is not permitted for your signed-in role, its workflow remains restricted by the service. Adding or modifying users requires separate administration design, an authenticated API and audit controls.</p></div>`;
}
app.actions['iro-quality-filter'] = (el) => { qualityFilter = el.dataset.filter; renderInternalQuality(); };
app.views.iops = renderInternalOperations;
app.views.iquality = renderInternalQuality;
app.views.iaccess = renderInternalAccess;
