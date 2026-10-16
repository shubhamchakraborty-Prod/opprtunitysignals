// @ts-check
// Provenance-preserving de-duplication. Records are never deleted or merged:
// mirrors of the same employer post share a dedupe_cluster and are counted once.
import { normText } from './util.js';

const EMPLOYER_NOISE = /\b(private|pvt|limited|ltd|limted|llp|inc|india|the|co|company|technologies|technology|solutions|services)\b/g;
const ROLE_NOISE = /\b(urgent|hiring|immediate|joiner|joiners|for|in|at|noida|sector|\d+|wanted|opening|openings|job|jobs|freshers?)\b/g;

export function employerKey(name) {
  return normText(name).replace(EMPLOYER_NOISE, ' ').replace(/\s+/g, ' ').trim();
}

export function roleTokens(title) {
  return new Set(normText(title).replace(ROLE_NOISE, ' ').split(' ').filter((t) => t.length > 1));
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Similarity threshold above which two adverts from one employer are a possible duplicate. */
export const ROLE_SIMILARITY_THRESHOLD = 0.6;

/**
 * Are two records plausibly the same underlying post?
 * Same original_post_id on the same platform is definitive; otherwise the
 * employer (or recruiter) must match, the sector must match and role titles
 * must be highly similar.
 */
export function isPossibleDuplicate(a, b) {
  if (a.source_id === b.source_id) return false;
  if (a.original_post_id && b.original_post_id && a.platform === b.platform) return a.original_post_id === b.original_post_id;
  const ea = employerKey(a.employer_identity || a.recruiter_identity);
  const eb = employerKey(b.employer_identity || b.recruiter_identity);
  if (!ea || ea !== eb) return false;
  if ((a.sector || a.geo?.claimed_sector) !== (b.sector || b.geo?.claimed_sector)) return false;
  return jaccard(roleTokens(a.role_title_raw), roleTokens(b.role_title_raw)) >= ROLE_SIMILARITY_THRESHOLD;
}

/**
 * Assign dedupe clusters with union-find. Reviewer decisions win:
 * a record marked not_duplicate keeps its own cluster.
 * Returns new record objects; input is not mutated.
 * @template {{source_id:string,dedupe_cluster:string,duplicate_status:string}} R
 * @param {R[]} records
 * @returns {R[]}
 */
export function assignClusters(records) {
  const parent = new Map(records.map((r) => [r.source_id, r.source_id]));
  const find = (x) => {
    while (parent.get(x) !== x) x = /** @type {string} */ (parent.get(x));
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  };
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i], b = records[j];
      if (a.duplicate_status === 'not_duplicate' || b.duplicate_status === 'not_duplicate') continue;
      if (isPossibleDuplicate(a, b)) union(a.source_id, b.source_id);
    }
  }
  const sizes = new Map();
  for (const r of records) sizes.set(find(r.source_id), (sizes.get(find(r.source_id)) || 0) + 1);
  return records.map((r) => {
    const root = find(r.source_id);
    const multi = sizes.get(root) > 1;
    let status = r.duplicate_status;
    if (multi && (status === 'unique' || !status)) status = 'possible_duplicate';
    if (!multi && status === 'possible_duplicate') status = 'unique';
    return { ...r, dedupe_cluster: 'DC-' + root, duplicate_status: status };
  });
}

/**
 * Pick one representative per cluster so counts never double-count mirrors.
 * Preference: employer_confirmed, then individual job post, then earliest id.
 * @template {{source_id:string,dedupe_cluster:string,verification_status:string,source_url_kind:string}} R
 * @param {R[]} records
 * @returns {R[]}
 */
export function representatives(records) {
  const best = new Map();
  const rank = (r) => (r.verification_status === 'employer_confirmed' ? 0 : r.source_url_kind === 'job_post' ? 1 : 2);
  for (const r of records) {
    const k = r.dedupe_cluster || r.source_id;
    const cur = best.get(k);
    if (!cur || rank(r) < rank(cur) || (rank(r) === rank(cur) && r.source_id < cur.source_id)) best.set(k, r);
  }
  return [...best.values()];
}
