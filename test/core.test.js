// Unit tests: parsers, dedupe, matching gates, RBAC, CSV, trend, ingestion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWage, parseExperience, parseEducation, urlKind, originalPostIdFromUrl } from '../src/core/parse.js';
import { assignClusters, representatives, employerKey } from '../src/core/dedupe.js';
import { matchRecord } from '../src/core/matching.js';
import { requirementTrend } from '../src/core/analytics.js';
import { parseCsv, toCsv } from '../src/core/csv.js';
import { can } from '../src/core/rbac.js';
import { normalizeRecord } from '../src/core/schema.js';
import { makeService, actors, fixture, MIRROR_A, MIRROR_B, ADJACENT, CLAIMS_FIVE, verificationPayload } from './helpers.js';
import { readFileSync } from 'node:fs';

test('parseWage handles monthly, lakh, up-to and not stated', () => {
  assert.deepEqual([parseWage('₹40,000–₹60,000 / month').min, parseWage('₹40,000–₹60,000 / month').max, parseWage('₹40,000–₹60,000 / month').period], [40000, 60000, 'month']);
  const l = parseWage('₹2.3–₹3 lakh / year');
  assert.deepEqual([l.min, l.max, l.period], [230000, 300000, 'year']);
  const u = parseWage('Up to ₹25,000 / month');
  assert.deepEqual([u.min, u.max], [null, 25000]);
  assert.equal(parseWage('₹5–₹8 lakh / year + incentives').incentives, true);
  assert.equal(parseWage('Not stated').stated, false);
});

test('parseExperience converts to months', () => {
  const cases = { 'Fresher / up to 6 months': [0, 6], '6+ months': [6, null], '5+ years': [60, null], 'Any experience': [0, null], '3–4 years': [36, 48], '6 months–1 year': [6, 12], 'Not stated': [null, null] };
  for (const [raw, [min, max]] of Object.entries(cases)) {
    const p = parseExperience(raw);
    assert.deepEqual([p.min_months, p.max_months], [min, max], raw);
  }
});

test('parseEducation recognises ITI trades, 12th, diploma and degree', () => {
  assert.deepEqual(parseEducation('ITI Electronics / diploma / 12th').accepted.sort(), ['12th', 'diploma', 'iti_electronics_mechanic']);
  assert.deepEqual(parseEducation('Degree or equivalent practical experience').accepted, ['degree']);
  assert.equal(parseEducation('Not stated').stated, false);
});

test('URL classification distinguishes individual posts from listing pages', () => {
  assert.equal(urlKind('https://apna.co/jobs/jobs-in-sector-62-in-noida'), 'category_page');
  assert.equal(urlKind('https://in.indeed.com/q-bpo-l-noida-sector-62%2C-noida%2C-uttar-pradesh-jobs.html'), 'search_results_page');
  assert.equal(originalPostIdFromUrl('https://www.tymblhub.com/quality-engineer-jobs-in-noida-in-ingar-electronics-3-to-4-years-jid-439806'), '439806');
});

test('dedupe: employer suffix noise is ignored, different roles stay separate', () => {
  assert.equal(employerKey('Fixture Mirror Electronics Pvt Ltd'), employerKey('Fixture Mirror Electronics Private Limited'));
  const lathe = fixture({ source_id: 'A', role_title_raw: 'Lathe Machine Operator', employer_identity: 'EmiQual Foods', sector: '63', source_url: 'https://example.org/a' });
  const sup = fixture({ source_id: 'B', role_title_raw: 'Production Supervisor / Mechanical Engineer', employer_identity: 'EmiQual Foods', sector: '63', source_url: 'https://example.org/b' });
  const out = assignClusters([lathe, sup]);
  assert.notEqual(out[0].dedupe_cluster, out[1].dedupe_cluster);
  const mirrors = assignClusters([MIRROR_A(), MIRROR_B()]);
  assert.equal(representatives(mirrors).length, 1);
  assert.equal(representatives(mirrors)[0].source_id, 'FIX-MIR-A', 'individual post preferred as representative');
});

