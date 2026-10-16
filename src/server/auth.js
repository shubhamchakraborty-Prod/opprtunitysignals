// @ts-check
// Bearer-token authentication for the pilot. Tokens are stored only as SHA-256
// hashes. Unauthenticated requests act as a public observer (read-only).
// Production should replace this with the organisation's SSO (OIDC/SAML).
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { ANONYMOUS, PERMISSIONS } from '../core/rbac.js';

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

/**
 * @param {string} file JSON array of {id, name, role, token_sha256}
 */
export function loadUsers(file) {
  if (!existsSync(file)) return [];
  const users = JSON.parse(readFileSync(file, 'utf8'));
  for (const u of users) {
    if (!PERMISSIONS[u.role]) throw new Error(`Unknown role ${u.role} for user ${u.id}`);
    if (!/^[a-f0-9]{64}$/.test(u.token_sha256 || '')) throw new Error(`User ${u.id} needs a token_sha256`);
  }
  return users;
}

/**
 * Resolve the acting user from an Authorization header.
 * @param {string|undefined} header
 * @param {{id:string,name:string,role:string,token_sha256:string}[]} users
 * @returns {{actor: any, error?: string}}
 */
export function authenticate(header, users) {
  if (!header) return { actor: ANONYMOUS };
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return { actor: null, error: 'Malformed Authorization header' };
  const h = Buffer.from(sha256(m[1].trim()), 'hex');
  const u = users.find((x) => {
    const b = Buffer.from(x.token_sha256, 'hex');
    return b.length === h.length && timingSafeEqual(b, h);
  });
  if (!u) return { actor: null, error: 'Unknown or expired token' };
  return { actor: { id: u.id, name: u.name, role: u.role } };
}
