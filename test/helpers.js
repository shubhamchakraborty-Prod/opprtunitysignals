// Shared test helpers and SYNTHETIC fixtures. Fixture records are marked
// fixture:true and use obviously fictitious employers; they are never real evidence.
import { MemoryStore } from '../src/core/store-memory.js';
import { createService } from '../src/core/service.js';
import { normalizeRecord } from '../src/core/schema.js';
import { assignClusters } from '../src/core/dedupe.js';
import { loadSeed } from '../src/server/seed.js';

export const AS_OF = '2026-10-16';
export const actors = {
  observer: { id: 'obs-1', name: 'Observer', role: 'observer' },
  researcher: { id: 'res-1', name: 'Researcher', role: 'researcher' },
  verifier: { id: 'ver-1', name: 'Verifier', role: 'employer_verifier' },
  admin: { id: 'adm-1', name: 'Admin', role: 'administrator' },
  admin2: { id: 'adm-2', name: 'Admin Two', role: 'administrator' },
};

const base = {
  platform: 'Apna', source_type: 'public_listing', captured_at: AS_OF, last_rechecked_at: AS_OF,
  experience: 'Any experience', experience_level: 'Entry level', education: 'Not stated', wage: 'Not stated',
  skills: ['Measurement'], occupation_family: 'Mechanical & production', fixture: true,
  review: { state: 'approved', by: 'fixture', at: '2026-10-16T00:00:00Z' },
  confidence: { level: 'low', rationale: 'Synthetic test fixture' },
};

export function fixture(over) {
  return normalizeRecord({ ...base, ...over, geo: { granularity: 'sector', basis: 'aggregator_label_only', scope_status: 'in_scope', ...(over.geo || {}) } });
}

/** Adjacent-sector result returned by a "Sector 63" category search but located in Sector 64. */
export const ADJACENT = () => fixture({
  source_id: 'FIX-ADJ', role_title_raw: 'CNC Operator', employer_identity: 'Fixture Adjacent Works', sector: '63',
  source_url: 'https://apna.co/jobs/production-manufacturing-engineering-jobs-in-sector-63-in-noida', geo: { locality_text: 'Sector 64, Noida' },
});

/** The same employer post mirrored on two portals. */
export const MIRROR_A = () => fixture({ source_id: 'FIX-MIR-A', platform: 'LinkedIn', role_title_raw: 'Quality Inspector - Urgent Hiring', employer_identity: 'Fixture Mirror Electronics Pvt Ltd', sector: '63', source_url: 'https://in.linkedin.com/jobs/view/quality-inspector-at-fixture-1111111111', geo: { basis: 'stated_in_listing' } });
export const MIRROR_B = () => fixture({ source_id: 'FIX-MIR-B', platform: 'Naukri', role_title_raw: 'Quality Inspector', employer_identity: 'Fixture Mirror Electronics Private Limited', sector: '63', source_url: 'https://www.naukri.com/job-listings-quality-inspector-fixture-2222', geo: { basis: 'stated_in_listing' } });

export const PRESENCE = () => fixture({ source_id: 'FIX-PRES', evidence_type: 'employer_presence', role_title_raw: 'Employer presence (manufacturing unit)', employer_identity: 'Fixture Presence Industries', sector: '62', source_url: 'https://example.org/fixture-directory-entry' });

export const TERMS = () => fixture({ source_id: 'FIX-TERMS', role_title_raw: 'Machine Operator', employer_identity: 'Fixture Terms Ltd', sector: '62', source_url: 'https://example.org/fixture-terms', shift: { raw: 'Night shift, 6-day workweek' } });

export const CLAIMS_FIVE = () => fixture({ source_id: 'FIX-CLAIM5', role_title_raw: 'Electronics Assembly Technician', employer_identity: 'Fixture Assembly Co', sector: '63', vacancy_claimed: 5, source_url: 'https://example.org/fixture-claims-five', occupation_family: 'Electronics & manufacturing', geo: { basis: 'stated_in_listing' } });

/** Service over the real seed plus optional extra fixtures. */
export function makeService({ extra = [], seed = true, store: storeOpts = {} } = {}) {
  const s = loadSeed();
  const records = assignClusters([...(seed ? s.records.map(normalizeRecord) : []), ...extra]);
  const store = new MemoryStore({ records, flags: seed ? s.flags : [], settings: s.settings, ...storeOpts });
  const service = createService(store, { now: () => AS_OF, profiles: s.profiles, geometry: s.geometry, trades: s.trades, courses: s.courses, announcements: s.announcements, regions: s.regions });
  return { store, service, seed: s };
}

export const verificationPayload = (over = {}) => ({
  record_id: 'FIX-CLAIM5',
  employer_identity: 'Fixture Assembly Co',
  verified_at: '2026-10-15',
  method: 'phone',
  outcome: 'confirmed',
  roles: [{ role_title: 'Electronics Assembly Technician', trade: 'electronics_mechanic', openings: 3, entry_wage_min: 14000, entry_wage_max: 16000, wage_period: 'month', start_date: '2026-11-01', prescreen: 'Soldering practical test' }],
  work_location: { sector: '63', granularity: 'address', locality_text: 'C Block, Sector 63' },
  notes: [{ date: '2026-10-15', text: 'HR manager confirmed three openings for November.' }],
  contact: { name: 'Fixture HR Person', designation: 'HR manager', channel: 'phone' },
  consent_basis: 'employer_business_contact_consent',
  ...over,
});