test('matching: experience is a hard gate and overlap never implies eligibility', () => {
  const { seed } = makeService();
  const machinist = seed.profiles.find((p) => p.id === 'iti_machinist');
  const lathe = normalizeRecord(seed.records.find((r) => r.source_id === 'SIG-011'));
  const m = matchRecord(machinist, lathe);
  assert.equal(m.overlap.label, 'Strong skill overlap');
  assert.equal(m.verdict, 'gate_not_met');
  assert.ok(m.gaps.some((g) => /2 years/.test(g)));
  assert.match(m.disclaimer, /not hiring eligibility/);
  const elec = seed.profiles.find((p) => p.id === 'iti_electronics');
  const hist = matchRecord(elec, normalizeRecord(seed.records.find((r) => r.source_id === 'SIG-018')));
  assert.equal(hist.gates.find((g) => g.gate === 'Qualification').status, 'pass');
  const c12 = seed.profiles.find((p) => p.id === 'class12');
  const bpo = matchRecord({ ...c12 }, normalizeRecord(seed.records.find((r) => r.source_id === 'SIG-004')));
  assert.equal(bpo.gates.find((g) => g.gate === 'Language').status, 'unknown');
  assert.ok(bpo.conditions.includes('Night shift'));
});

test('trend needs two comparable waves of at least 10 records', () => {
  const mk = (id, month, sector) => fixture({ source_id: id, role_title_raw: 'Op ' + id, employer_identity: 'E' + id, sector, captured_at: `2026-${month}-01`, source_url: 'https://example.org/' + id, platform: 'Apna' });
  const one = Array.from({ length: 12 }, (_, i) => mk('a' + i, '09', i % 2 ? '62' : '63'));
  assert.equal(requirementTrend(one).status, 'insufficient_evidence');
  const two = [...one, ...Array.from({ length: 12 }, (_, i) => mk('b' + i, '10', i % 2 ? '62' : '63'))];
  assert.equal(requirementTrend(two).status, 'ok');
});

test('RBAC matrix', () => {
  assert.ok(!can(actors.observer, 'ingest:csv'));
  assert.ok(can(actors.researcher, 'ingest:csv') && !can(actors.researcher, 'verify:approve'));
  assert.ok(can(actors.verifier, 'verify:submit') && !can(actors.verifier, 'verify:approve') && can(actors.verifier, 'read:contacts'));
  assert.ok(can(actors.admin, 'verify:approve') && can(actors.admin, 'read:audit'));
});

test('contacts are restricted from observers and every change is audited', async () => {
  const { service } = makeService({ extra: [CLAIMS_FIVE()] });
  const v = await service.submitVerification(actors.verifier, verificationPayload());
  await service.decideVerification(actors.admin, v.id, { decision: 'approve' });
  const pub = (await service.getRecord(actors.observer, 'FIX-CLAIM5')).record;
  assert.equal(pub.verification_contact, '[restricted]');
  const priv = (await service.getRecord(actors.verifier, 'FIX-CLAIM5')).record;
  assert.match(priv.verification_contact, /Fixture HR Person/);
  assert.ok(!(await service.exportRegister(actors.observer, {})).includes('Fixture HR Person'));
  const log = await service.auditLog(actors.admin);
  assert.deepEqual(log.map((a) => a.action).slice(0, 2), ['verification.approve', 'verification.submit']);
  await assert.rejects(service.auditLog(actors.observer), /cannot perform/);
  const hist = (await service.getRecord(actors.admin, 'FIX-CLAIM5')).history;
  assert.ok(hist.length >= 1, 'previous version retained');
});

test('verification validation rejects missing consent, notes and bad openings', async () => {
  const { service } = makeService({ extra: [CLAIMS_FIVE()] });
  await assert.rejects(service.submitVerification(actors.verifier, verificationPayload({ consent_basis: '', notes: [], roles: [{ role_title: 'X', trade: 'fitter', openings: 0 }] })), (e) => {
    assert.equal(e.status, 400);
    assert.ok(e.details.some((d) => /consent_basis/.test(d)));
    assert.ok(e.details.some((d) => /dated note/.test(d)));
    assert.ok(e.details.some((d) => /openings/.test(d)));
    return true;
  });
  await assert.rejects(service.submitVerification(actors.observer, verificationPayload()), /cannot perform/);
});

test('verification without a linked signal creates a verified_employer record', async () => {
  const { service } = makeService({ seed: false });
  const v = await service.submitVerification(actors.verifier, verificationPayload({ record_id: null, evidence_url: 'https://example.org/fixture-careers', employer_identity: 'Fixture Direct Co', work_location: { sector: '62', granularity: 'address', locality_text: 'A Block, Sector 62', lat: 28.62, lon: 77.365, geocode_verified: true } }));
  const done = await service.decideVerification(actors.admin, v.id, { decision: 'approve' });
  const r = (await service.getRecord(actors.observer, done.applied_record_id)).record;
  assert.equal(r.source_type, 'verified_employer');
  assert.equal(r.geo.basis, 'geocode_verified');
  assert.equal(r.vacancy_count_verified, 3);
});

