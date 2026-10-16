// @ts-check
// Fetch government data feeds now and write a public snapshot for the offline
// and claude.ai builds (data/gov/snapshot.json).
// Usage: npm run gov:sync [-- --source mospi-plfs-up] [-- --due-only]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openService } from './runtime.js';
import { loadRegistry, syncGovSources, govStatus } from '../gov/sync.js';
import { ROOT } from '../seed.js';

const args = process.argv.slice(2);
const si = args.indexOf('--source');
const only = si >= 0 ? args[si + 1] : null;
const { store, close } = await openService();
try {
  const registry = loadRegistry();
  const results = await syncGovSources(store, registry, { only, force: !args.includes('--due-only') });
  for (const r of results) console.log(`${r.id.padEnd(22)} ${r.status || 'skipped: ' + r.skipped}${r.rows ? ` (${r.rows} rows)` : ''}${r.error ? ` - ${r.error}` : ''}`);
  const snap = await govStatus(store, registry, { env: {} });
  mkdirSync(join(ROOT, 'data', 'gov'), { recursive: true });
  writeFileSync(join(ROOT, 'data', 'gov', 'snapshot.json'), JSON.stringify(snap, null, 1));
  console.log('Snapshot written to data/gov/snapshot.json');
} finally {
  await close();
}
