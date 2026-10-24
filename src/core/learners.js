// @ts-check
// One fit model for the three kinds of learner: ITI (trade), polytechnic
// (diploma branch) and college (degree). Which ads accept the learner's
// qualification, which ads their skills fit, which ads they could reach with a
// few bridge skills, and which skills open the most of them.
import { mapTrade, bridgeJobs, GENERIC_SKILLS, BRIDGE_SKILLS } from './trades.js';

export const LEARNER_TYPES = {
  iti: { label: 'ITI', long: 'ITI trainee or pass-out' },
  polytechnic: { label: 'Polytechnic', long: 'Diploma student or holder' },
  college: { label: 'College', long: 'Degree student or graduate' },
};

/** Does the ad accept this type of learner? Ads that name no qualification accept everyone. */
export function acceptsType(r, type) {
  if (!r.education?.stated) return true;
  const acc = r.education.accepted || [];
  if (type === 'iti') return acc.some((t) => t.startsWith('iti_') || t === '10th');
  if (type === 'polytechnic') return acc.some((t) => t === 'diploma' || t.startsWith('iti_') || t === '10th' || t === '12th');
  return acc.some((t) => t === 'degree' || t === 'engineering_degree' || t === '12th' || t === 'diploma');
}

const BRIDGE = new Set(BRIDGE_SKILLS.map((s) => s.toLowerCase()));
const GENERIC = new Set(GENERIC_SKILLS);
const lc = (s) => s.toLowerCase();

/**
 * @param {{type:'iti'|'polytechnic'|'college', programme:{trade?:string,name?:string,sector?:string,core_skills:string[]}}} learner
 * @param {any[]} ads current, deduplicated ads
 * @returns {{related:{source_id:string,matched:string[],missing:string[]}[], fresh:number, bridges:{source_id:string,gaps:string[]}[], opens:[string,string[]][]}}
 */
export function learnerFit(learner, ads) {
  const { type, programme } = learner;
  let related, bridges;
  if (type === 'iti') {
    const m = mapTrade(programme, ads);
    related = m.related;
    bridges = bridgeJobs(programme, ads).filter((b) => b.ready_as_fresher).map((b) => ({ source_id: b.source_id, gaps: b.gaps.map((g) => g.skill) }));
  } else {
    const have = new Set(programme.core_skills.map(lc));
    related = [];
    bridges = [];
    for (const r of ads) {
      if (!acceptsType(r, type)) continue;
      const req = r.skills.map((s) => s.name);
      const matched = req.filter((s) => have.has(lc(s)));
      const missing = req.filter((s) => !have.has(lc(s)));
      const fits = req.length && matched.length / req.length >= 1 / 3 - 1e-9 && matched.some((s) => !GENERIC.has(lc(s)));
      if (fits) related.push({ source_id: r.source_id, matched, missing });
      else if (req.length && missing.length <= 3 && missing.every((s) => BRIDGE.has(lc(s))) && (r.experience.min_months ?? 0) < 6) bridges.push({ source_id: r.source_id, gaps: missing });
    }
  }
  const byId = new Map(ads.map((r) => [r.source_id, r]));
  const fresh = related.filter((x) => (byId.get(x.source_id)?.experience.min_months ?? 0) < 12).length;
  const opens = new Map();
  for (const x of related) for (const s of x.missing) { if (!opens.has(s)) opens.set(s, new Set()); opens.get(s).add(x.source_id); }
  for (const b of bridges) for (const s of b.gaps) { if (!opens.has(s)) opens.set(s, new Set()); opens.get(s).add(b.source_id); }
  const ranked = [...opens.entries()].map(([s, ids]) => /** @type {[string,string[]]} */ ([s, [...ids]])).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  return { related, fresh, bridges, opens: ranked };
}

/** Demand split by learner type: ads each type can apply for, and ads open to freshers. */
export function demandByType(ads) {
  return Object.keys(LEARNER_TYPES).map((type) => {
    const open = ads.filter((r) => acceptsType(r, type));
    return { type, label: LEARNER_TYPES[type].label, ads: open.length, fresh: open.filter((r) => (r.experience.min_months ?? 0) < 12).length, named: ads.filter((r) => r.education?.stated && acceptsType(r, type)).length };
  });
}
