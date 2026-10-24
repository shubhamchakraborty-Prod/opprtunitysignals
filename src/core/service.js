// @ts-check
// Application service: every use case, with RBAC, validation, human approval
// and an append-only audit trail. Runs unchanged on the server (file or
// PostgreSQL store) and in the browser's offline demo sandbox (memory store).
import { normalizeRecord, validateRecord, redactRecord, fromRegisterRow, toRegisterRow, REGISTER_COLUMNS } from './schema.js';
import { assignClusters, representatives } from './dedupe.js';
import { requirePerm, can, ForbiddenError, PERMISSIONS } from './rbac.js';
import { parseCsv, toCsv } from './csv.js';
import { coerceFilters, filterOpportunities, isInScope, isOlder } from './filters.js';
import { computeKpis, rolePrevalence, requirementFrequencies, sourceCoverage, requirementTrend, sentimentSummary, demandCoverage, verifiedOpeningsByTrade, freshness } from './analytics.js';
import { planningTier } from './decisions.js';
import { buildManagementNote } from './note.js';
import { isoDate, toDate, uid, isHttpUrl, daysBetween } from './util.js';
import { CONSENT_BASES, SOURCE_FLAG_TYPES, INTERVIEW_THEMES, PILOT_SECTORS, STALE_AFTER_DAYS, VERIFICATION_VALID_DAYS, OCCUPATION_FAMILIES, LOCATION_PRECISION } from './constants.js';

