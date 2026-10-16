// @ts-check
// Which records are visible under a given set of filters. Shared by the
// browser, the API and the tests so every counter uses the same rules.
import { OPPORTUNITY_EVIDENCE_TYPES } from './constants.js';
import { toDate } from './util.js';

/** @typedef {{sector:'all'|'62'|'63',query:string,family:string,career:string,includeHistorical:boolean,includeUnclear:boolean,verification:string,from:string|null,to:string|null}} Filters */

/** @returns {Filters} */
export function defaultFilters() {
  return { sector: 'all', query: '', family: 'all', career: 'all', includeHistorical: false, includeUnclear: false, verification: 'all', from: null, to: null };
}

/** @param {any} f @returns {Filters} */
export function coerceFilters(f = {}) {
  const d = defaultFilters();
  const b = (v) => v === true || v === 'true' || v === '1';
  return {
    sector: f.sector === '62' || f.sector === '63' ? f.sector : 'all',
    query: typeof f.query === 'string' ? f.query.slice(0, 120) : d.query,
    family: typeof f.family === 'string' && f.family ? f.family : d.family,
    career: typeof f.career === 'string' && f.career ? f.career : d.career,
    includeHistorical: b(f.includeHistorical),
    includeUnclear: b(f.includeUnclear),
    verification: typeof f.verification === 'string' && f.verification ? f.verification : d.verification,
    from: toDate(f.from) ? f.from : null,
    to: toDate(f.to) ? f.to : null,
  };
}

export const isOlder = (r) => r.verification_status === 'historical' || r.verification_status === 'expired';
export const isInScope = (r) => r.geo?.scope_status === 'in_scope' && !!r.sector;
export const isOpportunityEvidence = (r) => OPPORTUNITY_EVIDENCE_TYPES.includes(r.evidence_type);
export const isPublished = (r) => r.review?.state === 'approved';

/** Sector a record is displayed under (claimed sector for unclear locations). */
export const displaySector = (r) => r.sector || r.geo?.claimed_sector || null;

/**
 * Opportunity records visible to the public views. Employer-presence records,
 * unreviewed uploads and rejected records are never included.
 * @param {any[]} records
 * @param {Filters} f
 */
export function filterOpportunities(records, f) {
  const q = (f.query || '').toLowerCase();
  return records.filter((r) => {
    if (!isPublished(r) || !isOpportunityEvidence(r)) return false;
    if (isOlder(r) && !f.includeHistorical) return false;
    const inScope = isInScope(r);
    if (!inScope && !f.includeUnclear) return false;
    if (f.sector !== 'all' && displaySector(r) !== f.sector) return false;
    if (f.family !== 'all' && r.occupation_family !== f.family) return false;
    if (f.career !== 'all' && r.experience_level !== f.career && r.experience_level !== 'Mixed') return false;
    if (f.verification !== 'all' && r.verification_status !== f.verification) return false;
    if (f.from && r.captured_at < f.from) return false;
    if (f.to && r.captured_at > f.to) return false;
    if (q) {
      const hay = [r.role_title_raw, r.canonical_occupation, r.employer_identity, r.recruiter_identity, r.occupation_family, r.skills.map((s) => s.name).join(' ')].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Employer-presence records (shown only on their own map layer, never as vacancies).
 * @param {any[]} records
 * @param {Filters} f
 */
export function filterPresence(records, f) {
  return records.filter((r) => isPublished(r) && r.evidence_type === 'employer_presence' && (f.sector === 'all' || displaySector(r) === f.sector));
}
