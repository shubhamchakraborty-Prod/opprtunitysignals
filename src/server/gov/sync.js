// @ts-check
// Government feed sync: run due connectors, keep every raw response on disk
// with a hash, store the latest normalised rows and a run log, and audit it.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { CONNECTORS } from './connectors.js';
import { prerequisites, isDue, feedHealth } from '../../core/govdata.js';
import { ROOT } from '../seed.js';

export function loadRegistry(file = process.env.GOV_SOURCES_FILE || join(ROOT, 'config', 'gov-sources.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export const SYNC_ACTOR = { id: 'worker:gov-sync', name: 'Government data sync', role: 'administrator' };

async function runsFor(store, id) {
  return (await store.list('gov_runs')).filter((r) => r.source_id === id).sort((a, b) => b.finished_at.localeCompare(a.finished_at));
}

/**
 * Sync government sources.
 * @param {any} store
 * @param {any[]} registry
 * @param {{only?:string|null, force?:boolean, env?:Record<string,string|undefined>, rawDir?:string, fetchImpl?:any, actor?:any}} opts
 */
export async function syncGovSources(store, registry, opts = {}) {
  const env = opts.env || process.env;
  const rawDir = opts.rawDir || env.GOV_RAW_DIR || join(ROOT, 'data', 'gov', 'raw');
  const actor = opts.actor || SYNC_ACTOR;
  const results = [];
  for (const src of registry) {
    if (opts.only && src.id !== opts.only) continue;
    const prereq = prerequisites(src, env);
    const runs = await runsFor(store, src.id);
    if (prereq) { results.push({ id: src.id, skipped: prereq }); continue; }
    if (!opts.force && !isDue(src, runs, Date.now(), prereq)) { results.push({ id: src.id, skipped: 'not_due' }); continue; }
    const started = new Date().toISOString();
    const run = { id: `RUN-${src.id}-${Date.now()}`, source_id: src.id, started_at: started, finished_at: null, status: 'error', rows: 0, error: null, content_sha256: null, changed: null, raw_file: null };
    try {
      const out = await CONNECTORS[src.connector](src, { env, fetchImpl: opts.fetchImpl });
      const body = JSON.stringify(out.raw);
      run.content_sha256 = createHash('sha256').update(body).digest('hex');
      const prevOk = runs.find((r) => r.status === 'ok');
      run.changed = prevOk ? prevOk.content_sha256 !== run.content_sha256 : true;
      mkdirSync(join(rawDir, src.id), { recursive: true });
      run.raw_file = join(src.id, started.replace(/[:.]/g, '-') + '.json');
      writeFileSync(join(rawDir, run.raw_file), body);
      run.rows = out.rows.length;
      run.status = 'ok';
      await store.put('gov_latest', { id: src.id, fetched_at: started, meta: out.meta, rows: out.rows.slice(0, 2000), content_sha256: run.content_sha256 });
    } catch (e) {
      run.error = String(/** @type {any} */ (e).message || e).slice(0, 300);
    }
    run.finished_at = new Date().toISOString();
    await store.put('gov_runs', run);
    await store.appendAudit({ id: `AUD-${run.id}`, at: run.finished_at, actor_id: actor.id, actor_role: actor.role, action: `gov.sync.${run.status}`, entity_type: 'gov_source', entity_id: src.id, summary: run.status === 'ok' ? `Fetched ${run.rows} rows from ${src.portal}${run.changed ? ' (changed)' : ' (no change)'}` : `Fetch from ${src.portal} failed: ${run.error}`, details: { sha256: run.content_sha256 } });
    results.push({ id: src.id, status: run.status, rows: run.rows, error: run.error });
  }
  return results;
}

/**
 * Public status for the dashboard: registry facts, health, latest rows.
 * Never exposes key values, only whether a key is configured.
 */
export async function govStatus(store, registry, { env = process.env, rowLimit = 400 } = {}) {
  const asOfMs = Date.now();
  const runs = await store.list('gov_runs');
  const latest = await store.list('gov_latest');
  return {
    generated_at: new Date(asOfMs).toISOString(),
    feeds: registry.map((src) => {
      const r = runs.filter((x) => x.source_id === src.id).sort((a, b) => b.finished_at.localeCompare(a.finished_at));
      const prereq = prerequisites(src, env);
      const l = latest.find((x) => x.id === src.id) || null;
      return {
        id: src.id, name: src.name, what: src.what, portal: src.portal, publisher: src.publisher, access: src.access, terms: src.terms, setup: src.setup || null,
        portal_url: src.portal_url, docs_url: src.docs_url || null, refresh_hours: src.refresh_hours, key_env: src.key_env || null, resource_env: src.resource_env || null,
        key_configured: src.key_env ? !!env[src.key_env] : null,
        health: feedHealth(src, r, { asOfMs, prereq }),
        latest: l ? { fetched_at: l.fetched_at, meta: l.meta, rows: l.rows.slice(0, rowLimit).map((x) => (src.connector === 'mospi_plfs' ? { indicator: x.indicator, area: x.area, period: x.period, value: x.value, unit: x.unit } : x)) } : null,
      };
    }),
  };
}

/** Background scheduler: checks every 15 minutes which sources are due. */
export function startGovScheduler(store, registry, { intervalMs = 15 * 60 * 1000, log = console.log } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const res = await syncGovSources(store, registry);
      const done = res.filter((r) => r.status);
      if (done.length) log(`[gov-sync] ${done.map((r) => `${r.id}: ${r.status}${r.error ? ' (' + r.error + ')' : ''}`).join('; ')}`);
    } catch (e) {
      log('[gov-sync] error ' + e);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 5000);
  return setInterval(tick, intervalMs);
}
