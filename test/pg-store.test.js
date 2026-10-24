// PostgreSQL/PostGIS store integration test. Skipped unless TEST_DATABASE_URL
// points at a disposable database with PostGIS available.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../src/core/service.js';
import { loadSeed } from '../src/server/seed.js';
import { actors, CLAIMS_FIVE, verificationPayload, AS_OF } from './helpers.js';

const URL_ = process.env.TEST_DATABASE_URL;

test('PgStore: migrate, seed, verify, history, append-only audit, spatial check', { skip: !URL_ && 'set TEST_DATABASE_URL to run' }, async () => {
  const { PgStore } = await import('../src/server/stores/pg.js');
  const store = new PgStore(URL_);
  try {
    await store.pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await store.migrate();
    await store.migrate(); // idempotent
    const seed = loadSeed();
    await store.loadSeed({ ...seed, records: [...seed.records, CLAIMS_FIVE()] });
    const service = createService(store, { now: () => AS_OF, profiles: seed.profiles });
    assert.equal((await service.listRecords(actors.observer, {})).length, seed.records.length + 1, 'all seeded records plus the test claim are visible');
    const v = await service.submitVerification(actors.verifier, verificationPayload());
    await service.decideVerification(actors.admin, v.id, { decision: 'approve' });
    const a = await service.analytics(actors.observer, {});
    assert.equal(a.kpis.confirmedOpenings, 3);
    const hist = await store.recordHistory('FIX-CLAIM5');
    assert.ok(hist.length >= 1, 'trigger stored the previous version');
    await assert.rejects(store.pool.query('DELETE FROM audit_log'), /append-only/);
    await assert.rejects(store.pool.query(`UPDATE evidence_records SET doc = jsonb_set(doc, '{evidence_type}', '"employer_presence"') WHERE source_id = 'FIX-CLAIM5'`), /presence_has_no_vacancies|verified_count/);
    assert.equal(await store.sectorForPoint(28.6195, 77.3689), '62');
    assert.equal(await store.sectorForPoint(28.6226, 77.3811), '63');
    assert.equal(await store.sectorForPoint(28.58, 77.33), null);
  } finally {
    await store.close();
  }
});