test('CSV ingestion: template parses, rows go to pending review, invalid rows are rejected with reasons', async () => {
  const { service } = makeService();
  const tpl = readFileSync(new URL('../data/templates/evidence_upload_template.csv', import.meta.url), 'utf8');
  const rows = parseCsv(tpl);
  assert.equal(rows.length, 1);
  const bad = { ...rows[0], source_url: 'not-a-url', role_title_raw: '' };
  const csv = toCsv(Object.keys(rows[0]), [rows[0], bad, { ...rows[0], sector: '63', geo_locality_text: 'Sector 64', role_title_raw: 'CNC Operator' }]);
  const res = await service.importCsv(actors.researcher, csv, { label: 'test' });
  assert.equal(res.accepted.length, 2);
  assert.equal(res.rejected.length, 1);
  assert.ok(res.rejected[0].errors.some((e) => /source_url/.test(e)));
  const q = await service.reviewQueue(actors.researcher);
  assert.equal(q.pendingReview.length, 2);
  assert.equal((await service.listRecords(actors.observer, {})).length, 29, 'unreviewed uploads are not public');
  const adj = q.pendingReview.find((r) => r.role_title_raw === 'CNC Operator');
  assert.equal(adj.geo.scope_status, 'adjacent_or_unclear');
  await service.reviewRecord(actors.researcher, res.accepted[0], { decision: 'approve' });
  assert.equal((await service.listRecords(actors.observer, {})).length, 30);
  await assert.rejects(service.importCsv(actors.observer, csv), /cannot perform/);
});

test('CSV export neutralises spreadsheet formulas', () => {
  const out = toCsv(['a'], [{ a: '=HYPERLINK("x")' }]);
  assert.ok(out.includes(`"'=HYPERLINK(""x"")"`));
});

test('seed integrity: 33 records, 1 historical, 1 expired, nothing employer-confirmed', () => {
  const { seed } = makeService();
  assert.equal(seed.records.length, 33);
  assert.equal(seed.records.filter((r) => r.verification_status === 'expired').length, 1);
  assert.equal(seed.records.filter((r) => r.verification_status === 'historical').length, 1);
  assert.equal(seed.records.filter((r) => r.verification_status === 'employer_confirmed').length, 0);
  assert.ok(seed.records.every((r) => !r.fixture));
  assert.ok(ADJACENT().fixture);
});

test('ITI trade map: every trade is mapped; named links and skill gaps come with courses', async () => {
  const { mapCatalogue, bridgeJobs, bridgeSkillDemand, namesTrade } = await import('../src/core/trades.js');
  const { comparisonBase } = await import('../src/core/analytics.js');
  const { seed } = makeService();
  const ads = comparisonBase(seed.records.map(normalizeRecord), 'all');
  const m = mapCatalogue(seed.trades.trades, ads, seed.courses.skills);
  assert.equal(m.length, seed.trades.trades.length);
  assert.ok(m.length >= 100, 'catalogue lists 100+ CTS trades');
  const em = m.find((x) => x.trade === 'Electronics Mechanic');
  assert.ok(em.related.some((r) => r.source_id === 'SIG-019' && r.named));
  const cos = m.find((x) => x.trade === 'Cosmetology');
  assert.equal(cos.demand, 0, 'generic skills alone do not link unrelated trades');
  const copa = seed.trades.trades.find((t) => /COPA/.test(t.trade));
  assert.ok(namesTrade(normalizeRecord(seed.records.find((r) => r.source_id === 'SIG-006')), copa), 'COPA alias');
  const elec = seed.trades.trades.find((t) => t.trade === 'Electrician');
  const b = bridgeJobs(elec, ads, seed.courses.skills);
  const ts = b.find((x) => x.source_id === 'SIG-031');
  assert.ok(ts && ts.ready_as_fresher, 'tech support reachable by an Electrician fresher with bridge skills');
  assert.ok(ts.gaps.every((g) => g.course), 'every bridge gap has a course pointer');
  const exp = b.find((x) => x.source_id === 'SIG-005');
  assert.ok(exp && /experience/.test(exp.blockers.join(' ')), 'experience is a blocker, not a course');
  assert.equal(bridgeSkillDemand(ads, seed.courses.skills)[0].skill, 'English communication');
});
