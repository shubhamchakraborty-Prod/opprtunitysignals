// @ts-check
// Read-only research health from the authorised bootstrap and review queue.
// Diagnostics are not automatic approvals, verified vacancies or a completeness census.
import { daysBetween } from './util.js';
import { isInScope } from './filters.js';
import { isValidConfirmed } from './analytics.js';
import { representatives } from './dedupe.js';

/** Count each workflow separately: a record can appear in several queues. */
export function researchQueueSummary(q) {
  if (!q) return null;
  const n = (key) => Array.isArray(q[key]) ? q[key].length : 0;
  const ex = q.expired || {};
  return {
    asOf: q.asOf || null,
    pendingReview: n('pendingReview'),
    employerChecks: n('awaitingEmployerCheck'),
    duplicates: n('duplicates'),
    followups: n('followups'),
    pendingEmployerApprovals: n('verificationsAwaitingApproval'),
    pendingInterviewApprovals: n('interviewsAwaitingApproval'),
    unverifiable: n('unverifiable'),
    stale: Array.isArray(ex.stale) ? ex.stale.length : 0,
    pastExpiry: Array.isArray(ex.pastExpiry) ? ex.pastExpiry.length : 0,
    staleVerification: Array.isArray(ex.staleVerification) ? ex.staleVerification.length : 0,
    possiblyClosed: Array.isArray(ex.possiblyClosed) ? ex.possiblyClosed.length : 0,
  };
}

/**
 * Inspect approved/unapproved research records without silently counting postings
 * as vacancies or locations as geocoded addresses.
 * @param {any[]} records
 * @param {string} asOf
 */
export function researchQuality(records, asOf) {
  const items = Array.isArray(records) ? records : [];
  const published = items.filter((r) => r.review?.state === 'approved');
  const pending = items.filter((r) => r.review?.state === 'pending');
  const live = published.filter((r) => r.evidence_type !== 'employer_presence' &&
    !['historical', 'expired', 'contradicted'].includes(r.verification_status));
  const deduped = representatives(live);
  const hasLink = (r) => /^https:\/\//i.test(String(r.source_url || ''));
  const lastChecked = (r) => r.last_rechecked_at || r.captured_at;
  const reasonsFor = (r) => {
    const reasons = [];
    if (!hasLink(r)) reasons.push('Source URL missing or not HTTPS');
    if (!r.published_at) reasons.push('Publication date not stated');
    if (!isInScope(r)) reasons.push('Precise sector not established');
    if (!r.geo?.basis || r.geo.basis === 'unknown' || r.geo.basis === 'aggregator_label_only') reasons.push('Location basis needs review');
    if (r.experience?.min_months == null) reasons.push('Experience requirement not stated');
    if (!r.education?.stated) reasons.push('Education requirement not stated');
    if (!r.wage?.stated) reasons.push('Advertised pay missing');
    const age = daysBetween(lastChecked(r), asOf);
    if (age == null) reasons.push('Last checked date unknown');
    else if (age > 14) reasons.push('Not rechecked for more than 14 days');
    if (r.verification_status === 'employer_confirmed' && !isValidConfirmed(r, asOf))
      reasons.push('Employer confirmation no longer valid for the KPI');
    return reasons;
  };
  const problems = deduped.map((r) => ({
    id: r.source_id, role: r.role_title_raw || 'Untitled ad',
    employer: r.employer_identity || 'Employer not stated',
    sector: r.sector || r.geo?.claimed_sector || null,
    status: r.verification_status, sourceUrl: r.source_url || '',
    lastChecked: lastChecked(r), reasons: reasonsFor(r),
  })).filter((r) => r.reasons.length).sort((a,b)=>
    b.reasons.length - a.reasons.length || a.id.localeCompare(b.id));
  const count = (fn) => deduped.filter(fn).length;
  const metrics = [
    { key:'source',label:'Without usable HTTPS source link', count:count((r)=>!hasLink(r)) },
    { key:'date',label:'Without stated publication date',count:count((r)=>!r.published_at) },
    { key:'location',label:'Sector not established',count:count((r)=>!isInScope(r)) },
    { key:'experience',label:'Experience requirement missing',count:count((r)=>r.experience?.min_months == null) },
    { key:'education',label:'Education requirement missing',count:count((r)=>!r.education?.stated) },
    { key:'pay',label:'Advertised pay missing',count:count((r)=>!r.wage?.stated) },
    { key:'stale',label:'Not rechecked within 14 days',count:count((r)=>(daysBetween(lastChecked(r),asOf) ?? 999) > 14) },
    { key:'verified',label:'Expired employer confirmation',count:count((r)=>r.verification_status==='employer_confirmed'&&!isValidConfirmed(r,asOf)) },
  ];
  return {
    asOf, allRecords: items.length, approvedRecords: published.length, pendingRecords: pending.length,
    activeAdRecords: live.length, distinctAds: deduped.length,
    mirrorRecords: live.length - deduped.length,
    confirmedRecords: deduped.filter((r)=>isValidConfirmed(r,asOf)).length,
    confirmedOpenings: deduped.filter((r)=>isValidConfirmed(r,asOf)).reduce((s,r)=>s+r.vacancy_count_verified,0),
    metrics, issues: problems,
    // Missingness is counted among deduplicated, currently relevant *approved ads* only.
    denominator: deduped.length,
  };
}
