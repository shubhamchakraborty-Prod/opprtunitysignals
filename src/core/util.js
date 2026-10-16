// @ts-check
// Small pure helpers shared by browser and server.

/** @param {string|null|undefined} d */
export function toDate(d) {
  if (!d) return null;
  const t = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  return Number.isNaN(t.getTime()) ? null : t;
}

/** Whole days from a to b (b - a). */
export function daysBetween(a, b) {
  const x = toDate(a), y = toDate(b);
  if (!x || !y) return null;
  return Math.floor((y.getTime() - x.getTime()) / 86400000);
}

/** ISO date (YYYY-MM-DD) for a Date or now. */
export function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Human date, e.g. 16 Oct 2026. Deterministic (UTC) for tests and exports. */
export function fmtDate(d) {
  const t = toDate(d);
  if (!t) return 'Unknown';
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${t.getUTCDate()} ${m[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

/** Indian digit grouping: 1,23,456. */
export function fmtINR(n) {
  if (n == null) return '';
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return rest + ',' + last3;
}

export function normText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @template T @param {T} v @returns {T} */
export function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

export function uid(prefix) {
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${r}`;
}

export function isHttpUrl(u) {
  try {
    const x = new URL(String(u));
    return x.protocol === 'https:' || x.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Count occurrences into a sorted [key, n] list. */
export function tally(items) {
  const m = new Map();
  for (const k of items) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}
