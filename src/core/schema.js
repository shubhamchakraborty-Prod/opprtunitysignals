// @ts-check
// Evidence record schema: normalisation, validation and the public redaction
// applied before any record leaves the trust boundary.
import {
  SOURCE_TYPES, VERIFICATION_STATUSES, EVIDENCE_TYPES, LOCATION_PRECISION, GEO_BASIS, GEO_SCOPE,
  DUPLICATE_STATUS, REVIEW_STATES, PILOT_SECTORS, OCCUPATION_FAMILIES, CONTRACT_TYPES, EXPERIENCE_LEVELS,
} from './constants.js';
import { parseWage, parseExperience, parseEducation, originalPostIdFromUrl, urlKind, sectorFromText } from './parse.js';
import { isHttpUrl, toDate } from './util.js';

/**
 * @typedef {Object} EvidenceRecord
 * @property {string} source_id
 * @property {string} title
 * @property {string} source_url
 * @property {string} source_url_kind
 * @property {string|null} original_post_id
 * @property {string} platform
 * @property {string} source_type
 * @property {string} evidence_type
 * @property {string} captured_at
 * @property {string|null} published_at
 * @property {'stated'|'derived_from_post_id'|null} published_at_basis
 * @property {string|null} last_rechecked_at
 * @property {string|null} employer_identity
 * @property {string|null} recruiter_identity
 * @property {string|null} sector
 * @property {{granularity:string,basis:string,scope_status:string,claimed_sector:string|null,locality_text:string|null,lat:number|null,lon:number|null,geocode_verified:boolean,note:string|null}} geo
 * @property {string} role_title_raw
 * @property {string} canonical_occupation
 * @property {string} occupation_family
 * @property {string[]} iti_trade_relevance
 * @property {string|null} source_text_excerpt
 * @property {string|null} curator_note
 * @property {{raw:string,accepted:string[],stated:boolean}} education
 * @property {{raw:string,min_months:number|null,max_months:number|null,fresher_ok:boolean|null}} experience
 * @property {string} experience_level
 * @property {{name:string,basis:string}[]} skills
 * @property {string[]} certifications_required
 * @property {{raw:string|null,night_shift:boolean|null,days_per_week:number|null}} shift
 * @property {{raw:string|null,transport_provided:boolean|null}} commute
 * @property {{min:number|null,max:number|null,period:string|null,currency:string,incentives:boolean,stated:boolean,raw:string}} wage
 * @property {string} contract_type
 * @property {number|null} vacancy_claimed
 * @property {string} verification_status
 * @property {string|null} verification_contact  restricted: never in public views
 * @property {string|null} verified_at
 * @property {number|null} vacancy_count_verified
 * @property {string|null} start_date
 * @property {string|null} verification_id
 * @property {{role_title:string,trade:string,openings:number,entry_wage_min:number|null,entry_wage_max:number|null,wage_period:string|null,start_date:string|null,prescreen:string|null}[]} verified_roles
 * @property {string} dedupe_cluster
 * @property {string} duplicate_status
 * @property {string|null} expiry
 * @property {string[]} accessibility_restrictions
 * @property {{level:string,rationale:string}} confidence
 * @property {{state:string,by:string|null,at:string|null,note:string|null}} review
 * @property {string[]} open_flags
 * @property {{text:string,basis:string}[]} inferences
 * @property {boolean} fixture  true for synthetic test fixtures; never real evidence
 */

const req = (v) => v !== undefined && v !== null && String(v).trim() !== '';

/**
 * Fill defaults and derive structured fields from raw text where the
 * structured value is absent. Pure; returns a new object.
 * @param {any} input
 * @returns {EvidenceRecord}
 */
