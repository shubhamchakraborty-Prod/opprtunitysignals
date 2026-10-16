// @ts-check
// ITI trade catalogue mapped to local job ads: which ads relate to each trade,
// what extra skills those ads ask for, which firm requirements block a fresh
// pass-out, and which short courses could close the gap.
import { normText } from './util.js';

const norm = (s) => normText(s).replace(/\b(and|the|of)\b/g, ' ').replace(/\s+/g, ' ').trim();

const ENGINEERING = ['Automotive', 'Capital Goods and Manufacturing', 'Electrical and Power', 'Electronics and Hardware'];

/** Does a record name this trade as relevant? "Any ITI trade" counts for engineering trades only. */
export function namesTrade(r, trade) {
  const t = norm(trade.trade);
  return (r.iti_trade_relevance || []).some((x) => {
    const n = norm(x);
    if (/any iti trade/.test(n)) return ENGINEERING.includes(trade.sector);
    return n === t || (n === 'copa' && /\bcopa\b/.test(t));
  });
}

/** Skills common to many jobs; on their own they do not link a trade to an ad. */
export const GENERIC_SKILLS = ['electrical basics', 'customer handling', 'communication', 'english communication', 'english writing', 'basic english', 'measurement', 'machine safety', 'quality inspection', 'computer basics', 'documentation', 'troubleshooting', 'problem solving', 'typing', 'hygiene and safety', 'site safety', 'installation and servicing', 'sales'];

/** Share of the ad's named skills that the trade covers. */
export function skillCover(r, trade) {
  const have = new Set(trade.core_skills.map((s) => s.toLowerCase()));
  const req = r.skills.map((s) => s.name);
  const matched = req.filter((s) => have.has(s.toLowerCase()));
  return { matched, missing: req.filter((s) => !have.has(s.toLowerCase())), ratio: req.length ? matched.length / req.length : 0 };
}

const acceptsIti = (r) => !r.education.stated || r.education.accepted.some((t) => t.startsWith('iti_') || t === '10th');

/**
 * Map one trade against current in-scope ads.
 * @param {any} trade catalogue entry
 * @param {any[]} ads current, in-scope, deduplicated records
 * @param {Record<string, any>} courses skill -> course suggestion
 */
export function mapTrade(trade, ads, courses = {}) {
  const related = ads
    .map((r) => ({ r, named: namesTrade(r, trade), cover: skillCover(r, trade) }))
    .filter((x) => x.named || (x.cover.ratio >= 1 / 3 - 1e-9 && x.cover.matched.some((m) => !GENERIC_SKILLS.includes(m.toLowerCase()))))
    .sort((a, b) => Number(b.named) - Number(a.named) || b.cover.ratio - a.cover.ratio);
  const gapCount = new Map();
  for (const x of related) for (const s of x.cover.missing) gapCount.set(s, (gapCount.get(s) || 0) + 1);
  const gaps = [...gapCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([skill, count]) => ({ skill, count, course: courses[skill] || null }));
  const needExp = related.filter((x) => (x.r.experience.min_months ?? 0) >= 12);
  const noIti = related.filter((x) => !acceptsIti(x.r));
  const freshOk = related.filter((x) => (x.r.experience.min_months ?? 0) < 12 && acceptsIti(x.r));
  return {
    trade: trade.trade,
    sector: trade.sector,
    core_skills: trade.core_skills,
    related: related.map((x) => ({ source_id: x.r.source_id, named: x.named, matched: x.cover.matched, missing: x.cover.missing })),
    demand: related.length,
    fresh_ok: freshOk.length,
    gaps,
    requirements: [
      needExp.length ? `${needExp.length} of ${related.length} related ads ask for a year or more of experience.` : null,
      noIti.length ? `${noIti.length} of ${related.length} ask for a qualification other than ITI (usually a diploma or degree).` : null,
    ].filter(Boolean),
  };
}

/** Map the whole catalogue; trades with local ads first. */
export function mapCatalogue(trades, ads, courses = {}) {
  return trades.map((t) => mapTrade(t, ads, courses)).sort((a, b) => b.demand - a.demand || a.trade.localeCompare(b.trade));
}

/**
 * Skills an ITI learner can add with a short course to reach jobs outside
 * their trade: communication, customer, sales, office, data and AI skills.
 */
export const BRIDGE_SKILLS = [
  'English communication', 'English writing', 'Basic English', 'Communication', 'Customer handling', 'Problem solving', 'Sales', 'IT knowledge',
  'Computer basics', 'Typing', 'Excel', 'Reporting', 'Documentation', 'Office administration', 'Power BI', 'Digital marketing', 'Google Ads',
  'Data annotation', 'Technical support', 'AI tools',
];
const BRIDGE = new Set(BRIDGE_SKILLS.map((s) => s.toLowerCase()));

/**
 * Jobs outside the trade that a fresh pass-out could reach by adding a few
 * bridge skills. Firm requirements that a course cannot fix (experience,
 * a degree) are listed as blockers.
 * @param {any} trade
 * @param {any[]} ads current deduplicated records (any location scope)
 * @param {Record<string, any>} courses
 */
export function bridgeJobs(trade, ads, courses = {}) {
  const have = new Set(trade.core_skills.map((s) => s.toLowerCase()));
  const out = [];
  for (const r of ads) {
    if (namesTrade(r, trade)) continue;
    const missing = r.skills.map((s) => s.name).filter((s) => !have.has(s.toLowerCase()));
    if (!r.skills.length || missing.some((s) => !BRIDGE.has(s.toLowerCase())) || missing.length > 3) continue;
    const blockers = [];
    const exp = r.experience.min_months;
    if (exp != null && exp >= 6) blockers.push(exp >= 12 ? `${Math.round(exp / 12)} year${exp >= 24 ? 's' : ''} of experience` : `${exp} months of experience`);
    const acc = r.education.accepted || [];
    if (r.education.stated && !acc.some((t) => t.startsWith('iti_') || t === '10th')) {
      if (acc.includes('12th')) blockers.push('Class 12 (check if ITI is accepted instead)');
      else blockers.push(acc.includes('degree') || acc.includes('engineering_degree') ? 'a degree' : 'a diploma');
    }
    const strongEnglish = /strong english|fluent english/i.test([r.curator_note, r.shift?.raw].join(' '));
    const gaps = [...new Set([...missing, ...(strongEnglish ? ['English communication'] : [])])];
    const unknowns = exp == null ? ['Experience not stated; confirm with the employer'] : [];
    out.push({ source_id: r.source_id, gaps: gaps.map((skill) => ({ skill, course: courses[skill] || null })), blockers, unknowns, ready_as_fresher: !blockers.length });
  }
  return out.sort((a, b) => Number(b.ready_as_fresher) - Number(a.ready_as_fresher) || a.gaps.length - b.gaps.length || a.source_id.localeCompare(b.source_id));
}

/** Which bridge skills open the most ads, with the course that teaches them. */
export function bridgeSkillDemand(ads, courses = {}) {
  const count = new Map();
  for (const r of ads) for (const s of r.skills) if (BRIDGE.has(s.name.toLowerCase())) count.set(s.name, (count.get(s.name) || 0) + 1);
  for (const r of ads) if (/strong english|fluent english/i.test([r.curator_note, r.shift?.raw].join(' ')) && !r.skills.some((s) => s.name === 'English communication')) count.set('English communication', (count.get('English communication') || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([skill, n]) => ({ skill, ads: n, of: ads.length, course: courses[skill] || null }));
}
