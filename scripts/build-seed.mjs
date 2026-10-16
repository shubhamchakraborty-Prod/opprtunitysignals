// Converts the v0 curated snapshot (data/source/signals_snapshot_2026-10-16.json)
// into the evidence model (data/seed/evidence_records.json). Curation decisions
// for each record are listed explicitly below so they can be reviewed.
// Run: npm run seed:build
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeRecord, validateRecord } from '../src/core/schema.js';
import { assignClusters } from '../src/core/dedupe.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(root, 'data/source/signals_snapshot_2026-10-16.json'), 'utf8'));

const CAPTURED = '2026-10-16';
const LISTING_PAGE = 'listing_page_changes_over_time';
const LOGIN = 'may_require_login';

/** Per-record curation. Every value here is either transcribed from the v0 snapshot or an explicit, labelled inference. */
const CURATION = {
  'SIG-001': { canonical: 'Contact centre agent (voice)', basis: 'curator_transcribed', access: [LOGIN], conf: ['medium', 'Individual LinkedIn post with an ID and named employer; 10+2 eligibility stated. Sector transcribed by curator; not employer-confirmed.'] },
  'SIG-002': { canonical: 'Chat support agent (international process)', basis: 'aggregator_label_only', access: [LISTING_PAGE], conf: ['low', 'Indeed search-results page, not an individual post. Sector comes only from the search label.'], infer: ['Prior international chat or voice process experience requested (transcribed note).'] },
  'SIG-003': { canonical: 'Business intelligence / reporting analyst', basis: 'aggregator_label_only', access: [LISTING_PAGE], shift: { raw: 'Night shift', night_shift: true }, conf: ['low', 'Apna category page; individual post not isolated. Sector from page label.'] },
  'SIG-004': { canonical: 'Contact centre agent (international voice)', basis: 'aggregator_label_only', access: [LISTING_PAGE], shift: { raw: 'Night shift', night_shift: true }, note: 'Listing indicates night shift and strong English requirements.', conf: ['low', 'Apna category page; individual post not isolated. Sector from page label.'] },
  'SIG-005': { canonical: 'Inside sales executive', basis: 'aggregator_label_only', access: [LISTING_PAGE], conf: ['low', 'Apna category page; individual post not isolated.'] },
  'SIG-006': { canonical: 'Office assistant', basis: 'aggregator_label_only', access: [LISTING_PAGE], iti: ['COPA'], conf: ['low', 'Apna category page; tasks and qualification not confirmed.'], infer: ['Office computing tasks may suit COPA pass-outs; duties unconfirmed.'] },
  'SIG-007': { canonical: 'Executive / administrative assistant', basis: 'aggregator_label_only', access: [LISTING_PAGE], iti: ['COPA'], conf: ['low', 'Apna category page; employer name does not imply an engineering role.'] },
  'SIG-008': { canonical: 'Contact centre agent (international)', basis: 'aggregator_label_only', access: [LISTING_PAGE], note: 'Strong English specified; salary is posted range only.', conf: ['low', 'Apna category page; individual post not isolated.'] },
  'SIG-009': { canonical: 'Production engineer (electrical / electronics)', basis: 'aggregator_label_only', access: [LISTING_PAGE], iti: ['Electronics Mechanic', 'Electrician'], conf: ['low', 'Apna Sector 63 category page; eligibility and openings unconfirmed.'], infer: ['Shop-floor electronics production may draw on ITI Electronics Mechanic or Electrician skills; the "Engineer" title may imply a diploma or degree.'] },
  'SIG-010': { canonical: 'Junior mechanical design engineer / draughtsperson', basis: 'aggregator_label_only', access: [LISTING_PAGE], iti: ['Draughtsman (Mechanical)'], conf: ['low', 'Apna category page; CAD software requirement unconfirmed.'] },
  'SIG-011': { canonical: 'Lathe machine operator', basis: 'aggregator_label_only', access: [LISTING_PAGE], iti: ['Turner', 'Machinist'], conf: ['low', 'Apna Sector 63 category page; minimum 2 years experience transcribed.'] },
  'SIG-012': { canonical: 'Production supervisor (mechanical)', basis: 'aggregator_label_only', access: [LISTING_PAGE], iti: ['Fitter'], conf: ['low', 'Apna category page; duties need confirmation.'], infer: ['Supervisory role; an experienced ITI Fitter might be considered, but this is not stated.'] },
  'SIG-013': { canonical: 'In-process quality inspector / engineer (electronics)', basis: 'curator_transcribed', access: [], published: '2026-09-11', iti: ['Electronics Mechanic'], conf: ['medium', 'Individual post with a job ID and publication date (11 Sep 2026); sector transcribed by curator.'] },
  'SIG-014': { canonical: 'Business development executive', basis: 'curator_transcribed', access: [LOGIN], vacancyClaimed: 5, conf: ['medium', 'Individual LinkedIn post with a named employer. The post claims 5 openings; not employer-confirmed.'] },
  'SIG-015': { canonical: 'Pay-per-click (Google Ads) executive', basis: 'stated_in_listing', access: [LOGIN], employer: null, recruiter: 'Hireniti Virtual HR Services', evidence: 'recruiter_advertisement', shift: { raw: 'Six working days', days_per_week: 6 }, conf: ['medium', 'Recruiter post naming a Sector 63 office; the hiring employer is undisclosed.'] },
  'SIG-016': { canonical: 'IT sales executive (B2B international)', basis: 'stated_in_listing', granularity: 'locality', locality: 'H Block, Sector 63', access: [LOGIN], conf: ['medium', 'Individual post naming H Block, Sector 63.'] },
  'SIG-017': { canonical: 'Sales executive (co-living)', basis: 'curator_transcribed', access: [LOGIN], flags: ['possibly_closed'], conf: ['low', 'A captured copy said "no longer accepting applications"; availability must be reconfirmed.'] },
  'SIG-018': { canonical: 'Electronics technician (SMD soldering)', basis: 'curator_transcribed', access: [LOGIN], evidence: 'historical_post', published: '2026-02-24', publishedBasis: 'derived_from_post_id', iti: ['Electronics Mechanic'], conf: ['low', 'Older social recruiting post. Occupational context only, not an active vacancy.'], infer: ['Post date about 24 Feb 2026, derived from the LinkedIn activity identifier, not read from the page.'] },
};

