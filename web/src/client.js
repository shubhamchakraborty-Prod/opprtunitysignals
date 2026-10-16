// Data client. Uses the API when the page is served by the pilot server;
// otherwise runs the identical service layer in the browser over embedded
// seed data (offline demo sandbox: nothing is saved or shared).
import { MemoryStore } from '../../src/core/store-memory.js';
import { createService } from '../../src/core/service.js';
import { ROLE_LABELS } from '../../src/core/rbac.js';

const TOKEN_KEY = 'noida6263-token';
const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.details = body?.details || [];
  }
}

function apiClient() {
  let token = ss.get(TOKEN_KEY);
  async function req(method, path, body, raw = false) {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined && typeof body !== 'string') headers['Content-Type'] = 'application/json';
    if (typeof body === 'string') headers['Content-Type'] = 'text/csv';
    const r = await fetch(path, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    if (!r.ok) throw new ApiError(r.status, await r.json().catch(() => ({})));
    return raw ? r.text() : r.json();
  }
  const q = (f) => '?' + new URLSearchParams(Object.entries(f || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString();
  return {
    mode: 'api',
    async signIn(t) {
      const prev = token;
      token = t;
      try {
        const s = await req('GET', 'api/session');
        ss.set(TOKEN_KEY, t);
        return s.actor;
      } catch (e) {
        token = prev;
        throw e;
      }
    },
    signOut() { token = null; ss.set(TOKEN_KEY, null); },
    bootstrap: () => req('GET', 'api/bootstrap'),
    getRecord: (id) => req('GET', `api/records/${encodeURIComponent(id)}`),
    reviewQueue: () => req('GET', 'api/review-queue'),
    importCsv: (text, opts) => req('POST', 'api/records/import' + q({ label: opts?.label }), text),
    reviewRecord: (id, body) => req('POST', `api/records/${encodeURIComponent(id)}/review`, body),
    flagSource: (id, body) => req('POST', `api/records/${encodeURIComponent(id)}/flags`, body),
    resolveFlag: (id, body) => req('POST', `api/flags/${encodeURIComponent(id)}/resolve`, body),
    queueOutreach: (id) => req('POST', `api/records/${encodeURIComponent(id)}/queue-outreach`, {}),
    expireRecord: (id, body) => req('POST', `api/records/${encodeURIComponent(id)}/expire`, body),
    resolveDuplicate: (c, body) => req('POST', `api/duplicates/${encodeURIComponent(c)}/resolve`, body),
    listVerifications: () => req('GET', 'api/verifications'),
    submitVerification: (body) => req('POST', 'api/verifications', body),
    decideVerification: (id, body) => req('POST', `api/verifications/${encodeURIComponent(id)}/decision`, body),
    submitInterview: (body) => req('POST', 'api/interviews', body),
    decideInterview: (id, body) => req('POST', `api/interviews/${encodeURIComponent(id)}/decision`, body),
    setSentimentEnabled: (enabled) => req('POST', 'api/settings/sentiment', { enabled }),
    setPassouts: (rows) => req('PUT', 'api/passouts', { rows }),
    auditLog: () => req('GET', 'api/audit'),
    exportRegister: (f) => req('GET', 'api/export/register.csv' + q(f), undefined, true),
    managementNote: (f) => req('GET', 'api/export/management-note.md' + q(f), undefined, true),
    govStatus: () => req('GET', 'api/gov/status'),
    govSync: (source) => req('POST', 'api/gov/sync', { source }),
  };
}

function localClient(seed) {
  const store = new MemoryStore({ records: seed.records, flags: seed.flags, verifications: seed.verifications, interviews: seed.interviews, passouts: seed.passouts, settings: seed.settings });
  const service = createService(store, { profiles: seed.profiles, geometry: seed.geometry, trades: seed.trades, courses: seed.courses, announcements: seed.announcements, regions: seed.regions });
  let actor = { id: 'sandbox-observer', name: 'Observer', role: 'observer' };
  const call = (m) => (...args) => service[m](actor, ...args);
  const methods = ['bootstrap', 'getRecord', 'reviewQueue', 'importCsv', 'reviewRecord', 'flagSource', 'resolveFlag', 'queueOutreach', 'expireRecord', 'resolveDuplicate', 'listVerifications', 'submitVerification', 'decideVerification', 'submitInterview', 'decideInterview', 'setSentimentEnabled', 'setPassouts', 'auditLog', 'exportRegister', 'managementNote'];
  const api = Object.fromEntries(methods.map((m) => [m, call(m)]));
  return {
    mode: 'local',
    ...api,
    govStatus: async () => seed.gov || { generated_at: null, feeds: [] },
    govSync: async () => { throw new Error('Checking sources needs the live server.'); },
    /** Sandbox role switch: no credentials, nothing persisted. */
    async signIn(role) {
      actor = { id: 'sandbox-' + role, name: ROLE_LABELS[role], role };
      return actor;
    },
    signOut() { actor = { id: 'sandbox-observer', name: 'Observer', role: 'observer' }; },
  };
}

/** @param {any} seed embedded seed bundle */
export async function createClient(seed) {
  if (/^https?:$/.test(location.protocol)) {
    try {
      const r = await fetch('api/health', { cache: 'no-store' });
      if (r.ok && (await r.json()).mode === 'api') return apiClient();
    } catch { /* no API: fall through to the offline sandbox */ }
  }
  return localClient(seed);
}
