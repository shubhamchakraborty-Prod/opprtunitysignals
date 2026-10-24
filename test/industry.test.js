import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSeed } from '../src/server/seed.js';
import { comparisonBase } from '../src/core/analytics.js';
import { ROLES } from '../src/core/talent.js';
import { supplyOverview, roleEvidenceSummary, roleInstitutionOptions, partnershipDraft, validPartnerStage } from '../src/core/industry-intelligence.js';

const seed = loadSeed();
const ads = comparisonBase(seed.records.filter((r) => r.review.state === 'approved'), 'all');
const smt = ROLES.find((r) => r.id === 'smt');

test('supply counts institutions, not learners or passes, and groups only within selected area', () => {
  const all = seed.demand.institutes;
  for (const area of ['noida_ncr', 'kalyani', 'siliguri']) {
    const supply = supplyOverview(all, area);
    assert.equal(supply.total, all.filter((i) => i.area === area).length);
    assert.equal(supply.total, supply.byType.iti + supply.byType.polytechnic + supply.byType.college);
    assert.equal(supply.estimatedLearners, null);
    assert.equal(supply.passoutCapacity, null);
    assert.ok(supply.pools.every((p) => p.institutes.every((i) => i.area === area)));
    assert.ok(supply.pools.every((p) => p.count <= supply.total));
  }
});

test('Noida ad evidence is never projected onto Kalyani or Siliguri', () => {
  const noida = roleEvidenceSummary(smt, ads, 'noida_ncr', '2026-10-24');
  assert.equal(noida.status, 'pilot_sample');
  assert.ok(noida.count > 0);
  assert.equal(noida.count, noida.records.length);
  for (const area of ['kalyani', 'siliguri']) {
    const region = roleEvidenceSummary(smt, ads, area, '2026-10-24');
    assert.equal(region.status, 'region_unavailable');
    assert.equal(region.pay, null);
    assert.equal(region.confirmedOpenings, null);
    assert.deepEqual(region.records, []);
  }
});

test('partner options and browser-only drafts require a valid role, institute and count', () => {
  const data = {trades: seed.trades.trades, programmes: seed.programmes.programmes, institutes: seed.demand.institutes, ads, area: 'noida_ncr'};
  const options = roleInstitutionOptions(smt, data);
  assert.ok(options.length > 0 && options.every((i) => i.name));
  assert.ok(options.every((i) => data.institutes.some((j) => j.name === i.name && j.area === 'noida_ncr')));
  const entry = {role:smt.id,institute:options[0].name,n:10,when:'2026-11',purpose:'visit'};
  assert.deepEqual(partnershipDraft(entry, ROLES, data.institutes), {
    role:smt.id,institute:options[0].name,area:'noida_ncr',n:10,when:'2026-11',purpose:'visit',stage:'saved',
  });
  assert.equal(partnershipDraft({...entry,n:-1}, ROLES, data.institutes),null);
  assert.equal(partnershipDraft({...entry,institute:'not in catalogue'}, ROLES,data.institutes),null);
  assert.equal(partnershipDraft({...entry,when:'2026-20'}, ROLES,data.institutes),null);
  assert.equal(partnershipDraft({...entry,purpose:'send_candidate_data'}, ROLES,data.institutes),null);
  assert.equal(validPartnerStage('contact_planned'),true);
  assert.equal(validPartnerStage('employer_confirmed'),false);
});
