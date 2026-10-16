// @ts-check
// Separates SOURCE FACT, INFERENCE and RECOMMENDATION for every record, and
// sorts findings into "ready for ITI planning" versus "justifies outreach".
import { TECHNICAL_FAMILIES, VERIFICATION_VALID_DAYS, STALE_AFTER_DAYS } from './constants.js';
import { isValidConfirmed } from './analytics.js';
import { isInScope } from './filters.js';
import { extractEmploymentTerms } from './terms.js';
import { evidenceStrength } from './schema.js';
import { daysBetween, fmtDate, fmtINR } from './util.js';

export const TIERS = {
  planning_ready: { label: 'Verified - can inform ITI planning', order: 0 },
  outreach_priority: { label: 'Priority for employer outreach', order: 1 },
  outreach_optional: { label: 'Outreach if capacity allows', order: 2 },
  context_only: { label: 'Context only - do not plan on this', order: 3 },
};

export function wageText(w) {
  if (!w || !w.stated) return 'Not stated';
  const unit = w.period ? ' / ' + w.period : '';
  if (w.min == null) return `Up to ₹${fmtINR(w.max)}${unit}`;
  if (w.min === w.max) return `₹${fmtINR(w.min)}${unit}`;
  return `₹${fmtINR(w.min)}–₹${fmtINR(w.max)}${unit}${w.incentives ? ' + incentives' : ''}`;
}

/**
 * Planning tier for one record.
 * @param {any} r
 * @param {string} asOf
 */
export function planningTier(r, asOf) {
  const reasons = [];
  if (r.evidence_type === 'employer_presence') return { tier: 'context_only', reasons: ['Employer presence is not a vacancy.'] };
  if (r.verification_status === 'historical') return { tier: 'context_only', reasons: ['Historical post; occupational context only.'] };
  if (r.verification_status === 'expired') return { tier: 'context_only', reasons: ['Signal expired.'] };
  if (r.verification_status === 'contradicted') return { tier: 'context_only', reasons: ['Employer contradicted the advert.'] };
  if (!isInScope(r)) return { tier: 'context_only', reasons: ['Location outside or unclear for Sectors 62/63.'] };
  if (isValidConfirmed(r, asOf)) return { tier: 'planning_ready', reasons: [`Employer confirmed ${r.vacancy_count_verified} opening(s) on ${fmtDate(r.verified_at)}; approved by a second reviewer.`] };
  if (r.verification_status === 'employer_confirmed') reasons.push(`Confirmation older than ${VERIFICATION_VALID_DAYS} days or incomplete; re-verify.`);
  const technical = TECHNICAL_FAMILIES.includes(r.occupation_family) || (r.iti_trade_relevance || []).length > 0;
  const entry = r.experience.min_months == null || r.experience.min_months <= 12;
  if (technical) reasons.push(`Occupation linked to ITI trades${(r.iti_trade_relevance || []).length ? ': ' + r.iti_trade_relevance.join(', ') : ''} (inference).`);
  if (entry) reasons.push(r.experience.min_months == null ? 'Experience not stated.' : 'Entry or early-career experience level.');
  if (technical && entry) return { tier: 'outreach_priority', reasons };
  if (!technical) reasons.push('Service or sales role with no ITI trade link; relevant mainly to Class 12 pathways.');
  if (!entry) reasons.push('Experienced-hire requirement limits fresh pass-out relevance.');
  return { tier: 'outreach_optional', reasons };
}

/**
 * Fact / inference / recommendation statement for one record.
 * @param {any} r
 * @param {string} asOf
 */
export function explainRecord(r, asOf) {
  const facts = [];
  const where = r.sector ? `Sector ${r.sector}` : `claimed Sector ${r.geo.claimed_sector ?? '?'} (location unclear)`;
  facts.push(`${r.platform} ${r.source_url_kind.replace(/_/g, ' ')} captured ${fmtDate(r.captured_at)}${r.published_at ? `, published ${fmtDate(r.published_at)}` : ', publication date not shown'}.`);
  facts.push(`Advertised role "${r.role_title_raw}" by ${r.employer_identity || 'an undisclosed employer'}${r.recruiter_identity ? ` via recruiter ${r.recruiter_identity}` : ''}, ${where}.`);
  facts.push(`Pay: ${wageText(r.wage)}. Experience: ${r.experience.raw}. Education: ${r.education.raw}.`);
  if (r.vacancy_claimed) facts.push(`Advert claims ${r.vacancy_claimed} opening(s). This is the advertiser's claim, not a verified count.`);
  for (const t of extractEmploymentTerms(r)) facts.push(`Employment term stated: ${t.label}.`);
  if (r.verification_status === 'employer_confirmed') facts.push(`Employer confirmed ${r.vacancy_count_verified} opening(s) on ${fmtDate(r.verified_at)}${r.start_date ? `, expected start ${fmtDate(r.start_date)}` : ''}.`);

  const inferences = [...(r.inferences || []).map((i) => i.text)];
  inferences.push(`Occupation normalised to "${r.canonical_occupation}" (${r.occupation_family}).`);
  if ((r.iti_trade_relevance || []).length) inferences.push(`Possibly relevant ITI trades: ${r.iti_trade_relevance.join(', ')}.`);
  if (r.geo.basis === 'aggregator_label_only') inferences.push('Sector taken from the portal\'s category or search label only; the workplace may be elsewhere.');
  const age = daysBetween(r.last_rechecked_at || r.captured_at, asOf);
  if (age != null && age > STALE_AFTER_DAYS) inferences.push(`Last rechecked ${age} days ago; the advert may have closed.`);
  if (r.skills.some((s) => s.basis === 'curated')) inferences.push('Skill names were normalised by a curator from the advert; not verbatim.');

  const { tier, reasons } = planningTier(r, asOf);
  const rec = {
    planning_ready: 'Use in ITI planning with the as-of date shown. Re-verify before the next intake decision.',
    outreach_priority: 'Contact the employer to confirm openings, entry pay, start date and whether ITI pass-outs are accepted.',
    outreach_optional: 'Contact the employer only if outreach capacity allows; record the outcome either way.',
    context_only: 'Do not count as demand. Keep as context in the source register.',
  }[tier];
  return { strength: evidenceStrength(r), facts, inferences, recommendation: rec, tier, tierLabel: TIERS[tier].label, reasons };
}

/**
 * Group records by planning tier for the decisions screen.
 * @param {any[]} records representatives
 * @param {string} asOf
 */
export function planningBoard(records, asOf) {
  /** @type {Record<string, any[]>} */
  const out = { planning_ready: [], outreach_priority: [], outreach_optional: [], context_only: [] };
  for (const r of records) {
    const t = planningTier(r, asOf);
    out[t.tier].push({ r, reasons: t.reasons });
  }
  return out;
}
