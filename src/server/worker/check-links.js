// @ts-check
// Polite source-link checker. It only asks whether each source URL still
// resolves; it never scrapes page content, never logs in, honours robots.txt
// Disallow rules for "*", and waits between requests to the same host.
// A 2xx response does NOT mean a job is still open; only a human recheck
// updates last_rechecked_at. Failures can be raised as "broken_link" flags.
// Usage: npm run check-links [-- --apply]
import { openService, workerActor } from './runtime.js';

const APPLY = process.argv.includes('--apply');
const DELAY_MS = Number(process.env.LINKCHECK_DELAY_MS || 3000);
const UA = process.env.LINKCHECK_UA || 'Noida6263-SourceLinkCheck/1.0 (research pilot; HEAD requests only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Map<string,string[]>} */
const robotsCache = new Map();
async function disallowed(u) {
  if (!robotsCache.has(u.origin)) {
    let rules = [];
    try {
      const r = await fetch(u.origin + '/robots.txt', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        let applies = false;
        for (const line of (await r.text()).split(/\r?\n/)) {
          const [k, ...v] = line.split(':');
          const key = k.trim().toLowerCase(), val = v.join(':').trim();
          if (key === 'user-agent') applies = val === '*';
          else if (applies && key === 'disallow' && val) rules.push(val);
        }
      }
    } catch { /* unreachable robots.txt: treat as no rules */ }
    robotsCache.set(u.origin, rules);
  }
  return (robotsCache.get(u.origin) || []).some((p) => u.pathname.startsWith(p));
}

const { service, close } = await openService();
const actor = workerActor('check-links');
try {
  const recs = await service.listRecords({ id: 'worker', name: 'worker', role: 'researcher' }, { includeHistorical: true, includeUnclear: true });
  const lastHit = new Map();
  for (const r of recs) {
    const u = new URL(r.source_url);
    if (await disallowed(u)) { console.log(`SKIP  ${r.source_id} robots.txt disallows ${u.pathname}`); continue; }
    const wait = (lastHit.get(u.host) || 0) + DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(u.host, Date.now());
    let status = 0;
    try {
      const res = await fetch(r.source_url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
      status = res.status;
    } catch (e) {
      status = -1;
    }
    const ok = status >= 200 && status < 400;
    console.log(`${ok ? 'OK   ' : 'CHECK'} ${r.source_id} ${status} ${r.source_url}`);
    if (!ok && APPLY) await service.flagSource(actor, r.source_id, { type: 'broken_link', note: `Automated HEAD check returned ${status === -1 ? 'no response' : status}. Recheck manually; some sites block automated checks.` });
  }
  if (!APPLY) console.log('Dry run. Re-run with -- --apply to raise broken_link flags for follow-up.');
} finally {
  await close();
}