const records = src.map((s) => {
  const c = CURATION[s.id];
  if (!c) throw new Error('No curation for ' + s.id);
  const rec = normalizeRecord({
    source_id: s.id,
    source_url: s.url,
    platform: s.source,
    source_type: 'public_listing',
    evidence_type: c.evidence || (s.type === 'Recruiter job posting' ? 'recruiter_advertisement' : 'job_advertisement'),
    captured_at: CAPTURED,
    published_at: c.published || null,
    published_at_basis: c.publishedBasis || (c.published ? 'stated' : null),
    last_rechecked_at: s.checked,
    employer_identity: 'employer' in c ? c.employer : s.employer,
    recruiter_identity: c.recruiter || null,
    sector: s.sector,
    geo: { granularity: c.granularity || 'sector', basis: c.basis, scope_status: 'in_scope', claimed_sector: s.sector, locality_text: c.locality || null, lat: null, lon: null, geocode_verified: false, note: null },
    role_title_raw: s.role,
    canonical_occupation: c.canonical,
    occupation_family: s.family,
    iti_trade_relevance: c.iti || [],
    source_text_excerpt: null,
    curator_note: c.note || s.notes,
    education: s.qualification,
    experience: s.experience,
    experience_level: s.level,
    skills: s.skills.map((name) => ({ name, basis: 'curated' })),
    shift: c.shift || { raw: null },
    wage: s.salary,
    contract_type: 'not_stated',
    vacancy_claimed: c.vacancyClaimed ?? null,
    accessibility_restrictions: c.access,
    confidence: { level: c.conf[0], rationale: c.conf[1] },
    review: { state: 'approved', by: 'prototype-v0-curator', at: '2026-10-16T00:00:00Z', note: 'Curated in the v0 public-data snapshot; approved for display as observed public evidence only.' },
    open_flags: c.flags || [],
    inferences: (c.infer || []).map((text) => ({ text, basis: 'curator' })),
  });
  const errs = validateRecord(rec);
  if (errs.length) throw new Error(`${s.id}: ${errs.join('; ')}`);
  return rec;
});

// Second capture: search-engine results from other job portals (pages not opened).
const capture = JSON.parse(readFileSync(join(root, 'data/source/capture_2026-10-16_search.json'), 'utf8'));
for (const c of capture.records) {
  const rec = normalizeRecord({
    ...c,
    source_type: 'public_listing',
    evidence_type: 'job_advertisement',
    captured_at: capture.capture.date,
    last_rechecked_at: capture.capture.date,
    geo: { granularity: 'sector', basis: 'curator_transcribed', scope_status: 'in_scope', claimed_sector: c.sector, locality_text: null, lat: null, lon: null, geocode_verified: false, note: null, ...c.geo },
    skills: c.skills.map((name) => ({ name, basis: 'curated' })),
    shift: c.shift || { raw: null },
    contract_type: c.contract_type || 'not_stated',
    accessibility_restrictions: ['seen_in_search_results_only'],
    confidence: { level: 'low', rationale: 'Seen only in search-engine results on 16 Oct 2026; the listing page was not opened. Recheck the page before use.' },
    review: { state: 'approved', by: 'research-capture-2026-10-16', at: '2026-10-16T00:00:00Z', note: 'Captured from search results for display as observed public evidence; flagged for the team to open and recheck.' },
    open_flags: ['other'],
    inferences: c.inferences || [],
  });
  const errs = validateRecord(rec);
  if (errs.length) throw new Error(`${c.source_id}: ${errs.join('; ')}`);
  records.push(rec);
}

const clustered = assignClusters(records);
writeFileSync(join(root, 'data/seed/evidence_records.json'), JSON.stringify(clustered, null, 2) + '\n');

const flags = [
  { id: 'FLG-SEED-017', source_id: 'SIG-017', type: 'possibly_closed', note: 'One captured listing indicated "no longer accepting applications". Recheck before outreach.', status: 'open', raised_by: 'prototype-v0-curator', raised_at: '2026-10-16T00:00:00Z' },
  ...capture.records.map((c) => ({ id: 'FLG-CAP-' + c.source_id.slice(4), source_id: c.source_id, type: 'other', note: 'Captured from search-engine results only. Open the listing page, confirm the details and the location, then resolve this flag.', status: 'open', raised_by: 'research-capture-2026-10-16', raised_at: '2026-10-16T00:00:00Z' })),
];
writeFileSync(join(root, 'data/seed/source_flags.json'), JSON.stringify(flags, null, 2) + '\n');
console.log(`Wrote ${clustered.length} records and ${flags.length} flag(s).`);
