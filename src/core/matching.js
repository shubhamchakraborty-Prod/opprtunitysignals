// @ts-check
// Explainable learner-to-opportunity matching. Hard gates (qualification,
// certification, experience, location, language) are evaluated separately from
// skill overlap. Skill overlap is never presented as hiring eligibility.
import { extractEmploymentTerms } from './terms.js';
import { isInScope } from './filters.js';

/** @typedef {'pass'|'fail'|'unknown'|'not_stated'} GateStatus */
/** @typedef {{gate:string,status:GateStatus,fact:string,inference:string|null}} GateResult */

const EDU_LABEL = {
  '10th': 'Class 10', '12th': 'Class 12', iti_any: 'Any ITI trade', iti_electronics_mechanic: 'ITI Electronics Mechanic', iti_fitter: 'ITI Fitter',
  iti_machinist: 'ITI Machinist', iti_turner: 'ITI Turner', iti_copa: 'ITI COPA', iti_electrician: 'ITI Electrician', diploma: 'Diploma', degree: 'Degree', engineering_degree: 'Engineering degree',
};
export const eduLabel = (t) => EDU_LABEL[t] || t;

function months(m) {
  if (m == null) return 'not stated';
  if (m === 0) return 'fresher';
  return m % 12 === 0 ? `${m / 12} year${m === 12 ? '' : 's'}` : `${m} months`;
}

/** @returns {GateResult} */
function qualificationGate(profile, r) {
  const acc = r.education.accepted || [];
  if (!r.education.stated || !acc.length) {
    const eng = /engineer/i.test(r.role_title_raw);
    return {
      gate: 'Qualification', status: 'unknown', fact: 'Education requirement not stated in the advert.',
      inference: eng ? 'Title contains "Engineer"; employers often expect a diploma or degree. Ask the employer before referring an ITI learner.' : 'Ask the employer which qualification they accept.',
    };
  }
  const has = profile.qualifications || [];
  const direct = acc.some((t) => has.includes(t));
  const anyIti = acc.includes('iti_any') && has.some((t) => t.startsWith('iti_'));
  if (direct || anyIti) return { gate: 'Qualification', status: 'pass', fact: `Advert accepts: ${acc.map(eduLabel).join(', ')}. Profile holds: ${has.map(eduLabel).join(', ')}.`, inference: null };
  if (acc.includes('12th') && has.includes('10th') && has.some((t) => t.startsWith('iti_'))) {
    return { gate: 'Qualification', status: 'unknown', fact: `Advert asks for ${acc.map(eduLabel).join(', ')}. Profile holds Class 10 + ITI.`, inference: 'Whether this employer treats Class 10 + ITI as equivalent to Class 12 must be confirmed.' };
  }
  return { gate: 'Qualification', status: 'fail', fact: `Advert asks for ${acc.map(eduLabel).join(', ')}. Profile holds ${has.map(eduLabel).join(', ') || 'none recorded'}.`, inference: null };
}

/** @returns {GateResult} */
function certificationGate(profile, r) {
  const req = r.certifications_required || [];
  if (!req.length) return { gate: 'Certification', status: 'not_stated', fact: 'No certificate or licence named in the advert.', inference: null };
  const has = profile.certifications || [];
  const missing = req.filter((c) => !has.includes(c));
  return missing.length
    ? { gate: 'Certification', status: 'fail', fact: `Requires ${req.join(', ')}; profile lacks ${missing.join(', ')}.`, inference: null }
    : { gate: 'Certification', status: 'pass', fact: `Requires ${req.join(', ')}; profile holds it.`, inference: null };
}

/** @returns {GateResult} */
function experienceGate(profile, r) {
  const need = r.experience.min_months;
  if (need == null) return { gate: 'Experience', status: 'unknown', fact: 'Experience requirement not stated.', inference: null };
  const have = profile.experience_months ?? 0;
  return have >= need
    ? { gate: 'Experience', status: 'pass', fact: `Needs ${months(need)}; profile has ${months(have)}.`, inference: null }
    : { gate: 'Experience', status: 'fail', fact: `Needs ${months(need)}; profile has ${months(have)}. Gap: ${months(need - have)}.`, inference: null };
}

