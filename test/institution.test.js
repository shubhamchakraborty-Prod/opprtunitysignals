import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instituteDemand, instituteEmployerLeads } from '../src/core/institution.js';
import { comparisonBase } from '../src/core/analytics.js';
import { loadSeed } from '../src/server/seed.js';

const seed = loadSeed();
const ads = comparisonBase(seed.records, 'all');

test('institution intelligence only uses current, in-scope, deduplicated source records', () => {
  const d = instituteDemand('iti', ads, seed.trades.trades, seed.programmes?.programmes || [], seed.courses?.skills || {});
  assert.equal(d.sampleSize, ads.length);
  assert.equal(d.rows.length, seed.trades.trades.length);
  assert.ok(d.rows.some((r) => r.related > 0));
  assert.ok(d.rows.every((r) => r.related === r.adIds.length));
  assert.ok(d.skills.every((s) => s.ads <= ads.length));
  assert.deepEqual(instituteDemand('invalid', ads).rows, []);
  assert.deepEqual(instituteDemand('college', [], [], seed.programmes?.programmes || []).skills, []);
});

test('employer leads are named and any verified opening comes from authorised evidence', () => {
  const leads = instituteEmployerLeads(ads, seed.asOf);
  assert.ok(leads.length > 0);
  assert.ok(leads.every((l) => l.adCount === l.sources.length && l.sources.every((s) => s.url.startsWith('https://'))));
  assert.ok(leads.every((l) => l.confirmedOpenings >= 0));
  const noEmployer = { ...ads[0], employer_identity: '' };
  assert.deepEqual(instituteEmployerLeads([noEmployer], seed.asOf), []);
  const unverified = ads.find((r) => r.verification_status !== 'employer_confirmed');
  if (unverified) assert.equal(instituteEmployerLeads([unverified], seed.asOf)[0]?.confirmedOpenings || 0, 0);
});
