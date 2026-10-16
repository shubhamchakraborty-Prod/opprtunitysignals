// HTTP API tests against an in-process server (memory store).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createApp } from '../src/server/app.js';
import { loadUsers } from '../src/server/auth.js';
import { ROOT } from '../src/server/seed.js';
import { makeService, verificationPayload, CLAIMS_FIVE, AS_OF } from './helpers.js';

let server, base;
const T = { researcher: 'dev-researcher-token', verifier: 'dev-verifier-token', admin: 'dev-admin-token' };

before(async () => {
  const { service } = makeService({ extra: [CLAIMS_FIVE()] });
  server = createServer(createApp({ service, users: loadUsers(join(ROOT, 'config/users.dev.json')), staticDir: join(ROOT, 'dist') }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = (path, { token, method = 'GET', body } = {}) => fetch(base + path, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });

test('health and anonymous observer read', async () => {
  assert.deepEqual(await (await call('/api/health')).json(), { ok: true, mode: 'api', asOf: AS_OF });
  const s = await (await call('/api/session')).json();
  assert.equal(s.actor.role, 'observer');
  const recs = await (await call('/api/records?sector=63')).json();
  assert.ok(recs.every((r) => r.sector === '63'));
});

test('bad token is rejected; observer cannot write', async () => {
  assert.equal((await call('/api/session', { token: 'nope' })).status, 401);
  assert.equal((await call('/api/verifications', { method: 'POST', body: verificationPayload() })).status, 403);
});

test('verification round trip through the API updates analytics by exactly the verified count', async () => {
  const before = await (await call('/api/analytics')).json();
  const sub = await call('/api/verifications', { token: T.verifier, method: 'POST', body: verificationPayload() });
  assert.equal(sub.status, 200);
  const v = await sub.json();
  const bad = await call(`/api/verifications/${v.id}/decision`, { token: T.verifier, method: 'POST', body: { decision: 'approve' } });
  assert.equal(bad.status, 403);
  const ok = await call(`/api/verifications/${v.id}/decision`, { token: T.admin, method: 'POST', body: { decision: 'approve' } });
  assert.equal(ok.status, 200);
  const afterA = await (await call('/api/analytics')).json();
  assert.equal(afterA.kpis.confirmedOpenings - before.kpis.confirmedOpenings, 3);
  const audit = await (await call('/api/audit', { token: T.admin })).json();
  assert.ok(audit.some((a) => a.action === 'verification.approve'));
});

test('validation errors return 400 with details', async () => {
  const r = await call('/api/verifications', { token: T.verifier, method: 'POST', body: { outcome: 'confirmed' } });
  assert.equal(r.status, 400);
  assert.ok((await r.json()).details.length > 3);
});

test('exports: register CSV and management note', async () => {
  const csv = await (await call('/api/export/register.csv?sector=62')).text();
  assert.match(csv, /source_id/);
  assert.ok(!csv.includes('SIG-009'));
  const note = await call('/api/export/management-note.md');
  assert.match(note.headers.get('content-type'), /markdown/);
  assert.match(await note.text(), /## What must be verified/);
});

test('static files are served with security headers and no path traversal', async () => {
  const r = await call('/../package.json');
  assert.equal(r.status, 404);
  const h = await call('/api/health');
  assert.equal(h.headers.get('x-content-type-options'), 'nosniff');
});
