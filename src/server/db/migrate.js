// @ts-check
// Apply SQL migrations to DATABASE_URL.
import { PgStore } from '../stores/pg.js';
const store = new PgStore(/** @type {string} */ (process.env.DATABASE_URL));
await store.migrate();
console.log('Migrations applied.');
await store.close();
