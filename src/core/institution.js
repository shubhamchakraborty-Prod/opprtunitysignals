// @ts-check
// Descriptive institute intelligence derived only from approved, current,
// in-scope, deduplicated job advertisements. Never infer open vacancies.
import { mapCatalogue } from './trades.js';
import { learnerFit } from './learners.js';
import { isValidConfirmed } from './analytics.js';

const TYPES = new Set(['iti', 'polytechnic', 'college']);

/**
 * Describe relevance by programme; this is not a labour-market census.
 * @param {string} type
 * @param {any[]} ads
 * @param {any[]} trades
 * @param {any[]} programmes
 * @param {Record<string, any>} courses
 */
export function instituteDemand(type, ads, trades = [], programmes = [], courses = {}) {
  if (!TYPES.has(type)) return { rows: [], skills: [], sampleSize: ads.length };
  const rows = type === 'iti'
    ? mapCatalogue(trades, ads, courses).map((m) => ({
        id: m.trade, label: m.trade, sector: m.sector,
        adIds: m.related.map((x) => x.source_id), related: m.demand,
        fresher: m.fresh_ok, bridges: null,
        gaps: m.gaps.map((g) => ({ skill: g.skill, ads: g.count })),
        descriptions: m.related.map((x) => ({ source_id: x.source_id, missing: x.missing })),
      }))
    : programmes.filter((p) => p.type === type).map((p) => {
        const f = learnerFit({ type: /** @type {any} */ (type), programme: p }, ads);
        return {
          id: p.id, label: p.name, sector: p.sector || '',
          adIds: f.related.map((x) => x.source_id), related: f.related.length,
          fresher: f.fresh, bridges: f.bridges.length,
          gaps: f.opens.map(([skill, ids]) => ({ skill, ads: ids.length })),
          descriptions: [...f.related.map((x) => ({ source_id: x.source_id, missing: x.missing })),
            ...f.bridges.map((x) => ({ source_id: x.source_id, missing: x.gaps }))],
        };
      }).sort((a, b) => b.related - a.related || a.label.localeCompare(b.label));
  // Count distinct ad IDs for each gap, not repeated programmes or vacancies.
  const skills = new Map();
  for (const row of rows) {
    for (const desc of row.descriptions) {
      for (const skill of desc.missing) {
        const key = skill.toLowerCase();
        if (!skills.has(key)) skills.set(key, { skill, adIds: new Set(), programmes: new Set() });
        skills.get(key).adIds.add(desc.source_id);
        skills.get(key).programmes.add(row.id);
      }
    }
  }
  return {
    rows,
    skills: [...skills.values()].map((s) => ({ skill: s.skill, ads: s.adIds.size, programmes: s.programmes.size }))
      .sort((a, b) => b.ads - a.ads || a.skill.localeCompare(b.skill)),
    sampleSize: ads.length,
  };
}

/**
 * Group ads by named employer; a listing is not proof of an opening.
 * @param {any[]} ads
 * @param {string} asOf
 */
export function instituteEmployerLeads(ads, asOf) {
  const byName = new Map();
  for (const r of ads) {
    const name = String(r.employer_identity || '').trim();
    if (!name || /^(not stated|unknown|not named|n\/a)$/i.test(name)) continue;
    const key = name.toLocaleLowerCase('en-IN');
    if (!byName.has(key)) byName.set(key, { name, sources: [], sectors: new Set(), confirmed: 0, lastSeen: '' });
    const group = byName.get(key);
    group.sources.push({ id: r.source_id, role: r.role_title_raw, url: r.source_url, status: r.verification_status });
    if (r.sector) group.sectors.add(r.sector);
    if (isValidConfirmed(r, asOf)) group.confirmed += Number(r.vacancy_count_verified) || 0;
    if ((r.captured_at || '') > group.lastSeen) group.lastSeen = r.captured_at;
  }
  return [...byName.entries()].map(([key, g]) => ({
    id: key, name: g.name, sources: g.sources, adCount: g.sources.length,
    sectors: [...g.sectors].sort(), confirmedOpenings: g.confirmed, lastSeen: g.lastSeen,
  })).sort((a, b) => b.confirmedOpenings - a.confirmedOpenings || b.adCount - a.adCount || a.name.localeCompare(b.name));
}
