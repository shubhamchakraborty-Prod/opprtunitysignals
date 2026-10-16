// Acceptance tests from the build brief, exercised at the service/core level.
// Browser-level checks (map pins, offline fallback, screenshots) are in test/e2e.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeService, actors, AS_OF, ADJACENT, MIRROR_A, MIRROR_B, PRESENCE, TERMS, CLAIMS_FIVE, verificationPayload } from './helpers.js';
import { computeKpis, sentimentSummary, demandCoverage } from '../src/core/analytics.js';
import { defaultFilters, filterOpportunities } from '../src/core/filters.js';
import { extractEmploymentTerms } from '../src/core/terms.js';
import { explainRecord } from '../src/core/decisions.js';
import { validateRecord } from '../src/core/schema.js';

const F = (o = {}) => ({ ...defaultFilters(), ...o });

test('AT1 switching sector from Both to 62 or 63 updates every counter and the record list', async () => {
  const { service } = makeService();
  const both = await service.analytics(actors.observer, F());
  const s62 = await service.analytics(actors.observer, F({ sector: '62' }));
  const s63 = await service.analytics(actors.observer, F({ sector: '63' }));
  assert.equal(both.kpis.signalCount, 29);
  assert.deepEqual([both.kpis.sector62, both.kpis.sector63], [10, 19]);
  assert.deepEqual([s62.kpis.signalCount, s62.kpis.sector62, s62.kpis.sector63], [10, 10, 0]);
  assert.deepEqual([s63.kpis.signalCount, s63.kpis.sector62, s63.kpis.sector63], [19, 0, 19]);
  const l62 = await service.listRecords(actors.observer, F({ sector: '62' }));
  assert.ok(l62.length === 10 && l62.every((r) => r.sector === '62'));
});

test('AT2 an adjacent-sector result from a category search is not counted as a Sector 63 vacancy', async () => {
  const { service } = makeService({ extra: [ADJACENT()] });
  const rec = (await service.getRecord(actors.observer, 'FIX-ADJ')).record;
  assert.equal(rec.sector, null);
  assert.equal(rec.geo.scope_status, 'adjacent_or_unclear');
  assert.equal(rec.geo.claimed_sector, '63');
  const a = await service.analytics(actors.observer, F({ sector: '63' }));
  assert.equal(a.kpis.sector63, 19, 'adjacent record must not raise the Sector 63 count');
  const withUnclear = await service.analytics(actors.observer, F({ sector: '63', includeUnclear: true }));
  assert.equal(withUnclear.kpis.sector63, 19);
  assert.equal(withUnclear.kpis.unclearShown, 2, 'fixture + real Sector 8 listing (SIG-029), listed separately when requested');
  const real = (await service.getRecord(actors.observer, 'SIG-029')).record;
  assert.equal(real.geo.scope_status, 'adjacent_or_unclear', 'a real Sector 8 ad returned by a Sector 63 search is not counted');
  assert.equal(explainRecord(rec, AS_OF).tier, 'context_only');
});

test('AT3 a historical post is hidden by default and dated when shown', async () => {
  const { service } = makeService();
  const hidden = await service.listRecords(actors.observer, F());
  assert.ok(!hidden.some((r) => r.source_id === 'SIG-018'));
  const shown = await service.listRecords(actors.observer, F({ includeHistorical: true }));
  const h = shown.find((r) => r.source_id === 'SIG-018');
  assert.ok(h);
  assert.equal(h.verification_status, 'historical');
  assert.equal(h.published_at, '2026-02-24');
  assert.equal(h.published_at_basis, 'derived_from_post_id');
  const k = (await service.analytics(actors.observer, F({ includeHistorical: true }))).kpis;
  assert.equal(k.signalCount, 29, 'historical and expired posts are shown but never counted as current signals');
  assert.equal(k.olderShown, 2);
});

