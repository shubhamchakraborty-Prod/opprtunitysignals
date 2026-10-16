// Government feed tests. A local HTTP server stands in for the portals so the
// tests run offline; the response shapes follow MoSPI's official client and
// data.gov.in's resource API. These fixtures are never shown in the app.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore } from '../src/core/store-memory.js';
import { syncGovSources, govStatus, loadRegistry } from '../src/server/gov/sync.js';
import { feedHealth, prerequisites, isUnreachable } from '../src/core/govdata.js';
import { findStateCode, rowValue } from '../src/server/gov/connectors.js';
import { createApp } from '../src/server/app.js';
import { loadUsers } from '../src/server/auth.js';
import { ROOT } from '../src/server/seed.js';
import { makeService } from './helpers.js';

let srv, base, hits = [], mode = 'ok';
before(async () => {
  srv = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    hits.push(u.pathname + u.search);
    const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (mode === 'error500') return send(500, { msg: 'down' });
    if (u.pathname === '/api/plfs/getIndicatorListByFrequency') return send(200, { statusCode: true, data: [{ indicator_code: 1, indicator_name: 'Labour Force Participation Rate (LFPR)' }, { indicator_code: 2, indicator_name: 'Worker Population Ratio (WPR)' }, { indicator_code: 3, indicator_name: 'Unemployment Rate (UR)' }] });
    if (u.pathname === '/api/plfs/getFilterByIndicatorId') return send(200, { statusCode: true, data: { state: [{ state_code: 99, state_name: 'All India' }, { state_code: 33, state_name: 'Uttar Pradesh' }] } });
    if (u.pathname === '/api/plfs/getData') {
      const sc = u.searchParams.get('state_code'), ic = u.searchParams.get('indicator_code');
      return send(200, { statusCode: true, data: [{ year: '2022-23', state: sc, indicator_code: ic, value: String(2 + Number(ic) / 10 + (sc === '33' ? 0.5 : 0)) }, { year: '2023-24', state: sc, indicator_code: ic, value: String(3 + Number(ic) / 10) }] });
    }
    if (u.pathname.startsWith('/resource/')) {
      if (u.searchParams.get('api-key') !== 'TEST-KEY-123') return send(403, { status: 'error', message: 'Invalid key' });
      return send(200, { title: 'State/UT-wise ITIs (fixture)', updated_date: '2026-01-01', records: [{ state: 'Uttar Pradesh', govt_itis: '1', private_itis: '2' }] });
    }
    send(404, {});
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(() => srv.close());

const registry = () => loadRegistry().map((s) => (s.base_url ? { ...s, base_url: base } : s));
const env = (extra = {}) => ({ GOV_SYNC_DELAY_MS: '0', ...extra });
process.env.GOV_SYNC_DELAY_MS = '0';

test('MoSPI PLFS: resolves indicators by name and the UP state code, stores rows, raw file and audit', async () => {
  mode = 'ok';
  hits = [];
  const store = new MemoryStore({});
  const rawDir = mkdtempSync(join(tmpdir(), 'gov-'));
  const res = await syncGovSources(store, registry(), { env: env(), rawDir, force: true });
  const m = res.find((r) => r.id === 'mospi-plfs-up');
  assert.equal(m.status, 'ok');
  assert.equal(m.rows, 12, '3 indicators x 2 areas x 2 years');
  assert.ok(hits.some((h) => h.includes('state_code=33')), 'Uttar Pradesh code resolved from the filter list');
  assert.ok(hits.some((h) => h.includes('state_code=99')));
  const latest = await store.get('gov_latest', 'mospi-plfs-up');
  const ur = latest.rows.find((r) => r.indicator === 'Unemployment rate (%)' && r.area === 'Uttar Pradesh' && r.period === '2022-23');
  assert.equal(ur.value, 2.8);
  assert.equal(readdirSync(join(rawDir, 'mospi-plfs-up')).length, 1);
  const audit = await store.listAudit();
  assert.ok(audit.some((a) => a.action === 'gov.sync.ok' && a.entity_id === 'mospi-plfs-up'));
  const again = await syncGovSources(store, registry(), { env: env(), rawDir, force: true, only: 'mospi-plfs-up' });
  assert.equal(again[0].status, 'ok');
  const runs = (await store.list('gov_runs')).filter((r) => r.source_id === 'mospi-plfs-up').sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  assert.equal(runs[1].changed, false, 'identical response is recorded as unchanged');
  const st = await govStatus(store, registry(), { env: env() });
  assert.equal(st.feeds.find((f) => f.id === 'mospi-plfs-up').health.status, 'live');
});

test('data.gov.in: no key means no request; with key and resource ID it fetches; key never leaks', async () => {
  mode = 'ok';
  hits = [];
  const store = new MemoryStore({});
  const rawDir = mkdtempSync(join(tmpdir(), 'gov-'));
  const r1 = await syncGovSources(store, registry(), { env: env(), rawDir, force: true, only: 'ogd-iti-statewise' });
  assert.equal(r1[0].skipped, 'needs_key');
  assert.equal(hits.length, 0);
  const r2 = await syncGovSources(store, registry(), { env: env({ DATA_GOV_IN_API_KEY: 'TEST-KEY-123' }), rawDir, force: true, only: 'ogd-iti-statewise' });
  assert.equal(r2[0].skipped, 'needs_setup');
  const e3 = env({ DATA_GOV_IN_API_KEY: 'TEST-KEY-123', OGD_RESOURCE_ITI_STATEWISE: 'fixture-resource' });
  const r3 = await syncGovSources(store, registry(), { env: e3, rawDir, force: true, only: 'ogd-iti-statewise' });
  assert.equal(r3[0].status, 'ok');
  const st = await govStatus(store, registry(), { env: e3 });
  const all = JSON.stringify(st) + JSON.stringify(await store.list('gov_runs')) + JSON.stringify(await store.listAudit()) + readFileSync(join(rawDir, 'ogd-iti-statewise', readdirSync(join(rawDir, 'ogd-iti-statewise'))[0]), 'utf8');
  assert.ok(!all.includes('TEST-KEY-123'), 'API key must not be stored or shown');
  assert.equal(st.feeds.find((f) => f.id === 'ogd-iti-statewise').key_configured, true);
  const bad = await syncGovSources(store, registry(), { env: { ...e3, DATA_GOV_IN_API_KEY: 'WRONG' }, rawDir, force: true, only: 'ogd-iti-statewise' });
  assert.match(bad[0].error, /HTTP 403/);
});

test('failures: portal errors are "failing", connection errors are "unreachable", and last good data is kept', async () => {
  const store = new MemoryStore({});
  const rawDir = mkdtempSync(join(tmpdir(), 'gov-'));
  mode = 'ok';
  await syncGovSources(store, registry(), { env: env(), rawDir, force: true, only: 'mospi-plfs-up' });
  mode = 'error500';
  const r = await syncGovSources(store, registry(), { env: env(), rawDir, force: true, only: 'mospi-plfs-up' });
  assert.match(r[0].error, /HTTP 500/);
  let st = await govStatus(store, registry(), { env: env() });
  let f = st.feeds.find((x) => x.id === 'mospi-plfs-up');
  assert.equal(f.health.status, 'failing');
  assert.ok(f.health.last_success, 'last good data still dated');
  assert.equal(f.latest.rows.length, 12, 'previous figures kept');
  const dead = loadRegistry().map((s) => (s.base_url ? { ...s, base_url: 'http://127.0.0.1:9' } : s));
  const d = await syncGovSources(store, dead, { env: env(), rawDir, force: true, only: 'mospi-plfs-up' });
  assert.ok(isUnreachable(d[0].error), d[0].error);
  st = await govStatus(store, dead, { env: env() });
  assert.equal(st.feeds.find((x) => x.id === 'mospi-plfs-up').health.status, 'unreachable');
  mode = 'ok';
});

test('health rules: stale, agreement-only and not-yet-run sources', () => {
  const src = { id: 'x', connector: 'mospi_plfs', access: 'open_api', refresh_hours: 24 };
  const now = Date.parse('2026-10-16T12:00:00Z');
  const old = [{ status: 'ok', finished_at: '2026-10-13T12:00:00Z', rows: 5 }];
  assert.equal(feedHealth(src, old, { asOfMs: now, prereq: null }).status, 'stale');
  assert.equal(feedHealth(src, [], { asOfMs: now, prereq: null }).status, 'not_run');
  const ncs = loadRegistry().find((s) => s.id === 'ncs-vacancies');
  assert.equal(prerequisites(ncs, {}), 'agreement');
});

test('helpers find state codes and values in unfamiliar shapes', () => {
  assert.equal(findStateCode({ data: { states: [{ code: 9, name: 'Bihar' }, { code: 33, name: 'Uttar Pradesh' }] } }, 'Uttar Pradesh'), 33);
  assert.equal(rowValue({ year: '2023-24', state_code: 33, value: '3.1' }), 3.1);
  assert.equal(rowValue({ year: '2023-24', state_code: 33, ur: '4.2' }), 4.2);
});

test('API: status is public, manual sync is administrator-only', async () => {
  const { service } = makeService();
  const store = new MemoryStore({});
  const reg = registry();
  const gov = { status: () => govStatus(store, reg, { env: env() }), sync: (only) => syncGovSources(store, reg, { only, force: true, env: env(), rawDir: mkdtempSync(join(tmpdir(), 'gov-')) }) };
  const app = createServer(createApp({ service, users: loadUsers(join(ROOT, 'config/users.dev.json')), staticDir: join(ROOT, 'dist'), gov }));
  await new Promise((r) => app.listen(0, '127.0.0.1', r));
  const b = `http://127.0.0.1:${app.address().port}`;
  try {
    const s = await (await fetch(b + '/api/gov/status')).json();
    assert.equal(s.feeds.length, reg.length);
    assert.equal((await fetch(b + '/api/gov/sync', { method: 'POST', body: '{}' })).status, 403);
    const ok = await fetch(b + '/api/gov/sync', { method: 'POST', headers: { Authorization: 'Bearer dev-admin-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'mospi-plfs-up' }) });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).status.feeds.find((f) => f.id === 'mospi-plfs-up').health.status, 'live');
  } finally {
    app.close();
  }
});