export function normalizeRecord(input) {
  const r = { ...input };
  const geo = { granularity: 'unknown', basis: 'aggregator_label_only', scope_status: 'in_scope', claimed_sector: null, locality_text: null, lat: null, lon: null, geocode_verified: false, note: null, ...(r.geo || {}) };
  // A locality text naming a different sector overrides an aggregator label.
  const named = sectorFromText(geo.locality_text);
  const claimed = geo.claimed_sector ?? r.sector ?? null;
  geo.claimed_sector = claimed;
  if (named && claimed && named !== claimed && geo.basis === 'aggregator_label_only') {
    geo.scope_status = PILOT_SECTORS.includes(/** @type {any} */ (named)) ? 'in_scope' : 'adjacent_or_unclear';
    geo.claimed_sector = claimed;
    r.sector = PILOT_SECTORS.includes(/** @type {any} */ (named)) ? named : null;
  }
  if (geo.scope_status !== 'in_scope') r.sector = null;
  const wage = r.wage && typeof r.wage === 'object' ? { ...parseWage(r.wage.raw), ...r.wage } : parseWage(r.wage_raw ?? r.wage);
  const experience = r.experience && typeof r.experience === 'object' ? { ...parseExperience(r.experience.raw), ...r.experience } : parseExperience(r.experience);
  const education = r.education && typeof r.education === 'object' ? { ...parseEducation(r.education.raw), ...r.education } : parseEducation(r.education);
  const skills = (r.skills || []).map((s) => (typeof s === 'string' ? { name: s, basis: 'curated' } : s));
  return {
    source_id: r.source_id,
    title: r.title || [r.role_title_raw, r.employer_identity || r.recruiter_identity].filter(Boolean).join(' - '),
    source_url: r.source_url,
    source_url_kind: r.source_url_kind || urlKind(r.source_url),
    original_post_id: r.original_post_id ?? originalPostIdFromUrl(r.source_url),
    platform: r.platform || 'Unknown',
    source_type: r.source_type || 'public_listing',
    evidence_type: r.evidence_type || 'job_advertisement',
    captured_at: r.captured_at,
    published_at: r.published_at ?? null,
    published_at_basis: r.published_at ? (r.published_at_basis || 'stated') : null,
    last_rechecked_at: r.last_rechecked_at ?? r.captured_at ?? null,
    employer_identity: r.employer_identity ?? null,
    recruiter_identity: r.recruiter_identity ?? null,
    sector: r.sector ?? null,
    geo,
    role_title_raw: r.role_title_raw,
    canonical_occupation: r.canonical_occupation || r.role_title_raw,
    occupation_family: r.occupation_family || 'Unclassified',
    iti_trade_relevance: r.iti_trade_relevance || [],
    source_text_excerpt: r.source_text_excerpt ?? null,
    curator_note: r.curator_note ?? null,
    education,
    experience,
    experience_level: r.experience_level || 'Mixed',
    skills,
    certifications_required: r.certifications_required || [],
    shift: { raw: null, night_shift: null, days_per_week: null, ...(r.shift || {}) },
    commute: { raw: null, transport_provided: null, ...(r.commute || {}) },
    wage,
    contract_type: r.contract_type || 'not_stated',
    vacancy_claimed: r.vacancy_claimed ?? null,
    verification_status: r.verification_status || (r.evidence_type === 'historical_post' ? 'historical' : 'observed_public'),
    verification_contact: r.verification_contact ?? null,
    verified_at: r.verified_at ?? null,
    vacancy_count_verified: r.vacancy_count_verified ?? null,
    start_date: r.start_date ?? null,
    verification_id: r.verification_id ?? null,
    verified_roles: r.verified_roles || [],
    dedupe_cluster: r.dedupe_cluster || '',
    duplicate_status: r.duplicate_status || 'unique',
    expiry: r.expiry ?? null,
    accessibility_restrictions: r.accessibility_restrictions || [],
    confidence: r.confidence || { level: 'low', rationale: 'Not yet assessed by a reviewer.' },
    review: { state: 'pending_review', by: null, at: null, note: null, ...(r.review || {}) },
    open_flags: r.open_flags || [],
    inferences: r.inferences || [],
    fixture: !!r.fixture,
  };
}

