// @ts-check
// Industry-facing research helpers. These results never measure live talent supply.
import { talentPools, talentForRole, payBenchmark } from './talent.js';
import { isValidConfirmed } from './analytics.js';

export const PARTNER_STAGES = Object.freeze([
  ['saved', 'Saved to plan'],
  ['review', 'Reviewing institute'],
  ['contact_planned', 'Contact planned'],
  ['contacted', 'Contact recorded locally'],
  ['closed', 'Closed in my plan'],
]);
export const PARTNER_PURPOSES = Object.freeze([
  ['visit', 'Institute visit'],
  ['curriculum', 'Curriculum and skill discussion'],
  ['apprenticeship', 'Explore apprenticeships'],
  ['placement', 'Discuss recruiting routes'],
  ['training', 'Explore pre-joining training'],
]);
const AREAS = new Set(['noida_ncr', 'kalyani', 'siliguri']);

export function supplyOverview(institutes, area) {
  const local = institutes.filter((i) => i.area === area);
  const count = (type) => local.filter((i) => type === 'college' ? i.type === 'college' || i.type === 'university' : i.type === type).length;
  return {
    area, institutes: local, total: local.length,
    byType: { iti: count('iti'), polytechnic: count('polytechnic'), college: count('college') },
    pools: talentPools(institutes, area).map((p) => ({
      id: p.id, label: p.label, institutes: p.institutes, count: p.institutes.length,
    })),
    estimatedLearners: null,
    passoutCapacity: null,
    method: 'Listed institutions and course descriptions only, not learner headcounts or verified recruitment capacity.',
  };
}

/** Advertisements from Noida cannot be treated as a comparable local sample in West Bengal. */
export function roleEvidenceSummary(role, ads, area, asOf) {
  if (area !== 'noida_ncr') return {
    area, status: 'region_unavailable', records: [], count: 0, confirmedOpenings: null,
    pay: null, reason: 'Comparable role-specific job-ad evidence for this region is not available.',
  };
  const records = ads.filter((r) => role.families.includes(r.occupation_family));
  return {
    area, status: records.length ? 'pilot_sample' : 'no_sample', records, count: records.length,
    confirmedOpenings: records.filter((r) => isValidConfirmed(r, asOf)).reduce((n, r) => n + r.vacancy_count_verified, 0),
    pay: payBenchmark(role, records),
    reason: 'Noida pilot job-ad sample only. Counts are advertisements, not open positions or the whole labour market.',
  };
}

/** Approximate institution associations from course catalogues; not a list of ready-to-hire candidates. */
export function roleInstitutionOptions(role, data) {
  return talentForRole(role, { ...data, ads: data.area === 'noida_ncr' ? data.ads : [] }).institutes
    .map((i) => ({ id: i.name, name: i.name, type: i.type, town: i.town, url: i.url || '' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Validate a local-only planning record. Reject uncontrolled statuses and IDs. */
export function partnershipDraft(raw, roles, institutes) {
  const role = roles.find((r) => r.id === raw.role);
  const institute = institutes.find((i) => i.name === raw.institute);
  const purpose = PARTNER_PURPOSES.find(([key]) => key === raw.purpose);
  const n = Number(raw.n);
  const month = String(raw.when || '');
  if (!role || !institute || !AREAS.has(institute.area) || !purpose || !Number.isInteger(n) || n < 1 || n > 500
      || !/^20\d\d-(0[1-9]|1[0-2])$/.test(month)) return null;
  return {
    role: role.id, institute: institute.name, area: institute.area,
    n, when: month, purpose: purpose[0], stage: 'saved',
  };
}

export function validPartnerStage(stage) {
  return PARTNER_STAGES.some(([key]) => key === stage);
}
