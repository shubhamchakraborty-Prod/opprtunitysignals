// @ts-check
// Government data feeds: health status and summaries. Pure functions shared
// by the server, the sync worker and the browser.

export const FEED_STATUS = {
  live: { label: 'Live', tone: 'ok', help: 'Fetched successfully on schedule.' },
  stale: { label: 'Out of date', tone: 'warn', help: 'The last successful fetch is older than twice the refresh interval.' },
  failing: { label: 'Failing', tone: 'bad', help: 'The portal answered with an error on the last attempt.' },
  unreachable: { label: 'Cannot reach portal', tone: 'bad', help: 'The server could not connect. Usually a network rule or the portal is down.' },
  needs_key: { label: 'Needs API key', tone: 'plan', help: 'Add the portal’s API key to the server settings.' },
  needs_setup: { label: 'Needs dataset ID', tone: 'plan', help: 'Choose which dataset to track and add its resource ID.' },
  agreement: { label: 'Needs data-sharing agreement', tone: 'old', help: 'No open API. Data needs a formal request to the department.' },
  not_run: { label: 'Not checked yet', tone: 'old', help: 'Waiting for the first scheduled fetch.' },
};

/** Network-level errors mean "cannot reach", not "portal error". */
export function isUnreachable(err) {
  return /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_CONNECT|tunnel|proxy|403 Forbidden.*CONNECT|fetch failed|network|aborted|timeout/i.test(String(err || ''));
}

/**
 * Prerequisites a source needs before it can be fetched.
 * @param {any} src registry entry
 * @param {Record<string, string|undefined>} env
 */
export function prerequisites(src, env) {
  if (src.access === 'agreement' || !src.connector) return 'agreement';
  if (src.key_env && !env[src.key_env]) return 'needs_key';
  if (src.connector === 'ogd_resource' && !(src.resource_id || (src.resource_env && env[src.resource_env]))) return 'needs_setup';
  return null;
}

/**
 * Health of one source from its prerequisites and run history.
 * @param {any} src
 * @param {any[]} runs newest first
 * @param {{asOfMs:number, prereq:string|null}} ctx
 */
export function feedHealth(src, runs, { asOfMs, prereq }) {
  const last = runs[0] || null;
  const lastOk = runs.find((r) => r.status === 'ok') || null;
  const base = { last_attempt: last?.finished_at || null, last_success: lastOk?.finished_at || null, last_error: last && last.status !== 'ok' ? last.error : null, rows: lastOk?.rows ?? null, changed: lastOk?.changed ?? null };
  let status;
  if (prereq) status = prereq;
  else if (!last) status = 'not_run';
  else if (last.status !== 'ok') status = isUnreachable(last.error) ? 'unreachable' : 'failing';
  else {
    const age = (asOfMs - Date.parse(last.finished_at)) / 3600000;
    status = age > (src.refresh_hours || 24) * 2 ? 'stale' : 'live';
  }
  const nextDue = last ? new Date(Date.parse(last.finished_at) + (src.refresh_hours || 24) * 3600000).toISOString() : null;
  return { status, ...FEED_STATUS[status], ...base, next_due: prereq ? null : nextDue, history: runs.slice(0, 20).map((r) => ({ at: r.finished_at, ok: r.status === 'ok' })) };
}

/** Is a source due for a fetch? */
export function isDue(src, runs, nowMs, prereq) {
  if (prereq) return false;
  const last = runs[0];
  if (!last) return true;
  const waitH = last.status === 'ok' ? src.refresh_hours || 24 : Math.min(1, src.refresh_hours || 24);
  return nowMs - Date.parse(last.finished_at) >= waitH * 3600000;
}

/** Counts for the summary cards. */
export function feedSummary(feeds) {
  const by = (s) => feeds.filter((f) => s.includes(f.health.status)).length;
  return {
    total: feeds.length,
    live: by(['live']),
    attention: by(['stale', 'failing', 'unreachable']),
    setup: by(['needs_key', 'needs_setup', 'not_run']),
    agreement: by(['agreement']),
  };
}
