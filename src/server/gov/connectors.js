// @ts-check
// Connectors for open government APIs. Read-only GET requests, identified
// user agent, timeouts, one polite retry. No scraping and no logins.
//
// MoSPI eSankhyiki: endpoint paths from NSO's official MIT-licensed client
// (github.com/nso-india/mospi-esankhyiki, esankhyiki/client.py). No key.
// data.gov.in: https://api.data.gov.in/resource/<id>?api-key=&format=json&limit=&offset=&filters[field]=value

const UA = process.env.GOV_SYNC_UA || 'Noida6263-OpportunityExplorer/1.0 (ConveGenius.AI research pilot)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET JSON with a timeout and one retry on 429/5xx. Errors carry a plain message. */
export async function getJson(url, { timeoutMs = 30000, fetchImpl = fetch } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        await sleep(Number(res.headers.get('retry-after')) * 1000 || 2000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`${new URL(url).host} did not return JSON`);
      }
    } catch (e) {
      const cause = /** @type {any} */ (e).cause;
      lastErr = new Error(cause?.code ? `${cause.code}: could not connect to ${new URL(url).host}` : /** @type {any} */ (e).message);
      if (/HTTP 4\d\d|did not return JSON/.test(lastErr.message)) break;
    }
  }
  throw lastErr;
}

const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString();

/** Depth-first search for an object that names the state; returns its *_code value. */
export function findStateCode(node, stateName) {
  const re = new RegExp('^\\s*' + stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
  let found = null;
  const walk = (n) => {
    if (found != null || n == null) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n === 'object') {
      const vals = Object.values(n);
      if (vals.some((v) => typeof v === 'string' && re.test(v))) {
        const key = Object.keys(n).find((k) => /state.*code|^code$|_code$/i.test(k));
        if (key) { found = n[key]; return; }
      }
      vals.forEach(walk);
    }
  };
  walk(node);
  return found;
}

/** Pick the numeric value field of a statistics row. */
export function rowValue(row) {
  for (const k of Object.keys(row)) if (/^(value|indicator_value|val|estimate)$/i.test(k) && row[k] !== '' && !Number.isNaN(Number(row[k]))) return Number(row[k]);
  const nums = Object.entries(row).filter(([k, v]) => !/code|year|id$/i.test(k) && v !== '' && v != null && !Number.isNaN(Number(v)));
  return nums.length ? Number(nums[nums.length - 1][1]) : null;
}
const rowYear = (row) => row.year ?? row.Year ?? row.survey_year ?? row.period ?? Object.entries(row).find(([k]) => /year/i.test(k))?.[1] ?? null;

/** MoSPI PLFS: resolve indicator and state codes, then fetch every year. */
/** @param {any} src @param {{fetchImpl?: any, env?: any}} [opts] */
export async function fetchMospiPlfs(src, { fetchImpl } = {}) {
  const p = src.params;
  const base = src.base_url.replace(/\/$/, '');
  const raw = {};
  const list = await getJson(`${base}/api/plfs/getIndicatorListByFrequency?${qs({ frequency_code: p.frequency_code })}`, { fetchImpl });
  raw.indicators = list;
  const items = Array.isArray(list?.data) ? list.data : [];
  const indicators = p.indicators.map((ind) => {
    const hit = items.find((x) => String(x.indicator_name || x.description || x.indicator || '').toLowerCase().includes(ind.match));
    return { ...ind, code: hit?.indicator_code ?? ind.fallback_code ?? null, name: hit?.indicator_name || hit?.description || ind.label };
  }).filter((x) => x.code != null);
  if (!indicators.length) throw new Error('None of the configured PLFS indicators were found in the indicator list');
  const filters = await getJson(`${base}/api/plfs/getFilterByIndicatorId?${qs({ indicator_code: indicators[0].code, frequency_code: p.frequency_code, year_type_code: p.year_type_code })}`, { fetchImpl });
  raw.filters = filters;
  const stateCode = findStateCode(filters, p.state_name);
  if (stateCode == null) throw new Error(`State "${p.state_name}" not found in the PLFS filter list`);
  const areas = [{ name: p.state_name, code: stateCode }, ...(p.compare_state_code != null ? [{ name: 'All India', code: p.compare_state_code }] : [])];
  const rows = [];
  raw.data = {};
  for (const ind of indicators) {
    for (const area of areas) {
      const params = { indicator_code: ind.code, frequency_code: p.frequency_code, year_type_code: p.year_type_code, state_code: area.code, gender_code: p.gender_code, age_code: p.age_code, sector_code: p.sector_code };
      const res = await getJson(`${base}/api/plfs/getData?${qs(params)}`, { fetchImpl });
      raw.data[`${ind.code}:${area.code}`] = res;
      for (const row of Array.isArray(res?.data) ? res.data : []) {
        rows.push({ indicator: ind.label, indicator_code: ind.code, area: area.name, period: rowYear(row) != null ? String(rowYear(row)) : null, value: rowValue(row), unit: '%', raw: row });
      }
      await sleep(Number(process.env.GOV_SYNC_DELAY_MS ?? 500));
    }
  }
  return { rows, raw, meta: { state_code: stateCode, indicators: indicators.map((i) => ({ code: i.code, name: i.name })) } };
}

/** data.gov.in resource: page through records (max 1,000 rows per sync). */
/** @param {any} src @param {{fetchImpl?: any, env?: any}} [opts] */
export async function fetchOgdResource(src, { env = process.env, fetchImpl } = {}) {
  const id = src.resource_id || env[src.resource_env];
  const key = env[src.key_env];
  const base = src.base_url.replace(/\/$/, '');
  const limit = src.params?.limit || 100;
  const rows = [];
  const raw = { pages: [] };
  let title = null, updated = null;
  for (let offset = 0; offset < 1000; offset += limit) {
    const params = { 'api-key': key, format: 'json', limit, offset };
    if (src.params?.filter_field && src.params?.filter_value) params[`filters[${src.params.filter_field}]`] = src.params.filter_value;
    const res = await getJson(`${base}/resource/${encodeURIComponent(id)}?${qs(params)}`, { fetchImpl });
    if (res?.status === 'error' || res?.error) throw new Error(`data.gov.in: ${res.message || res.error}`);
    raw.pages.push({ ...res, records: undefined, record_count: (res.records || []).length });
    title = res.title ?? title;
    updated = res.updated_date ?? res.updated ?? updated;
    const recs = res.records || [];
    for (const r of recs) rows.push({ raw: r });
    if (recs.length < limit) break;
    await sleep(Number(process.env.GOV_SYNC_DELAY_MS ?? 500));
  }
  return { rows, raw, meta: { resource_id: id, title, updated } };
}

export const CONNECTORS = { mospi_plfs: fetchMospiPlfs, ogd_resource: fetchOgdResource };
