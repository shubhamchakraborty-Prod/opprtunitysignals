// @ts-check
// Opens the configured store and service for command-line workers.
import { join } from 'node:path';
import { createService } from '../../core/service.js';
import { FileStore } from '../stores/file.js';
import { loadSeed, ROOT } from '../seed.js';

export async function openService() {
  const seed = loadSeed();
  const seedData = { records: seed.records, flags: seed.flags, verifications: seed.verifications, interviews: seed.interviews, passouts: seed.passouts, settings: seed.settings };
  let store;
  if (process.env.STORE === 'pg') {
    const { PgStore } = await import('../stores/pg.js');
    store = new PgStore(/** @type {string} */ (process.env.DATABASE_URL));
    await store.migrate();
  } else {
    store = new FileStore(process.env.DATA_FILE || join(ROOT, 'data', 'runtime', 'db.json'), seedData);
  }
  const service = createService(/** @type {any} */ (store), { profiles: seed.profiles, geometry: seed.geometry, trades: seed.trades, courses: seed.courses, announcements: seed.announcements, regions: seed.regions });
  return { store, service, close: async () => { if ('close' in store) await /** @type {any} */ (store).close(); } };
}

/** Workers act as a named system researcher so every change is attributable in the audit log. */
export const workerActor = (name) => ({ id: `worker:${name}`, name: `Worker (${name})`, role: /** @type {const} */ ('researcher') });
