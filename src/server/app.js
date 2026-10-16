// @ts-check
// HTTP API and static file server (node:http, no framework).
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { authenticate } from './auth.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.csv': 'text/csv; charset=utf-8' };
const MAX_BODY = 2 * 1024 * 1024;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
};

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...extra });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function json(req) {
  const t = await readBody(req);
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    throw Object.assign(new Error('Body must be valid JSON'), { status: 400 });
  }
}

const filtersFrom = (url) => Object.fromEntries(url.searchParams.entries());

/**
 * @param {{service:any, users:any[], staticDir:string}} deps
 */
export function createApp({ service, users, staticDir }) {
  /** @type {[string, RegExp, (ctx:any)=>Promise<any>][]} */
  const routes = [
    ['GET', /^\/api\/health$/, async () => ({ ok: true, mode: 'api', asOf: service.now() })],
    ['GET', /^\/api\/session$/, async ({ actor }) => service.session(actor)],
    ['GET', /^\/api\/bootstrap$/, async ({ actor }) => service.bootstrap(actor)],
    ['GET', /^\/api\/records$/, async ({ actor, url }) => service.listRecords(actor, filtersFrom(url))],
    ['GET', /^\/api\/records\/([\w.-]+)$/, async ({ actor, m }) => service.getRecord(actor, m[1])],
    ['GET', /^\/api\/analytics$/, async ({ actor, url }) => service.analytics(actor, filtersFrom(url))],
    ['GET', /^\/api\/review-queue$/, async ({ actor }) => service.reviewQueue(actor)],
    ['POST', /^\/api\/records\/import$/, async ({ actor, req, url }) => service.importCsv(actor, await readBody(req), { label: url.searchParams.get('label') || 'CSV upload' })],
    ['POST', /^\/api\/records\/([\w.-]+)\/review$/, async ({ actor, req, m }) => service.reviewRecord(actor, m[1], await json(req))],
    ['POST', /^\/api\/records\/([\w.-]+)\/flags$/, async ({ actor, req, m }) => service.flagSource(actor, m[1], await json(req))],
    ['POST', /^\/api\/records\/([\w.-]+)\/queue-outreach$/, async ({ actor, m }) => service.queueOutreach(actor, m[1])],
    ['POST', /^\/api\/records\/([\w.-]+)\/expire$/, async ({ actor, req, m }) => service.expireRecord(actor, m[1], await json(req))],
    ['POST', /^\/api\/flags\/([\w.-]+)\/resolve$/, async ({ actor, req, m }) => service.resolveFlag(actor, m[1], await json(req))],
    ['POST', /^\/api\/duplicates\/([\w.-]+)\/resolve$/, async ({ actor, req, m }) => service.resolveDuplicate(actor, m[1], await json(req))],
    ['GET', /^\/api\/verifications$/, async ({ actor }) => service.listVerifications(actor)],
    ['POST', /^\/api\/verifications$/, async ({ actor, req }) => service.submitVerification(actor, await json(req))],
    ['POST', /^\/api\/verifications\/([\w.-]+)\/decision$/, async ({ actor, req, m }) => service.decideVerification(actor, m[1], await json(req))],
    ['POST', /^\/api\/interviews$/, async ({ actor, req }) => service.submitInterview(actor, await json(req))],
    ['POST', /^\/api\/interviews\/([\w.-]+)\/decision$/, async ({ actor, req, m }) => service.decideInterview(actor, m[1], await json(req))],
    ['POST', /^\/api\/settings\/sentiment$/, async ({ actor, req }) => service.setSentimentEnabled(actor, (await json(req)).enabled)],
    ['PUT', /^\/api\/passouts$/, async ({ actor, req }) => service.setPassouts(actor, (await json(req)).rows)],
    ['GET', /^\/api\/audit$/, async ({ actor, url }) => service.auditLog(actor, Math.min(1000, Number(url.searchParams.get('limit')) || 200))],
  ];

  return async function handler(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) {
        const { actor, error } = authenticate(req.headers.authorization, users);
        if (!actor) return send(res, 401, { error });
        if (req.method === 'GET' && url.pathname === '/api/export/register.csv') {
          return send(res, 200, await service.exportRegister(actor, filtersFrom(url)), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="Noida_62_63_source_register.csv"' });
        }
        if (req.method === 'GET' && url.pathname === '/api/export/management-note.md') {
          return send(res, 200, await service.managementNote(actor, filtersFrom(url)), 'text/markdown; charset=utf-8', { 'Content-Disposition': 'attachment; filename="Noida_62_63_management_note.md"' });
        }
        for (const [method, re, fn] of routes) {
          const m = re.exec(url.pathname);
          if (m && method === req.method) return send(res, 200, await fn({ actor, req, url, m }));
        }
        return send(res, 404, { error: 'Not found' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
      const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
      const file = normalize(join(staticDir, rel));
      if (!file.startsWith(normalize(staticDir)) || !existsSync(file) || !statSync(file).isFile()) return send(res, 404, 'Not found', 'text/plain');
      return send(res, 200, await readFile(file), MIME[extname(file)] || 'application/octet-stream', { 'Cache-Control': 'no-cache' });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      return send(res, status, { error: status === 500 ? 'Internal error' : e.message, details: e.details || [] });
    }
  };
}
