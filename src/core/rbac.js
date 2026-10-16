// @ts-check
// Role-based access control. Enforced in the service layer so the API and the
// offline demo sandbox apply identical rules.

export const PERMISSIONS = {
  observer: ['read:public', 'export:public'],
  researcher: ['read:public', 'export:public', 'read:review', 'ingest:csv', 'review:record', 'review:dedupe', 'flag:source', 'queue:outreach', 'interview:submit', 'read:audit'],
  employer_verifier: ['read:public', 'export:public', 'read:review', 'verify:submit', 'read:contacts', 'flag:source', 'queue:outreach'],
  administrator: [
    'read:public', 'export:public', 'read:review', 'ingest:csv', 'review:record', 'review:dedupe', 'flag:source', 'queue:outreach',
    'verify:submit', 'verify:approve', 'read:contacts', 'interview:submit', 'interview:approve', 'admin:sentiment', 'admin:passouts', 'read:audit', 'expire:record',
  ],
};

export const ROLE_LABELS = {
  observer: 'Observer (public view)',
  researcher: 'Researcher',
  employer_verifier: 'Employer verifier',
  administrator: 'Administrator',
};

/** @typedef {{id:string,name:string,role:keyof typeof PERMISSIONS}} Actor */

/** @type {Actor} */
export const ANONYMOUS = { id: 'anonymous', name: 'Public observer', role: 'observer' };

export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

/** @param {Actor} actor @param {string} perm */
export function can(actor, perm) {
  return (PERMISSIONS[actor?.role] || []).includes(perm);
}

/** @param {Actor} actor @param {string} perm */
export function requirePerm(actor, perm) {
  if (!can(actor, perm)) throw new ForbiddenError(`${ROLE_LABELS[actor?.role] || 'This role'} cannot perform "${perm}".`);
}
