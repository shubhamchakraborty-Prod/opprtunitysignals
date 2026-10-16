// @ts-check
// Load seed fixtures into an empty PostgreSQL database.
import { PgStore } from '../stores/pg.js';
import { loadSeed } from '../seed.js';
const store = new PgStore(/** @type {string} */ (process.env.DATABASE_URL));
await store.migrate();
if (await store.isEmpty()) {
  await store.loadSeed(loadSeed());
  console.log('Seed loaded.');
} else console.log('Database already has records; seed skipped.');
await store.close();
