// @ts-check
// Employment-terms extraction. Conditions stated in a job advert (night shift,
// six-day week, English level, self-commute) are EMPLOYMENT TERMS. They are
// never treated as worker or employer sentiment.

export const TERM_CATEGORY = 'employment_terms';

const RULES = [
  { key: 'night_shift', label: 'Night shift', re: /night shift|night-shift|us shift|uk shift|graveyard/i },
  { key: 'rotational_shift', label: 'Rotational shift', re: /rotational shift|rotating shift/i },
  { key: 'six_day_week', label: '6-day workweek', re: /six working days|6[- ]day|six[- ]day|6 working days/i },
  { key: 'strong_english', label: 'Strong English required', re: /strong english|fluent english|excellent english/i },
  { key: 'self_commute', label: 'Self-commute (no transport)', re: /self[- ]commute|no cab|own conveyance|own vehicle/i },
  { key: 'field_work', label: 'Field / travel work', re: /field work|field sales|travel required/i },
  { key: 'incentive_pay', label: 'Incentive-linked pay', re: /incentive/i },
];

/**
 * @param {{shift?:{raw?:string|null,night_shift?:boolean|null,days_per_week?:number|null}, curator_note?:string|null, source_text_excerpt?:string|null, wage?:{raw?:string, incentives?:boolean}}} record
 * @returns {{key:string,label:string,category:string,basis:string}[]}
 */
export function extractEmploymentTerms(record) {
  const text = [record.shift?.raw, record.curator_note, record.source_text_excerpt, record.wage?.raw].filter(Boolean).join(' \n ');
  /** @type {Map<string,{key:string,label:string,category:string,basis:string}>} */
  const found = new Map();
  for (const r of RULES) if (r.re.test(text)) found.set(r.key, { key: r.key, label: r.label, category: TERM_CATEGORY, basis: 'listing text' });
  if (record.shift?.night_shift) found.set('night_shift', { key: 'night_shift', label: 'Night shift', category: TERM_CATEGORY, basis: 'structured field' });
  if (record.shift?.days_per_week === 6) found.set('six_day_week', { key: 'six_day_week', label: '6-day workweek', category: TERM_CATEGORY, basis: 'structured field' });
  return [...found.values()];
}

/** Label used anywhere a term is displayed. */
export function termCategoryLabel() {
  return 'Employment terms (from the advert, not sentiment)';
}
