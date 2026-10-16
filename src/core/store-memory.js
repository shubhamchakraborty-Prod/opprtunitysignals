// @ts-check
// In-memory store. Used by the offline demo sandbox, the tests, and as the
// base of the JSON-file store. Async interface matches the PostgreSQL store.
import { clone } from './util.js';

export const COLLECTIONS = ['records', 'verifications', 'interviews', 'passouts', 'flags', 'gov_runs', 'gov_latest'];
export const keyOf = (coll, obj) => (coll === 'records' ? obj.source_id : obj.id);

export class MemoryStore {
  /** @param {{records?:any[],verifications?:any[],interviews?:any[],passouts?:any[],flags?:any[],settings?:Record<string,any>,audit?:any[]}} seed */
  constructor(seed = {}) {
    /** @type {Record<string, Map<string, any>>} */
    this.data = {};
    for (const c of COLLECTIONS) this.data[c] = new Map((seed[c] || []).map((o) => [keyOf(c, o), clone(o)]));
    this.settings = clone(seed.settings || {});
    this.audit = clone(seed.audit || []);
    /** @type {Map<string, any[]>} record history: source_id -> prior versions */
    this.history = new Map();
  }
  async list(coll) {
    return [...this.data[coll].values()].map(clone);
  }
  async get(coll, id) {
    return clone(this.data[coll].get(id) ?? null);
  }
  /** @param {string} coll @param {any} obj @param {string} [actorId] */
  async put(coll, obj, actorId = 'system') {
    const k = keyOf(coll, obj);
    if (coll === 'records' && this.data.records.has(k)) {
      const h = this.history.get(k) || [];
      h.push({ changed_at: new Date().toISOString(), changed_by: actorId, doc: clone(this.data.records.get(k)) });
      this.history.set(k, h);
    }
    this.data[coll].set(k, clone(obj));
    await this.persist();
    return clone(obj);
  }
  async putMany(coll, objs, actorId = 'system') {
    for (const o of objs) {
      const k = keyOf(coll, o);
      const cur = this.data[coll].get(k);
      if (cur && JSON.stringify(cur) === JSON.stringify(o)) continue;
      if (coll === 'records' && cur) {
        const h = this.history.get(k) || [];
        h.push({ changed_at: new Date().toISOString(), changed_by: actorId, doc: clone(cur) });
        this.history.set(k, h);
      }
      this.data[coll].set(k, clone(o));
    }
    await this.persist();
  }
  async recordHistory(id) {
    return clone(this.history.get(id) || []);
  }
  async getSetting(key, fallback = null) {
    return key in this.settings ? clone(this.settings[key]) : fallback;
  }
  async setSetting(key, value) {
    this.settings[key] = clone(value);
    await this.persist();
  }
  /** Append-only. There is deliberately no update or delete for audit entries. */
  async appendAudit(entry) {
    this.audit.push(Object.freeze(clone(entry)));
    await this.persist();
  }
  async listAudit(limit = 200) {
    return clone(this.audit.slice(-limit).reverse());
  }
  async persist() {}
  snapshot() {
    /** @type {Record<string, any>} */
    const out = { settings: this.settings, audit: this.audit, history: Object.fromEntries(this.history) };
    for (const c of COLLECTIONS) out[c] = [...this.data[c].values()];
    return clone(out);
  }
}
