import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSeed } from '../src/server/seed.js';
import { researchQuality, researchQueueSummary } from '../src/core/research-ops.js';

const seed = loadSeed();
test('research quality counts distinct approved ads, never postings as openings', () => {
  const s = researchQuality(seed.records, '2026-10-24');
  assert.ok(s.allRecords >= s.approvedRecords);
  assert.ok(s.activeAdRecords >= s.distinctAds);
  assert.equal(s.activeAdRecords - s.distinctAds, s.mirrorRecords);
  assert.equal(s.denominator, s.distinctAds);
  assert.ok(s.confirmedOpenings >= 0);
  assert.ok(s.metrics.every((m) => m.count >= 0 && m.count <= s.denominator));
  assert.ok(s.issues.every((p) => p.reasons.length && !!p.id));
});

test('missing pay and weak source metadata remain missing, rather than inferred', () => {
  const base = seed.records.find((r) => r.review.state === 'approved' && r.evidence_type !== 'employer_presence');
  const r = { ...base, source_id: 'QUALITY-001', dedupe_cluster: 'QUALITY-001', role_title_raw: 'Quality test ad', source_url: 'http://broken.example',
    captured_at:'2026-09-01', last_rechecked_at:'2026-09-01', published_at:null, geo:{...base.geo,scope_status:'unclear',basis:'aggregator_label_only'}, sector:null,
    wage: {stated:false}, education:{stated:false}, experience:{min_months:null}, verification_status:'observed_public' };
  const q = researchQuality([r], '2026-10-24');
  assert.equal(q.distinctAds,1);
  assert.equal(q.confirmedOpenings,0);
  assert.deepEqual(q.issues[0].reasons.some((x)=>x.includes('Source URL')),true);
  assert.ok(q.issues[0].reasons.some((x)=>x.includes('Not rechecked')));
  assert.equal(q.metrics.find((x)=>x.key==='pay').count,1);
});

test('queue categories are separate overlapping worklists and missing queues are not fabricated', () => {
  assert.equal(researchQueueSummary(null),null);
  const q = researchQueueSummary({
    asOf:'2026-10-24', pendingReview:[{},{}], awaitingEmployerCheck:[{}],
    duplicates:[{}], verificationsAwaitingApproval:[{}], followups:[{}],
    expired:{stale:[{}],possiblyClosed:[{}]},
  });
  assert.equal(q.pendingReview,2);
  assert.equal(q.pendingEmployerApprovals,1);
  assert.equal(q.stale,1);
  assert.equal(q.pendingInterviewApprovals,0);
  assert.equal(q.pastExpiry,0);
});