export class ValidationError extends Error {
  /** @param {string} message @param {string[]} [details] */
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

export const TRADES = ['electronics_mechanic', 'fitter', 'machinist', 'turner', 'copa', 'electrician', 'non_iti'];
export const VERIFICATION_METHODS = ['phone', 'email', 'in_person', 'employer_letter'];
export const VERIFICATION_OUTCOMES = ['confirmed', 'contradicted', 'filled_or_closed', 'no_response'];

/**
 * @param {import('./store-memory.js').MemoryStore} store
 * @param {{now?:()=>string, profiles?:any[], geometry?:any, trades?:any, courses?:any, announcements?:any, regions?:any, saa?:any, providers?:any, market?:any, demand?:any, programmes?:any}} [opts]
 */
export function createService(store, opts = {}) {
  const now = opts.now || (() => isoDate());
  const stamp = () => new Date().toISOString();

  async function audit(actor, action, entity_type, entity_id, summary, details = {}) {
    await store.appendAudit({ id: uid('AUD'), at: stamp(), actor_id: actor.id, actor_role: actor.role, action, entity_type, entity_id, summary, details });
  }

  /** Recompute dedupe clusters over all records and persist any changes. */
  async function recluster(actor) {
    const all = (await store.list('records')).map(normalizeRecord);
    await store.putMany('records', assignClusters(all), actor.id);
  }

  async function records() {
    return (await store.list('records')).map(normalizeRecord);
  }

  async function mustGetRecord(id) {
    const r = await store.get('records', id);
    if (!r) throw new NotFoundError(`Record ${id} not found`);
    return normalizeRecord(r);
  }

  async function saveRecord(actor, r) {
    const errs = validateRecord(r);
    if (errs.length) throw new ValidationError('Record failed validation', errs);
    await store.put('records', r, actor.id);
  }

  const readable = (actor, list) => list.filter((r) => can(actor, 'read:review') || r.review.state === 'approved').map((r) => redactRecord(r, can(actor, 'read:contacts')));

  function redactVerification(actor, v) {
    if (can(actor, 'read:contacts')) return v;
    return { ...v, contact: v.contact ? { name: '[restricted]', designation: '[restricted]', channel: '[restricted]' } : null };
  }

  async function settings() {
    return { sentimentEnabled: !!(await store.getSetting('sentimentEnabled', false)) };
  }

  const service = {
    now,

    async session(actor) {
      return { actor, permissions: PERMISSIONS[actor.role] || [] };
    },

    /** Everything the UI needs for one render cycle. */
    async bootstrap(actor) {
      requirePerm(actor, 'read:public');
      const all = await records();
      const verifs = await store.list('verifications');
      const interviews = await store.list('interviews');
      const s = await settings();
      return {
        asOf: now(),
        actor,
        permissions: PERMISSIONS[actor.role] || [],
        records: readable(actor, all),
        pendingVerifications: verifs.filter((v) => v.approval?.state === 'pending').map((v) => ({ id: v.id, outcome: v.outcome, approval: v.approval, work_location: { sector: v.work_location?.sector ?? null }, roles: (v.roles || []).map((r) => ({ openings: r.openings, trade: r.trade })) })),
        passouts: (await store.list('passouts')).filter((p) => p.approved),
        sentiment: sentimentSummary(interviews, { enabled: s.sentimentEnabled }),
        settings: s,
        profiles: opts.profiles || [],
        geometry: opts.geometry || null,
        trades: opts.trades || null,
        courses: opts.courses || null,
        announcements: opts.announcements || null,
        regions: opts.regions || null,
        saa: opts.saa || null,
        providers: opts.providers || null,
        market: opts.market || null,
        demand: opts.demand || null,
        programmes: opts.programmes || null,
      };
    },

    async listRecords(actor, filters) {
      requirePerm(actor, 'read:public');
      const f = coerceFilters(filters);
      const all = await records();
      const vis = filterOpportunities(all, f);
      return representatives(vis).map((r) => redactRecord({ ...r, mirrors: vis.filter((x) => x.dedupe_cluster === r.dedupe_cluster && x.source_id !== r.source_id).map((x) => x.source_id) }, can(actor, 'read:contacts')));
    },

    async getRecord(actor, id) {
      requirePerm(actor, 'read:public');
      const r = await mustGetRecord(id);
      if (r.review.state !== 'approved' && !can(actor, 'read:review')) throw new NotFoundError(`Record ${id} not found`);
      return { record: redactRecord(r, can(actor, 'read:contacts')), history: can(actor, 'read:review') ? await store.recordHistory(id) : [] };
    },

    async analytics(actor, filters) {
      requirePerm(actor, 'read:public');
      const f = coerceFilters(filters);
      const all = (await records()).filter((r) => r.review.state === 'approved');
      const asOf = now();
      const verifs = await store.list('verifications');
      const s = await settings();
      return {
        asOf,
        filters: f,
        kpis: computeKpis(all, f, { asOf, pendingVerifications: verifs }),
        prevalence: { '62': rolePrevalence(all, '62'), '63': rolePrevalence(all, '63') },
        requirements: { '62': requirementFrequencies(all, '62', asOf), '63': requirementFrequencies(all, '63', asOf) },
        coverage: { '62': sourceCoverage(all, '62'), '63': sourceCoverage(all, '63') },
        trend: requirementTrend(all),
        sentiment: sentimentSummary(await store.list('interviews'), { enabled: s.sentimentEnabled }),
        demandCoverage: demandCoverage(verifiedOpeningsByTrade(all, asOf), (await store.list('passouts')).filter((p) => p.approved)),
      };
    },

    async reviewQueue(actor) {
      requirePerm(actor, 'read:review');
      const all = await records();
      const asOf = now();
      const flags = (await store.list('flags')).filter((x) => x.status === 'open');
      const verifs = (await store.list('verifications')).map((v) => redactVerification(actor, v));
      const approved = all.filter((r) => r.review.state === 'approved');
      const clusters = new Map();
      for (const r of approved.filter((x) => x.duplicate_status === 'possible_duplicate')) {
        if (!clusters.has(r.dedupe_cluster)) clusters.set(r.dedupe_cluster, []);
        clusters.get(r.dedupe_cluster).push(r);
      }
      const latestVerif = new Map();
      for (const v of verifs.filter((x) => x.record_id).sort((a, b) => String(a.verified_at).localeCompare(String(b.verified_at)))) latestVerif.set(v.record_id, v);
      const flagged = (types) => flags.filter((x) => types.includes(x.type)).map((x) => ({ flag: x, record: all.find((r) => r.source_id === x.source_id) || null }));
      const stale = approved.filter((r) => !isOlder(r) && (daysBetween(r.last_rechecked_at || r.captured_at, asOf) ?? 0) > STALE_AFTER_DAYS);
      const pastExpiry = approved.filter((r) => !isOlder(r) && r.expiry && r.expiry < asOf);
      const staleVerification = approved.filter((r) => r.verification_status === 'employer_confirmed' && (daysBetween(r.verified_at, asOf) ?? 0) > VERIFICATION_VALID_DAYS);
      return {
        asOf,
        pendingReview: all.filter((r) => r.review.state === 'pending_review').map((r) => redactRecord(r, can(actor, 'read:contacts'))),
        awaitingEmployerCheck: approved
          .filter((r) => isInScope(r) && !isOlder(r) && ['observed_public', 'pending_employer_check'].includes(r.verification_status) && r.evidence_type !== 'employer_presence')
          .map((r) => ({ record: r, tier: planningTier(r, asOf), lastAttempt: latestVerif.get(r.source_id) || null }))
          .sort((a, b) => (a.tier.tier === b.tier.tier ? a.record.source_id.localeCompare(b.record.source_id) : a.tier.tier === 'outreach_priority' ? -1 : 1)),
        duplicates: [...clusters.entries()].map(([cluster, members]) => ({ cluster, members })),
        unverifiable: [
          ...flagged(['unverifiable']),
          ...[...latestVerif.values()].filter((v) => v.outcome === 'no_response' && v.approval?.state === 'approved').map((v) => ({ flag: { id: v.id, type: 'no_response', note: `No employer response on ${v.verified_at}`, source_id: v.record_id }, record: all.find((r) => r.source_id === v.record_id) || null })),
        ],
        expired: {
          marked: approved.filter((r) => r.verification_status === 'expired'),
          possiblyClosed: flagged(['possibly_closed']),
          pastExpiry,
          stale,
          staleVerification,
        },
        followups: flagged(['broken_link', 'stale', 'location_mismatch', 'other']),
        verificationsAwaitingApproval: verifs.filter((v) => v.approval?.state === 'pending'),
        interviewsAwaitingApproval: can(actor, 'interview:approve') ? (await store.list('interviews')).filter((i) => i.review?.state === 'pending_review') : [],
      };
    },

    async importCsv(actor, csvText, { label = 'CSV upload' } = {}) {
      requirePerm(actor, 'ingest:csv');
      const rows = parseCsv(csvText);
      if (!rows.length) throw new ValidationError('The CSV has no data rows.');
      const missing = ['source_url', 'role_title_raw', 'captured_at', 'platform'].filter((c) => !(c in rows[0]));
      if (missing.length) throw new ValidationError('The CSV is missing required columns.', missing.map((c) => `Missing column: ${c}`));
      const existing = new Set((await store.list('records')).map((r) => r.source_id));
      const accepted = [], rejected = [];
      let n = 0;
      for (const [i, row] of rows.entries()) {
        const rec = fromRegisterRow(row);
        if (!rec.source_id) {
          do rec.source_id = `CSV-${now().replace(/-/g, '')}-${String(++n).padStart(3, '0')}`;
          while (existing.has(rec.source_id));
        }
        rec.review = { state: 'pending_review', by: null, at: null, note: `${label} by ${actor.id}` };
        const errs = validateRecord(rec);
        if (existing.has(rec.source_id)) errs.push(`source_id ${rec.source_id} already exists`);
        if (errs.length) { rejected.push({ row: i + 2, source_id: rec.source_id, errors: errs }); continue; }
        existing.add(rec.source_id);
        await store.put('records', rec, actor.id);
        accepted.push(rec.source_id);
      }
      if (accepted.length) await recluster(actor);
      await audit(actor, 'ingest.csv', 'records', accepted.join(',') || '-', `${label}: ${accepted.length} accepted for review, ${rejected.length} rejected`, { rejected });
      return { accepted, rejected };
    },

    async reviewRecord(actor, id, { decision, note = '', confidence = null }) {
      requirePerm(actor, 'review:record');
      if (!['approve', 'reject'].includes(decision)) throw new ValidationError('decision must be approve or reject');
      const r = await mustGetRecord(id);
      r.review = { state: decision === 'approve' ? 'approved' : 'rejected', by: actor.id, at: stamp(), note: note || null };
      if (confidence) {
        if (!['low', 'medium', 'high'].includes(confidence.level) || !confidence.rationale) throw new ValidationError('confidence needs level (low|medium|high) and rationale');
        r.confidence = { level: confidence.level, rationale: confidence.rationale };
      }
      await saveRecord(actor, r);
      await recluster(actor);
      await audit(actor, `record.${decision}`, 'record', id, `${decision === 'approve' ? 'Approved' : 'Rejected'} ${id}`, { note });
      return r;
    },

    async resolveDuplicate(actor, cluster, { decision, keep = null, note = '' }) {
      requirePerm(actor, 'review:dedupe');
      if (!['same_post', 'different_posts'].includes(decision)) throw new ValidationError('decision must be same_post or different_posts');
      const members = (await records()).filter((r) => r.dedupe_cluster === cluster);
      if (members.length < 2) throw new NotFoundError(`Cluster ${cluster} has no duplicates to resolve`);
      const keepId = keep || representatives(members)[0].source_id;
      for (const r of members) {
        r.duplicate_status = decision === 'same_post' ? (r.source_id === keepId ? 'unique' : 'confirmed_duplicate') : 'not_duplicate';
        await store.put('records', r, actor.id);
      }
      if (decision === 'different_posts') await recluster(actor);
      await audit(actor, 'dedupe.resolve', 'cluster', cluster, `${decision === 'same_post' ? 'Confirmed mirrors of one post' : 'Marked as different posts'}: ${members.map((m) => m.source_id).join(', ')}`, { keep: keepId, note });
      return { cluster, decision };
    },

    async flagSource(actor, id, { type, note = '' }) {
      requirePerm(actor, 'flag:source');
      if (!SOURCE_FLAG_TYPES.includes(/** @type {any} */ (type))) throw new ValidationError(`type must be one of ${SOURCE_FLAG_TYPES.join(', ')}`);
      const r = await mustGetRecord(id);
      const flag = { id: uid('FLG'), source_id: id, type, note: String(note).slice(0, 500), status: 'open', raised_by: actor.id, raised_at: stamp() };
      await store.put('flags', flag, actor.id);
      r.open_flags = [...new Set([...r.open_flags, type])];
      await store.put('records', r, actor.id);
      await audit(actor, 'source.flag', 'record', id, `Flagged ${id} as ${type}`, { note });
      return flag;
    },

    async resolveFlag(actor, flagId, { note = '', recheckedOk = false }) {
      requirePerm(actor, 'review:record');
      const flag = await store.get('flags', flagId);
      if (!flag) throw new NotFoundError(`Flag ${flagId} not found`);
      flag.status = 'resolved';
      flag.resolved_by = actor.id;
      flag.resolved_at = stamp();
      flag.resolution = note;
      await store.put('flags', flag, actor.id);
      const r = await mustGetRecord(flag.source_id);
      const stillOpen = (await store.list('flags')).filter((x) => x.source_id === r.source_id && x.status === 'open').map((x) => x.type);
      r.open_flags = [...new Set(stillOpen)];
      if (recheckedOk) r.last_rechecked_at = now();
      await saveRecord(actor, r);
      await audit(actor, 'source.flag_resolve', 'record', r.source_id, `Resolved ${flag.type} flag on ${r.source_id}`, { note, recheckedOk });
      return flag;
    },

    async queueOutreach(actor, id) {
      requirePerm(actor, 'queue:outreach');
      const r = await mustGetRecord(id);
      if (r.verification_status !== 'observed_public') throw new ValidationError(`Only observed_public records can be queued (this one is ${r.verification_status}).`);
      r.verification_status = 'pending_employer_check';
      await saveRecord(actor, r);
      await audit(actor, 'record.queue_outreach', 'record', id, `Queued ${id} for employer check`);
      return r;
    },

    async expireRecord(actor, id, { reason }) {
      requirePerm(actor, 'expire:record');
      if (!reason) throw new ValidationError('A reason is required to expire a signal.');
      const r = await mustGetRecord(id);
      r.verification_status = 'expired';
      r.vacancy_count_verified = null;
      r.expiry = r.expiry && r.expiry < now() ? r.expiry : now();
      await saveRecord(actor, r);
      await audit(actor, 'record.expire', 'record', id, `Expired ${id}: ${reason}`);
      return r;
    },

    async listVerifications(actor) {
      requirePerm(actor, 'read:review');
      return (await store.list('verifications')).map((v) => redactVerification(actor, v));
    },

    async submitVerification(actor, payload) {
      requirePerm(actor, 'verify:submit');
      const v = normalizeVerification(payload);
      const errs = validateVerification(v, now());
      if (v.record_id && !(await store.get('records', v.record_id))) errs.push(`record_id ${v.record_id} not found`);
      if (errs.length) throw new ValidationError('Verification failed validation', errs);
      v.id = uid('VER');
      v.submitted_by = actor.id;
      v.submitted_at = stamp();
      v.approval = { state: 'pending', by: null, at: null, note: null };
      await store.put('verifications', v, actor.id);
      await audit(actor, 'verification.submit', 'verification', v.id, `Submitted ${v.outcome} verification for ${v.employer_identity}${v.record_id ? ` (${v.record_id})` : ''}; awaiting second-person approval`);
      return redactVerification(actor, v);
    },

    /** Four-eyes rule: the approver must not be the person who submitted it. */
    async decideVerification(actor, id, { decision, note = '' }) {
      requirePerm(actor, 'verify:approve');
      if (!['approve', 'reject'].includes(decision)) throw new ValidationError('decision must be approve or reject');
      const v = await store.get('verifications', id);
      if (!v) throw new NotFoundError(`Verification ${id} not found`);
      if (v.approval?.state !== 'pending') throw new ValidationError(`Verification already ${v.approval?.state}`);
      if (v.submitted_by === actor.id) throw new ForbiddenError('A verification must be approved by someone other than the person who submitted it.');
      v.approval = { state: decision === 'approve' ? 'approved' : 'rejected', by: actor.id, at: stamp(), note };
      let recordId = v.record_id;
      if (decision === 'approve') recordId = await applyVerification(actor, v);
      v.applied_record_id = recordId;
      await store.put('verifications', v, actor.id);
      await audit(actor, `verification.${decision}`, 'verification', id, `${decision === 'approve' ? 'Approved' : 'Rejected'} verification ${id}${recordId ? ` -> ${recordId}` : ''}`, { note });
      return redactVerification(actor, v);
    },

    async submitInterview(actor, payload) {
      requirePerm(actor, 'interview:submit');
      const errs = validateInterview(payload, now());
      if (errs.length) throw new ValidationError('Interview failed validation', errs);
      const rec = { ...payload, id: uid('INT'), review: { state: 'pending_review', by: null, at: null }, recorded_by: actor.id, recorded_at: stamp() };
      await store.put('interviews', rec, actor.id);
      await audit(actor, 'interview.submit', 'interview', rec.id, `Recorded consented ${payload.respondent_group} interview (${payload.source_type})`);
      return rec;
    },

    async decideInterview(actor, id, { decision }) {
      requirePerm(actor, 'interview:approve');
      const rec = await store.get('interviews', id);
      if (!rec) throw new NotFoundError(`Interview ${id} not found`);
      rec.review = { state: decision === 'approve' ? 'approved' : 'rejected', by: actor.id, at: stamp() };
      await store.put('interviews', rec, actor.id);
      await audit(actor, `interview.${decision}`, 'interview', id, `${decision} interview ${id}`);
      return rec;
    },

    async setSentimentEnabled(actor, enabled) {
      requirePerm(actor, 'admin:sentiment');
      await store.setSetting('sentimentEnabled', !!enabled);
      await audit(actor, 'settings.sentiment', 'settings', 'sentimentEnabled', `Sentiment layer ${enabled ? 'enabled' : 'disabled'}`);
      return settings();
    },

    async setPassouts(actor, rows) {
      requirePerm(actor, 'admin:passouts');
      const errs = [];
      const clean = (rows || []).map((p, i) => {
        if (!TRADES.includes(p.trade) || p.trade === 'non_iti') errs.push(`row ${i + 1}: trade must be an ITI trade`);
        if (!p.catchment) errs.push(`row ${i + 1}: catchment required`);
        if (!Number.isInteger(p.expected_passouts) || p.expected_passouts < 0) errs.push(`row ${i + 1}: expected_passouts must be a whole number`);
        if (!p.source) errs.push(`row ${i + 1}: source (dataset and owner) required`);
        return { id: p.id || uid('PO'), trade: p.trade, catchment: p.catchment, year: p.year ?? null, expected_passouts: p.expected_passouts, source: p.source, source_url: p.source_url ?? null, approved: true, approved_by: actor.id, approved_at: stamp() };
      });
      if (errs.length) throw new ValidationError('Pass-out data failed validation', errs);
      for (const p of clean) await store.put('passouts', p, actor.id);
      await audit(actor, 'passouts.set', 'passouts', clean.map((p) => p.id).join(','), `Loaded ${clean.length} expected pass-out row(s)`);
      return clean;
    },

    async auditLog(actor, limit = 200) {
      requirePerm(actor, 'read:audit');
      return store.listAudit(limit);
    },

    async exportRegister(actor, filters) {
      requirePerm(actor, 'export:public');
      const f = coerceFilters(filters);
      const all = (await records()).filter((r) => r.review.state === 'approved');
      const rows = filterOpportunities(all, { ...f, includeHistorical: true, includeUnclear: true }).map((r) => toRegisterRow(redactRecord(r, can(actor, 'read:contacts'))));
      return toCsv(REGISTER_COLUMNS, rows);
    },

    async managementNote(actor, filters) {
      requirePerm(actor, 'export:public');
      const a = await service.analytics(actor, filters);
      const all = (await records()).filter((r) => r.review.state === 'approved');
      const vis = representatives(filterOpportunities(all, a.filters));
      return buildManagementNote({ ...a, records: vis, freshness: freshness(vis, a.asOf) });
    },
  };

  /** Apply an approved verification to the evidence base. Returns the record id. */
  async function applyVerification(actor, v) {
    let r;
    if (v.record_id) r = await mustGetRecord(v.record_id);
    else {
      const first = v.roles[0] || {};
      r = normalizeRecord({
        source_id: 'VER-' + v.id.split('-').slice(1).join('').toUpperCase().slice(0, 12),
        source_url: v.evidence_url,
        platform: 'Employer verification',
        source_type: 'verified_employer',
        evidence_type: 'employer_verification',
        captured_at: v.verified_at,
        employer_identity: v.employer_identity,
        sector: v.work_location.sector,
        geo: { granularity: v.work_location.granularity || 'sector', basis: 'employer_confirmed', scope_status: 'in_scope', locality_text: v.work_location.locality_text || null },
        role_title_raw: v.roles.map((x) => x.role_title).join(' / '),
        canonical_occupation: first.canonical_occupation || first.role_title,
        occupation_family: first.occupation_family || 'Unclassified',
        experience: first.experience_raw || 'Not stated',
        education: first.education_raw || 'Not stated',
        experience_level: 'Mixed',
        skills: first.skills || [],
        confidence: { level: 'high', rationale: 'Opening confirmed directly by the employer and approved by a second reviewer.' },
        review: { state: 'approved', by: actor.id, at: stamp(), note: 'Created from approved employer verification' },
      });
    }
    if (v.outcome === 'confirmed') {
      r.verification_status = 'employer_confirmed';
      r.verified_roles = v.roles;
      r.vacancy_count_verified = v.roles.reduce((s, x) => s + x.openings, 0);
      r.start_date = v.roles.map((x) => x.start_date).filter(Boolean).sort()[0] || null;
      r.verified_at = v.verified_at;
      r.verification_id = v.id;
      r.verification_contact = v.contact ? [v.contact.name, v.contact.designation, v.contact.channel].filter(Boolean).join(', ') : null;
      r.expiry = v.valid_until || addDays(v.verified_at, VERIFICATION_VALID_DAYS);
      r.last_rechecked_at = v.verified_at;
      if (v.work_location?.sector && v.work_location.sector === (r.sector || r.geo.claimed_sector)) {
        const better = LOCATION_PRECISION.indexOf(/** @type {any} */ (v.work_location.granularity || 'sector')) < LOCATION_PRECISION.indexOf(/** @type {any} */ (r.geo.granularity));
        r.geo = {
          ...r.geo,
          granularity: better ? v.work_location.granularity : r.geo.granularity,
          basis: v.work_location.geocode_verified && v.work_location.lat != null ? 'geocode_verified' : 'employer_confirmed',
          scope_status: 'in_scope',
          locality_text: v.work_location.locality_text || r.geo.locality_text,
          lat: v.work_location.lat ?? r.geo.lat,
          lon: v.work_location.lon ?? r.geo.lon,
          geocode_verified: !!(v.work_location.geocode_verified && v.work_location.lat != null),
        };
        r.sector = v.work_location.sector;
      }
      r.confidence = { level: 'high', rationale: `Employer confirmed on ${v.verified_at} by ${v.method}; approved by a second reviewer.` };
    } else if (v.outcome === 'contradicted') {
      r.verification_status = 'contradicted';
      r.verified_at = v.verified_at;
      r.verification_id = v.id;
      r.vacancy_count_verified = null;
    } else if (v.outcome === 'filled_or_closed') {
      r.verification_status = 'expired';
      r.verified_at = v.verified_at;
      r.verification_id = v.id;
      r.vacancy_count_verified = null;
      r.expiry = v.verified_at;
    } else {
      if (r.verification_status === 'observed_public') r.verification_status = 'pending_employer_check';
    }
    await saveRecord(actor, r);
    await recluster(actor);
    return r.source_id;
  }

  return service;
}

function addDays(d, n) {
  const t = toDate(d);
  if (!t) return null;
  t.setUTCDate(t.getUTCDate() + n);
  return isoDate(t);
}

/** @param {any} p */
export function normalizeVerification(p) {
  return {
    record_id: p.record_id || null,
    employer_identity: String(p.employer_identity || '').trim(),
    evidence_url: p.evidence_url || null,
    verified_at: p.verified_at,
    method: p.method,
    outcome: p.outcome,
    roles: (p.roles || []).map((x) => ({
      role_title: String(x.role_title || '').trim(),
      canonical_occupation: x.canonical_occupation || null,
      occupation_family: x.occupation_family || null,
      trade: x.trade || 'non_iti',
      openings: Number(x.openings),
      entry_wage_min: x.entry_wage_min === '' || x.entry_wage_min == null ? null : Number(x.entry_wage_min),
      entry_wage_max: x.entry_wage_max === '' || x.entry_wage_max == null ? null : Number(x.entry_wage_max),
      wage_period: x.wage_period || 'month',
      start_date: x.start_date || null,
      prescreen: x.prescreen || null,
      interview_process: x.interview_process || null,
      skills: x.skills || [],
    })),
    work_location: { sector: null, granularity: 'sector', locality_text: null, lat: null, lon: null, geocode_verified: false, ...(p.work_location || {}) },
    notes: (p.notes || []).filter((n) => n && n.text).map((n) => ({ date: n.date, text: String(n.text).slice(0, 2000) })),
    contact: p.contact || null,
    consent_basis: p.consent_basis,
    consent_note: p.consent_note || null,
    valid_until: p.valid_until || null,
  };
}

/** @param {ReturnType<typeof normalizeVerification>} v @param {string} today */
export function validateVerification(v, today) {
  const e = [];
  if (!v.employer_identity) e.push('employer_identity is required');
  if (!toDate(v.verified_at)) e.push('verified_at (date of employer contact) is required');
  else if (v.verified_at > today) e.push('verified_at cannot be in the future');
  if (!VERIFICATION_METHODS.includes(v.method)) e.push(`method must be one of ${VERIFICATION_METHODS.join(', ')}`);
  if (!VERIFICATION_OUTCOMES.includes(v.outcome)) e.push(`outcome must be one of ${VERIFICATION_OUTCOMES.join(', ')}`);
  if (!CONSENT_BASES.includes(/** @type {any} */ (v.consent_basis))) e.push(`consent_basis must be one of ${CONSENT_BASES.join(', ')}`);
  if (!v.notes.length) e.push('at least one dated note is required');
  for (const n of v.notes) if (!toDate(n.date)) e.push('every note needs a valid date');
  if (!v.record_id && !isHttpUrl(v.evidence_url)) e.push('evidence_url (employer website or careers page) is required when no public signal is linked');
  if (!v.record_id && v.outcome === 'confirmed' && !PILOT_SECTORS.includes(v.work_location.sector)) e.push('work_location.sector must be 62 or 63 for a new confirmed opening');
  if (v.outcome === 'confirmed') {
    if (!v.roles.length) e.push('a confirmed verification needs at least one role');
    v.roles.forEach((x, i) => {
      if (!x.role_title) e.push(`role ${i + 1}: role_title required`);
      if (!Number.isInteger(x.openings) || x.openings <= 0) e.push(`role ${i + 1}: openings must be a whole number above zero`);
      if (!TRADES.includes(x.trade)) e.push(`role ${i + 1}: trade must be one of ${TRADES.join(', ')}`);
      if (x.entry_wage_min != null && Number.isNaN(x.entry_wage_min)) e.push(`role ${i + 1}: entry_wage_min must be a number`);
      if (x.entry_wage_max != null && Number.isNaN(x.entry_wage_max)) e.push(`role ${i + 1}: entry_wage_max must be a number`);
      if (x.entry_wage_min != null && x.entry_wage_max != null && x.entry_wage_min > x.entry_wage_max) e.push(`role ${i + 1}: entry wage minimum exceeds maximum`);
      if (x.start_date && !toDate(x.start_date)) e.push(`role ${i + 1}: start_date invalid`);
      if (x.occupation_family && !OCCUPATION_FAMILIES.includes(x.occupation_family)) e.push(`role ${i + 1}: occupation_family invalid`);
    });
  }
  if (v.work_location.lat != null && (v.work_location.lat < 28.4 || v.work_location.lat > 28.8)) e.push('work_location coordinates outside the Noida pilot area');
  return e;
}

/** @param {any} p @param {string} today */
export function validateInterview(p, today) {
  const e = [];
  if (!['interview', 'workforce_sentiment'].includes(p.source_type)) e.push('source_type must be interview or workforce_sentiment (job adverts are not sentiment)');
  if (!['worker', 'learner', 'employer'].includes(p.respondent_group)) e.push('respondent_group must be worker, learner or employer');
  if (p.sector && !PILOT_SECTORS.includes(p.sector)) e.push('sector must be 62 or 63');
  if (!toDate(p.interview_date) || p.interview_date > today) e.push('interview_date must be a past date');
  if (p.consent?.obtained !== true) e.push('recorded informed consent is required');
  if (!CONSENT_BASES.includes(p.consent?.basis)) e.push('consent.basis is required');
  if (p.name || p.phone || p.email) e.push('do not store names or contact details with interview content');
  if (!Array.isArray(p.themes) || !p.themes.length) e.push('at least one coded theme is required');
  for (const t of p.themes || []) if (!INTERVIEW_THEMES.includes(t.theme)) e.push(`unknown theme ${t.theme}`);
  return e;
}