test('AT4 an employer-presence record never appears or counts as a vacancy', async () => {
  const { service } = makeService({ extra: [PRESENCE()] });
  const list = await service.listRecords(actors.observer, F({ includeHistorical: true, includeUnclear: true }));
  assert.ok(!list.some((r) => r.source_id === 'FIX-PRES'));
  const k = (await service.analytics(actors.observer, F())).kpis;
  assert.equal(k.signalCount, 29);
  assert.equal(k.confirmedOpenings, 0);
  const bad = { ...PRESENCE(), vacancy_claimed: 4 };
  assert.ok(validateRecord(bad).some((e) => /employer_presence/.test(e)));
});

test('AT5 two portals mirroring one post are marked possible duplicates and counted once', async () => {
  const { service } = makeService({ extra: [MIRROR_A(), MIRROR_B()] });
  const a = (await service.getRecord(actors.researcher, 'FIX-MIR-A')).record;
  const b = (await service.getRecord(actors.researcher, 'FIX-MIR-B')).record;
  assert.equal(a.dedupe_cluster, b.dedupe_cluster);
  assert.equal(a.duplicate_status, 'possible_duplicate');
  const k = (await service.analytics(actors.observer, F({ sector: '63' }))).kpis;
  assert.equal(k.sector63, 20, '19 seed records + 1 cluster, not +2');
  assert.equal(k.mirrorsCollapsed, 1);
  const q = await service.reviewQueue(actors.researcher);
  assert.equal(q.duplicates.length, 1);
  await service.resolveDuplicate(actors.researcher, a.dedupe_cluster, { decision: 'same_post', keep: 'FIX-MIR-A' });
  const after = (await service.analytics(actors.observer, F({ sector: '63' }))).kpis;
  assert.equal(after.sector63, 20);
  assert.equal((await service.reviewQueue(actors.researcher)).duplicates.length, 0);
});

test('AT6 an employer verifying 3 places raises the KPI by 3, never by the advert claim', async () => {
  const { service } = makeService({ extra: [CLAIMS_FIVE()] });
  const before = (await service.analytics(actors.observer, F())).kpis;
  assert.equal(before.confirmedOpenings, 0);
  assert.equal(before.claimedButUnverified, 62, 'claims in ads (5 + 20 + 2 + 30) + fixture 5; shown as claims only');
  const v = await service.submitVerification(actors.verifier, verificationPayload());
  const pending = (await service.analytics(actors.observer, F())).kpis;
  assert.equal(pending.confirmedOpenings, 0, 'not counted until a second person approves');
  assert.equal(pending.pendingApprovalOpenings, 3);
  await assert.rejects(service.decideVerification(actors.verifier, v.id, { decision: 'approve' }), /cannot perform/);
  await service.decideVerification(actors.admin, v.id, { decision: 'approve' });
  const after = (await service.analytics(actors.observer, F())).kpis;
  assert.equal(after.confirmedOpenings, 3);
  assert.equal(after.confirmedAsOf.latest, '2026-10-15');
  const s62 = (await service.analytics(actors.observer, F({ sector: '62' }))).kpis;
  assert.equal(s62.confirmedOpenings, 0, 'Sector 63 confirmation does not leak into Sector 62');
});

test('AT6b the submitter of a verification cannot approve it (four-eyes)', async () => {
  const { service } = makeService({ extra: [CLAIMS_FIVE()] });
  const v = await service.submitVerification(actors.admin, verificationPayload());
  await assert.rejects(service.decideVerification(actors.admin, v.id, { decision: 'approve' }), /someone other than/);
  await service.decideVerification(actors.admin2, v.id, { decision: 'approve' });
});

test('AT7 night shift and 6-day week are labelled employment terms, not sentiment', async () => {
  const t = extractEmploymentTerms(TERMS());
  assert.deepEqual(t.map((x) => x.key).sort(), ['night_shift', 'six_day_week']);
  assert.ok(t.every((x) => x.category === 'employment_terms'));
  const { service } = makeService({ extra: [TERMS()] });
  const a = await service.analytics(actors.observer, F());
  assert.notEqual(a.sentiment.status, 'ok', 'adverts never feed sentiment');
  assert.ok(a.requirements['62'].terms.some((x) => x.name === 'Night shift' && x.category === 'employment_terms'));
  // A job advert passed to the sentiment function is ignored.
  const s = sentimentSummary([{ source_type: 'public_listing', consent: { obtained: true }, review: { state: 'approved' } }], { enabled: true });
  assert.equal(s.message, 'No measured sentiment available.');
});

