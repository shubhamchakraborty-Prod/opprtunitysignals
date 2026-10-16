// @ts-check
// Server entry point.
//   STORE=file (default)  data/runtime/db.json, seeded from data/seed on first run
//   STORE=memory          resets on restart (demos)
//   STORE=pg              PostgreSQL/PostGIS via DATABASE_URL
import { createServer } from 'node:http';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createService } from '../core/service.js';
import { MemoryStore } from '../core/store-memory.js';
import { FileStore } from './stores/file.js';
import { loadSeed, ROOT } from './seed.js';
import { loadUsers } from './auth.js';
import { createApp } from './app.js';
import { loadRegistry, govStatus, syncGovSources, startGovScheduler } from './gov/sync.js';

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';
const STORE = process.env.STORE || 'file';
const USERS_FILE = process.env.USERS_FILE || join(ROOT, 'config', 'users.dev.json');
const STATIC_DIR = process.env.STATIC_DIR || join(ROOT, 'dist');

async function main() {
  const seed = loadSeed();
  const seedData = { records: seed.records, flags: seed.flags, verifications: seed.verifications, interviews: seed.interviews, passouts: seed.passouts, settings: seed.settings };
  let store;
  if (STORE === 'pg') {
    if (!process.env.DATABASE_URL) throw new Error('STORE=pg needs DATABASE_URL');
    const { PgStore } = await import('./stores/pg.js');
    store = new PgStore(process.env.DATABASE_URL);
    await store.migrate();
    if (await store.isEmpty()) await store.loadSeed({ ...seedData, geometry: seed.geometry });
  } else if (STORE === 'memory') {
    store = new MemoryStore(seedData);
  } else {
    store = new FileStore(process.env.DATA_FILE || join(ROOT, 'data', 'runtime', 'db.json'), seedData);
  }
  const service = createService(/** @type {any} */ (store), { now: process.env.AS_OF ? () => /** @type {string} */ (process.env.AS_OF) : undefined, profiles: seed.profiles, geometry: seed.geometry, trades: seed.trades, courses: seed.courses, announcements: seed.announcements, regions: seed.regions });
  const users = loadUsers(USERS_FILE);
  if (!existsSync(join(STATIC_DIR, 'index.html'))) console.warn(`No built web app in ${STATIC_DIR}. Run "npm run build" first.`);
  const registry = loadRegistry();
  const gov = {
    status: () => govStatus(store, registry),
    sync: (only) => syncGovSources(store, registry, { only, force: true }),
  };
  if ((process.env.GOV_SYNC || (STORE === 'memory' ? 'off' : 'on')) === 'on') startGovScheduler(store, registry);
  const server = createServer(createApp({ service, users, staticDir: STATIC_DIR, gov }));
  server.listen(PORT, HOST, () => {
    const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
    console.log(`Noida 62/63 explorer on http://${HOST}:${addr.port}  (store=${STORE}, users=${users.length})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
