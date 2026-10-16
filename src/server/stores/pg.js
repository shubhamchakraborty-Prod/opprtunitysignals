// @ts-check
// PostgreSQL / PostGIS store. Same async interface as MemoryStore.
// Record history is captured by a database trigger; the audit log is
// append-only (enforced by trigger).
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLE = { records: 'evidence_records', verifications: 'verifications', interviews: 'interviews', passouts: 'passouts', flags: 'source_flags', gov_runs: 'gov_runs', gov_latest: 'gov_latest' };
const KEY = { records: 'source_id' };
const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

export class PgStore {
  /** @param {string} connectionString */
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString, max: 5 });
  }

  async migrate() {
    await this.pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await this.pool.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
    for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(readFileSync(join(MIGRATIONS, f), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  }

  /** Load approximate sector areas (centre + radius buffer). */
  async seedSectorAreas(geometry) {
    for (const [sector, g] of Object.entries(geometry.sectors)) {
      await this.pool.query(
        `INSERT INTO sector_areas (sector, area, is_approximate, source_note)
         VALUES ($1, ST_Buffer(ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4)::geography, true, $5)
         ON CONFLICT (sector) DO UPDATE SET area = EXCLUDED.area, source_note = EXCLUDED.source_note`,
        [sector, g.centre[0], g.centre[1], g.radius_m, geometry.note],
      );
    }
  }

  /** Which pilot sector area (if any) covers a point. Used to check geocodes. */
  async sectorForPoint(lat, lon) {
    const r = await this.pool.query('SELECT sector FROM sector_areas WHERE ST_Covers(area, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) ORDER BY sector LIMIT 1', [lat, lon]);
    return r.rows[0]?.sector ?? null;
  }

  async list(coll) {
    const r = await this.pool.query(`SELECT doc FROM ${TABLE[coll]} ORDER BY ${KEY[coll] || 'id'}`);
    return r.rows.map((x) => x.doc);
  }

  async get(coll, id) {
    const r = await this.pool.query(`SELECT doc FROM ${TABLE[coll]} WHERE ${KEY[coll] || 'id'} = $1`, [id]);
    return r.rows[0]?.doc ?? null;
  }

  async put(coll, obj, actorId = 'system') {
    if (coll === 'records') {
      const g = obj.geo || {};
      const point = g.geocode_verified && g.lat != null && g.lon != null;
      await this.pool.query(
        `INSERT INTO evidence_records (source_id, doc, captured_at, location, updated_at, updated_by)
         VALUES ($1, $2, $3, CASE WHEN $4 THEN ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography ELSE NULL END, now(), $7)
         ON CONFLICT (source_id) DO UPDATE SET doc = EXCLUDED.doc, location = EXCLUDED.location, updated_at = now(), updated_by = EXCLUDED.updated_by`,
        [obj.source_id, obj, obj.captured_at, point, g.lat ?? null, g.lon ?? null, actorId],
      );
    } else {
      await this.pool.query(`INSERT INTO ${TABLE[coll]} (id, doc) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`, [obj.id, obj]);
    }
    return obj;
  }

  async putMany(coll, objs, actorId = 'system') {
    for (const o of objs) {
      const cur = await this.get(coll, coll === 'records' ? o.source_id : o.id);
      if (cur && JSON.stringify(cur) === JSON.stringify(o)) continue;
      await this.put(coll, o, actorId);
    }
  }

  async recordHistory(id) {
    const r = await this.pool.query('SELECT doc, changed_at, changed_by FROM evidence_record_history WHERE source_id = $1 ORDER BY id', [id]);
    return r.rows.map((x) => ({ changed_at: x.changed_at.toISOString(), changed_by: x.changed_by, doc: x.doc }));
  }

  async getSetting(key, fallback = null) {
    const r = await this.pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return r.rows.length ? r.rows[0].value : fallback;
  }

  async setSetting(key, value) {
    await this.pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, JSON.stringify(value)]);
  }

  async appendAudit(e) {
    await this.pool.query(
      'INSERT INTO audit_log (id, at, actor_id, actor_role, action, entity_type, entity_id, summary, details) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [e.id, e.at, e.actor_id, e.actor_role, e.action, e.entity_type, e.entity_id, e.summary, e.details || {}],
    );
  }

  async listAudit(limit = 200) {
    const r = await this.pool.query('SELECT id, at, actor_id, actor_role, action, entity_type, entity_id, summary, details FROM audit_log ORDER BY seq DESC LIMIT $1', [limit]);
    return r.rows.map((x) => ({ ...x, at: x.at.toISOString() }));
  }

  async isEmpty() {
    const r = await this.pool.query('SELECT count(*)::int AS n FROM evidence_records');
    return r.rows[0].n === 0;
  }

  /** Load seed fixtures into an empty database. */
  async loadSeed(seed) {
    for (const c of ['records', 'verifications', 'interviews', 'passouts', 'flags']) for (const o of seed[c] || []) await this.put(c, o, 'seed');
    for (const [k, v] of Object.entries(seed.settings || {})) await this.setSetting(k, v);
    if (seed.geometry) await this.seedSectorAreas(seed.geometry);
  }

  async close() {
    await this.pool.end();
  }
}