/** @returns {GateResult} */
function locationGate(profile, r) {
  if (!isInScope(r)) return { gate: 'Location / relocation', status: 'unknown', fact: 'Work location is unclear or outside Sectors 62/63.', inference: null };
  const local = (profile.home_catchment || '') === 'Gautam Buddh Nagar';
  if (local) return { gate: 'Location / relocation', status: 'pass', fact: `Work in Noida Sector ${r.sector}; profile lives in the Gautam Buddh Nagar catchment.`, inference: 'Daily commute time and cost still need checking.' };
  if (profile.willing_to_relocate) return { gate: 'Location / relocation', status: 'pass', fact: 'Profile is willing to relocate to Noida.', inference: 'Housing cost against advertised pay should be checked.' };
  return { gate: 'Location / relocation', status: 'fail', fact: 'Profile lives outside the catchment and is not willing to relocate.', inference: null };
}

/** @returns {GateResult|null} */
function languageGate(profile, r) {
  const strong = extractEmploymentTerms(r).some((t) => t.key === 'strong_english');
  if (!strong) return null;
  const lvl = profile.english || 'unknown';
  if (lvl === 'strong') return { gate: 'Language', status: 'pass', fact: 'Advert asks for strong English; profile lists strong English.', inference: null };
  if (lvl === 'unknown') return { gate: 'Language', status: 'unknown', fact: 'Advert asks for strong English; profile English level not assessed.', inference: 'Assess spoken English before referral.' };
  return { gate: 'Language', status: 'fail', fact: `Advert asks for strong English; profile lists ${lvl} English.`, inference: null };
}

/**
 * Evaluate one profile against one record.
 * @param {any} profile
 * @param {any} r
 */
export function matchRecord(profile, r) {
  const gates = [qualificationGate(profile, r), certificationGate(profile, r), experienceGate(profile, r), locationGate(profile, r), languageGate(profile, r)].filter(Boolean);
  const required = r.skills.map((s) => s.name);
  const have = new Set((profile.skills || []).map((s) => s.toLowerCase()));
  const matched = required.filter((s) => have.has(s.toLowerCase()));
  const missing = required.filter((s) => !have.has(s.toLowerCase()));
  const ratio = required.length ? matched.length / required.length : 0;
  const anyFail = gates.some((g) => g.status === 'fail');
  const anyUnknown = gates.some((g) => g.status === 'unknown');
  const verdict = anyFail ? 'gate_not_met' : anyUnknown ? 'gates_unresolved' : 'gates_met';
  const conditions = extractEmploymentTerms(r).filter((t) => t.key !== 'strong_english').map((t) => t.label);
  return {
    source_id: r.source_id,
    verdict,
    verdictLabel: { gate_not_met: 'Hard gate not met', gates_unresolved: 'Gates unresolved - confirm with employer', gates_met: 'Stated gates met' }[verdict],
    overlap: { matched, missing, ratio, label: ratio >= 0.65 ? 'Strong skill overlap' : ratio >= 0.34 ? 'Partial skill overlap' : 'Low skill overlap' },
    gates: /** @type {GateResult[]} */ (gates),
    gaps: gates.filter((g) => g.status === 'fail').map((g) => g.fact),
    conditions,
    disclaimer: 'Skill overlap is not hiring eligibility. The employer decides; gates marked unresolved must be confirmed.',
  };
}

/**
 * Rank current, in-scope opportunities for a profile.
 * @param {any} profile
 * @param {any[]} records already filtered and deduplicated
 */
export function rankMatches(profile, records, limit = 12) {
  const rank = { gates_met: 0, gates_unresolved: 1, gate_not_met: 2 };
  return records
    .map((r) => ({ r, m: matchRecord(profile, r) }))
    .sort((a, b) => rank[a.m.verdict] - rank[b.m.verdict] || b.m.overlap.ratio - a.m.overlap.ratio || b.m.overlap.matched.length - a.m.overlap.matched.length || a.r.source_id.localeCompare(b.r.source_id))
    .slice(0, limit);
}
