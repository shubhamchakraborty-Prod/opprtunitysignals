// @ts-check
// Loads seed fixtures from data/seed. Used by the server, the PostgreSQL
// seeder, the web build and the tests.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'data', 'seed', f), 'utf8'));
const readIf = (f) => (existsSync(join(ROOT, 'data', 'seed', f)) ? read(f) : null);

export function loadSeed() {
  return {
    records: read('evidence_records.json'),
    flags: read('source_flags.json'),
    verifications: read('verifications.json'),
    interviews: read('interviews.json'),
    passouts: read('passouts.json'),
    settings: read('settings.json'),
    profiles: read('learner_profiles.json'),
    geometry: read('sector_geometry.json'),
    trades: read('iti_trades.json'),
    courses: read('course_map.json'),
    announcements: read('announcements.json'),
    regions: read('regions.json'),
    saa: read('saa_catalogue.json'),
    providers: readIf('provider_scan.json'),
    market: readIf('market.json'),
    demand: readIf('demand.json'),
    programmes: readIf('programmes.json'),
  };
}