/**
 * Validate a normalised record. Returns a list of human-readable errors.
 * @param {EvidenceRecord} r
 * @returns {string[]}
 */
export function validateRecord(r) {
  const e = [];
  if (!req(r.source_id)) e.push('source_id is required');
  if (!req(r.role_title_raw)) e.push('role_title_raw is required');
  if (!isHttpUrl(r.source_url)) e.push('source_url must be an http(s) URL so the source can always be opened');
  if (!toDate(r.captured_at)) e.push('captured_at must be a date (YYYY-MM-DD)');
  if (r.published_at && !toDate(r.published_at)) e.push('published_at is not a valid date');
  if (!SOURCE_TYPES.includes(/** @type {any} */ (r.source_type))) e.push(`source_type must be one of ${SOURCE_TYPES.join(', ')}`);
  if (!EVIDENCE_TYPES.includes(/** @type {any} */ (r.evidence_type))) e.push(`evidence_type must be one of ${EVIDENCE_TYPES.join(', ')}`);
  if (!VERIFICATION_STATUSES.includes(/** @type {any} */ (r.verification_status))) e.push(`verification_status must be one of ${VERIFICATION_STATUSES.join(', ')}`);
  if (!LOCATION_PRECISION.includes(/** @type {any} */ (r.geo.granularity))) e.push(`geo.granularity must be one of ${LOCATION_PRECISION.join(', ')}`);
  if (!GEO_BASIS.includes(/** @type {any} */ (r.geo.basis))) e.push(`geo.basis must be one of ${GEO_BASIS.join(', ')}`);
  if (!GEO_SCOPE.includes(/** @type {any} */ (r.geo.scope_status))) e.push(`geo.scope_status must be one of ${GEO_SCOPE.join(', ')}`);
  if (r.sector && !PILOT_SECTORS.includes(/** @type {any} */ (r.sector))) e.push('sector must be 62 or 63 for this pilot (or empty when out of scope)');
  if (!DUPLICATE_STATUS.includes(/** @type {any} */ (r.duplicate_status))) e.push('duplicate_status invalid');
  if (!REVIEW_STATES.includes(/** @type {any} */ (r.review.state))) e.push('review.state invalid');
  if (!CONTRACT_TYPES.includes(/** @type {any} */ (r.contract_type))) e.push(`contract_type must be one of ${CONTRACT_TYPES.join(', ')}`);
  if (r.occupation_family !== 'Unclassified' && !OCCUPATION_FAMILIES.includes(r.occupation_family)) e.push(`occupation_family must be one of ${OCCUPATION_FAMILIES.join(', ')}`);
  if (!EXPERIENCE_LEVELS.includes(r.experience_level)) e.push(`experience_level must be one of ${EXPERIENCE_LEVELS.join(', ')}`);
  if (r.vacancy_claimed != null && !(Number.isInteger(r.vacancy_claimed) && r.vacancy_claimed >= 0)) e.push('vacancy_claimed must be a whole number');
  // Hard integrity rules from the evidence model.
  if (r.verification_status === 'employer_confirmed') {
    if (!r.verified_at) e.push('employer_confirmed requires verified_at');
    if (!r.verification_id) e.push('employer_confirmed requires a linked verification record');
  }
  if (r.vacancy_count_verified != null && r.verification_status !== 'employer_confirmed') e.push('vacancy_count_verified may only be set on employer_confirmed records');
  if (r.evidence_type === 'employer_presence' && (r.vacancy_claimed || r.vacancy_count_verified)) e.push('an employer_presence record cannot carry a vacancy count');
  if (r.source_text_excerpt && r.source_text_excerpt.length > 300) e.push('source_text_excerpt must be 300 characters or fewer (short quotation only)');
  if (r.geo.lat != null && (r.geo.lat < 28.4 || r.geo.lat > 28.8 || r.geo.lon == null || r.geo.lon < 77.2 || r.geo.lon > 77.6)) e.push('geo coordinates fall outside the Noida pilot bounding box');
  return e;
}

