// @ts-check
// Controlled vocabularies for the evidence model. Every enum used in records,
// the API and the UI is defined here so that validation and display agree.

export const PILOT_SECTORS = /** @type {const} */ (['62', '63']);

export const SOURCE_TYPES = /** @type {const} */ ([
  'public_listing',
  'employer_direct',
  'industry_report',
  'verified_employer',
  'interview',
  'workforce_sentiment',
]);

/** Source types that count as public hiring evidence (signal count). */
export const PUBLIC_EVIDENCE_SOURCE_TYPES = ['public_listing', 'employer_direct'];

/** Source types that may feed the sentiment panel. Job ads never do. */
export const NARRATIVE_SOURCE_TYPES = ['interview', 'workforce_sentiment'];

export const VERIFICATION_STATUSES = /** @type {const} */ ([
  'observed_public',
  'pending_employer_check',
  'employer_confirmed',
  'contradicted',
  'expired',
  'historical',
]);

export const EVIDENCE_TYPES = /** @type {const} */ ([
  'job_advertisement', // employer-posted advert
  'recruiter_advertisement', // third-party recruiter advert
  'employer_presence', // employer located in area; NOT a vacancy
  'historical_post', // older recruiting post; occupational context only
  'employer_verification', // opening confirmed directly by employer
]);

/** Evidence types that may ever be shown or counted as an opportunity. */
export const OPPORTUNITY_EVIDENCE_TYPES = [
  'job_advertisement',
  'recruiter_advertisement',
  'historical_post',
  'employer_verification',
];

export const LOCATION_PRECISION = /** @type {const} */ ([
  'building',
  'address',
  'locality',
  'sector',
  'citywide',
  'unknown',
]);

/**
 * How the sector assignment is known.
 * - stated_in_listing: the listing text names the sector or a block in it
 * - aggregator_label_only: only a portal category/search label says so
 * - curator_transcribed: sector recorded by a curator from the listing; exact wording not retained
 * - employer_confirmed: employer confirmed the work location
 * - geocode_verified: address geocoded and checked against the sector area
 */
export const GEO_BASIS = /** @type {const} */ ([
  'stated_in_listing',
  'aggregator_label_only',
  'curator_transcribed',
  'employer_confirmed',
  'geocode_verified',
]);

/** in_scope counts towards a sector; the others never do. */
export const GEO_SCOPE = /** @type {const} */ (['in_scope', 'adjacent_or_unclear', 'out_of_scope']);

export const DUPLICATE_STATUS = /** @type {const} */ ([
  'unique',
  'possible_duplicate',
  'confirmed_duplicate',
  'not_duplicate',
]);

export const REVIEW_STATES = /** @type {const} */ (['pending_review', 'approved', 'rejected']);

export const SOURCE_FLAG_TYPES = /** @type {const} */ ([
  'broken_link',
  'stale',
  'possibly_closed',
  'unverifiable',
  'location_mismatch',
  'other',
]);

export const WAGE_PERIODS = /** @type {const} */ (['hour', 'day', 'month', 'year']);

export const CONTRACT_TYPES = /** @type {const} */ ([
  'permanent',
  'fixed_term',
  'contract_third_party',
  'apprenticeship',
  'internship',
  'not_stated',
]);

/** Education tokens used for hard-gate matching. */
export const EDUCATION_TOKENS = /** @type {const} */ ([
  '10th',
  '12th',
  'iti_any',
  'iti_electronics_mechanic',
  'iti_fitter',
  'iti_machinist',
  'iti_turner',
  'iti_copa',
  'iti_electrician',
  'diploma',
  'degree',
  'engineering_degree',
]);

export const OCCUPATION_FAMILIES = [
  'BPO & service',
  'IT & analytics',
  'Sales & business',
  'Administration',
  'Electronics & manufacturing',
  'Mechanical & production',
  'Electrical & maintenance',
  'Automotive & EV',
  'Logistics & warehouse',
];

/** Families where ITI technical trades are plausibly relevant (an inference rule). */
export const TECHNICAL_FAMILIES = ['Electronics & manufacturing', 'Mechanical & production', 'Electrical & maintenance', 'Automotive & EV'];

export const EXPERIENCE_LEVELS = ['Entry level', 'Early career', 'Experienced', 'Mixed'];

/** Location bases that count as precise (not just a portal label or curator note). */
export const PRECISE_GEO_BASES = ['stated_in_listing', 'employer_confirmed', 'geocode_verified'];

/** Days after last recheck when a public signal is labelled stale. */
export const STALE_AFTER_DAYS = 14;

/** Days a verification remains usable for planning before it must be redone. */
export const VERIFICATION_VALID_DAYS = 90;

/** "Recent" window for requirement frequencies. */
export const RECENT_WINDOW_DAYS = 90;

/** Minimum records per comparable wave before any trend is computed. */
export const TREND_MIN_PER_WAVE = 10;

export const INTERVIEW_THEMES = /** @type {const} */ ([
  'aspirations',
  'commute',
  'pay',
  'safety',
  'work_hours',
  'retention',
]);

export const CONSENT_BASES = /** @type {const} */ ([
  'informed_consent_recorded',
  'employer_business_contact_consent',
  'legitimate_interest_business_contact',
]);

export const ROLES = /** @type {const} */ ([
  'observer',
  'researcher',
  'employer_verifier',
  'administrator',
]);
