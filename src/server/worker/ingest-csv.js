// @ts-check
// Provenance-first CSV ingestion. Rows enter as pending_review and appear in the
// Source review queue; nothing is published until a reviewer approves it.
// Usage: npm run ingest -- path/to/file.csv [--label "Manual capture 2026-11"]
import { readFileSync } from 'node:fs';
import { openService, workerActor } from './runtime.js';

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error('Usage: npm run ingest -- <file.csv> [--label "text"]');
  process.exit(2);
}
const li = rest.indexOf('--label');
const label = li >= 0 ? rest[li + 1] : `CSV ingest ${file}`;
const { service, close } = await openService();
try {
  const res = await service.importCsv(workerActor('ingest'), readFileSync(file, 'utf8'), { label });
  console.log(`Accepted for review: ${res.accepted.length} (${res.accepted.join(', ') || '-'})`);
  for (const r of res.rejected) console.log(`Rejected row ${r.row}${r.source_id ? ` (${r.source_id})` : ''}: ${r.errors.join('; ')}`);
  process.exitCode = res.rejected.length ? 1 : 0;
} finally {
  await close();
}