/** Fields that identify a person and must not be exposed to observers. */
export const RESTRICTED_FIELDS = ['verification_contact'];

/**
 * Remove restricted personal data for callers without contact access.
 * @param {EvidenceRecord} r
 * @param {boolean} canSeeContacts
 */
export function redactRecord(r, canSeeContacts) {
  if (canSeeContacts) return r;
  const out = { ...r };
  for (const f of RESTRICTED_FIELDS) if (out[f]) out[f] = '[restricted]';
  return out;
}

/** Columns of the CSV upload template and source-register export, in order. */
export const REGISTER_COLUMNS = [
  'source_id', 'title', 'source_url', 'source_url_kind', 'original_post_id', 'platform', 'source_type', 'evidence_type',
  'captured_at', 'published_at', 'last_rechecked_at', 'employer_identity', 'recruiter_identity', 'sector',
  'geo_granularity', 'geo_basis', 'geo_scope_status', 'geo_claimed_sector', 'geo_locality_text', 'role_title_raw', 'canonical_occupation',
  'occupation_family', 'source_text_excerpt', 'curator_note', 'education', 'experience', 'experience_level', 'skills', 'shift', 'night_shift', 'days_per_week',
  'commute', 'wage_raw', 'wage_min', 'wage_max', 'wage_period', 'contract_type', 'vacancy_claimed', 'evidence_strength',
  'verification_status', 'verification_contact', 'verified_at', 'vacancy_count_verified', 'start_date', 'dedupe_cluster',
  'duplicate_status', 'expiry', 'accessibility_restrictions', 'confidence_level', 'confidence_rationale', 'review_state', 'open_flags',
];

/**
 * Flatten a record into register columns.
 * @param {EvidenceRecord} r
 */
export function toRegisterRow(r) {
  return {
    source_id: r.source_id, title: r.title, source_url: r.source_url, source_url_kind: r.source_url_kind,
    original_post_id: r.original_post_id ?? '', platform: r.platform, source_type: r.source_type, evidence_type: r.evidence_type,
    captured_at: r.captured_at, published_at: r.published_at ?? '', last_rechecked_at: r.last_rechecked_at ?? '',
    employer_identity: r.employer_identity ?? '', recruiter_identity: r.recruiter_identity ?? '', sector: r.sector ?? '',
    geo_granularity: r.geo.granularity, geo_basis: r.geo.basis, geo_scope_status: r.geo.scope_status, geo_claimed_sector: r.geo.claimed_sector ?? '', geo_locality_text: r.geo.locality_text ?? '',
    role_title_raw: r.role_title_raw, canonical_occupation: r.canonical_occupation, occupation_family: r.occupation_family,
    source_text_excerpt: r.source_text_excerpt ?? '', curator_note: r.curator_note ?? '', education: r.education.raw, experience: r.experience.raw,
    experience_level: r.experience_level, skills: r.skills.map((s) => s.name).join('; '), shift: r.shift.raw ?? '',
    night_shift: r.shift.night_shift == null ? '' : String(r.shift.night_shift), days_per_week: r.shift.days_per_week ?? '',
    commute: r.commute.raw ?? '', wage_raw: r.wage.raw, wage_min: r.wage.min ?? '', wage_max: r.wage.max ?? '', wage_period: r.wage.period ?? '',
    contract_type: r.contract_type, vacancy_claimed: r.vacancy_claimed ?? '', evidence_strength: evidenceStrength(r),
    verification_status: r.verification_status, verification_contact: r.verification_contact ?? '', verified_at: r.verified_at ?? '',
    vacancy_count_verified: r.vacancy_count_verified ?? '', start_date: r.start_date ?? '', dedupe_cluster: r.dedupe_cluster,
    duplicate_status: r.duplicate_status, expiry: r.expiry ?? '', accessibility_restrictions: r.accessibility_restrictions.join('; '),
    confidence_level: r.confidence.level, confidence_rationale: r.confidence.rationale, review_state: r.review.state, open_flags: r.open_flags.join('; '),
  };
}