test('AT8 with no worker interviews the sentiment panel says "No measured sentiment available"', async () => {
  const { service } = makeService();
  assert.equal((await service.analytics(actors.observer, F())).sentiment.message, 'No measured sentiment available.');
  await service.setSentimentEnabled(actors.admin, true);
  const enabled = (await service.analytics(actors.observer, F())).sentiment;
  assert.equal(enabled.status, 'no_data');
  assert.equal(enabled.message, 'No measured sentiment available.');
});

test('AT9 with no expected pass-outs there is no demand-coverage ratio', async () => {
  const { service } = makeService({ extra: [CLAIMS_FIVE()] });
  const v = await service.submitVerification(actors.verifier, verificationPayload());
  await service.decideVerification(actors.admin, v.id, { decision: 'approve' });
  const dc = (await service.analytics(actors.observer, F())).demandCoverage;
  assert.ok(dc.rows.every((r) => r.ratio === null && r.display === 'Not available'));
  assert.ok(dc.rows[0].reasons.some((x) => /pass-out/.test(x)));
  // Zero pass-outs also yields no ratio.
  const zero = demandCoverage([{ trade: 'fitter', openings: 4 }], [{ trade: 'fitter', catchment: 'Gautam Buddh Nagar', expected_passouts: 0, approved: true }]);
  assert.equal(zero.rows[0].ratio, null);
  // With an approved denominator the ratio is computed.
  await service.setPassouts(actors.admin, [{ trade: 'electronics_mechanic', catchment: 'Gautam Buddh Nagar', year: 2027, expected_passouts: 60, source: 'Test dataset (fixture)' }]);
  const ok = (await service.analytics(actors.observer, F())).demandCoverage;
  assert.equal(ok.rows.find((r) => r.trade === 'electronics_mechanic').display, '0.05');
});

test('AT10 every source URL can be opened and a broken source can be flagged for follow-up', async () => {
  const { service, seed } = makeService();
  for (const r of seed.records) assert.match(r.source_url, /^https:\/\//);
  assert.ok(validateRecord({ ...seed.records[0], source_url: 'not a url' }).some((e) => /source_url/.test(e)));
  await service.flagSource(actors.observer, 'SIG-002', { type: 'broken_link' }).then(() => assert.fail('observer must not flag'), (e) => assert.equal(e.status, 403));
  await service.flagSource(actors.researcher, 'SIG-002', { type: 'broken_link', note: 'Search page returns different results' });
  const q = await service.reviewQueue(actors.researcher);
  assert.ok(q.followups.some((x) => x.record.source_id === 'SIG-002' && x.flag.type === 'broken_link'));
  assert.ok(q.expired.possiblyClosed.some((x) => x.record.source_id === 'SIG-017'));
});

test('AT12 outputs separate source fact, inference and recommendation', async () => {
  const { service } = makeService();
  const r = (await service.getRecord(actors.observer, 'SIG-011')).record;
  const e = explainRecord(r, AS_OF);
  assert.ok(e.facts.length && e.inferences.length && e.recommendation);
  assert.ok(e.facts.some((x) => /2\+ years/.test(x)));
  assert.ok(e.inferences.some((x) => /category or search label/.test(x)));
  assert.equal(e.tier, 'outreach_optional', '2+ years experience is not a fresh pass-out opportunity');
  const note = await service.managementNote(actors.observer, F());
  for (const h of ['## Source facts', '## Inferences', '## Recommendations', '## What must be verified']) assert.ok(note.includes(h), h);
});

test('search totals and claimed vacancies never become the verified KPI', async () => {
  const { service } = makeService();
  const all = (await service.listRecords(actors.observer, F())).map((x) => x);
  const k = computeKpis(all, F(), { asOf: AS_OF });
  assert.equal(k.confirmedOpenings, 0);
  assert.equal(filterOpportunities(all, F()).filter((r) => r.verification_status === 'employer_confirmed').length, 0);
});