/**
 * Build a record from an uploaded CSV row (template columns).
 * @param {Record<string,string>} row
 */
export function fromRegisterRow(row) {
  const blank = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
  const num = (v) => (blank(v) == null ? null : Number(v));
  const bool = (v) => (blank(v) == null ? null : /^(true|yes|1)$/i.test(String(v).trim()));
  const list = (v) => (blank(v) == null ? [] : String(v).split(/;\s*/).map((s) => s.trim()).filter(Boolean));
  const wage = parseWage(row.wage_raw);
  if (blank(row.wage_min) != null) wage.min = num(row.wage_min);
  if (blank(row.wage_max) != null) wage.max = num(row.wage_max);
  if (blank(row.wage_period) != null) wage.period = blank(row.wage_period);
  wage.stated = wage.min != null || wage.max != null;
  return normalizeRecord({
    source_id: blank(row.source_id), title: blank(row.title), source_url: blank(row.source_url), original_post_id: blank(row.original_post_id),
    platform: blank(row.platform), source_type: blank(row.source_type) || 'public_listing', evidence_type: blank(row.evidence_type) || 'job_advertisement',
    captured_at: blank(row.captured_at), published_at: blank(row.published_at), last_rechecked_at: blank(row.last_rechecked_at),
    employer_identity: blank(row.employer_identity), recruiter_identity: blank(row.recruiter_identity), sector: blank(row.sector),
    geo: {
      granularity: blank(row.geo_granularity) || 'sector', basis: blank(row.geo_basis) || 'aggregator_label_only',
      scope_status: blank(row.geo_scope_status) || 'in_scope', claimed_sector: blank(row.geo_claimed_sector) || blank(row.sector), locality_text: blank(row.geo_locality_text),
      lat: null, lon: null, geocode_verified: false, note: null,
    },
    role_title_raw: blank(row.role_title_raw), canonical_occupation: blank(row.canonical_occupation), occupation_family: blank(row.occupation_family),
    source_text_excerpt: blank(row.source_text_excerpt), curator_note: blank(row.curator_note), education: blank(row.education), experience: blank(row.experience),
    experience_level: blank(row.experience_level) || 'Mixed', skills: list(row.skills),
    shift: { raw: blank(row.shift), night_shift: bool(row.night_shift), days_per_week: num(row.days_per_week) },
    commute: { raw: blank(row.commute), transport_provided: null }, wage, contract_type: blank(row.contract_type) || 'not_stated',
    vacancy_claimed: num(row.vacancy_claimed), verification_status: blank(row.evidence_type) === 'historical_post' ? 'historical' : 'observed_public',
    expiry: blank(row.expiry), accessibility_restrictions: list(row.accessibility_restrictions),
    confidence: { level: blank(row.confidence_level) || 'low', rationale: blank(row.confidence_rationale) || 'Uploaded via CSV; awaiting reviewer assessment.' },
    review: { state: 'pending_review', by: null, at: null, note: null },
  });
}

/**
 * One-line statement of how strong the evidence is. Used in UI and exports.
 * @param {EvidenceRecord} r
 */
export function evidenceStrength(r) {
  if (r.evidence_type === 'employer_presence') return 'Employer presence only - not a vacancy';
  if (r.verification_status === 'employer_confirmed') return 'Employer-confirmed opening';
  if (r.verification_status === 'historical') return 'Historical post - occupational context only';
  if (r.verification_status === 'expired') return 'Expired signal';
  if (r.verification_status === 'contradicted') return 'Contradicted by employer';
  if (r.geo.scope_status !== 'in_scope') return 'Location outside or unclear - not counted';
  if (r.source_url_kind === 'job_post') return 'Public advert (individual post)';
  return 'Public advert seen on a portal listing page';
}
