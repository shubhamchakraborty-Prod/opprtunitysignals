// @ts-check
// Talent view for employers: for a role, which ITI trades, diploma branches
// and degrees already teach its skills, what a fresh hire would still need,
// what local ads pay for similar work, and which institutes nearby train for it.

/** Entry roles employers around Noida hire for, in the same skill names as the ads. */
export const ROLES = [
  { id: 'smt', title: 'Electronics assembly (SMT) operator', needs: ['Soldering', 'PCB assembly', 'Electronics testing', 'ESD handling', 'Quality inspection'], families: ['Electronics & manufacturing'] },
  { id: 'qc', title: 'Quality inspector', needs: ['Quality inspection', 'Measurement', 'Documentation', 'Production processes'], families: ['Electronics & manufacturing', 'Mechanical & production'] },
  { id: 'cnc', title: 'Machine or CNC operator', needs: ['Machine setting', 'Lathe operation', 'Measurement', 'Machine safety', 'Production processes'], families: ['Mechanical & production'] },
  { id: 'elec', title: 'Maintenance electrician', needs: ['Electrical maintenance', 'Electrical wiring', 'Electrical basics', 'Troubleshooting', 'DG set operation'], families: ['Electrical & maintenance'] },
  { id: 'ev', title: 'EV and auto technician', needs: ['EV basics', 'Auto electrical wiring', 'Vehicle repair', 'Troubleshooting'], families: ['Automotive & EV'] },
  { id: 'support', title: 'Customer support executive', needs: ['English communication', 'Customer handling', 'Computer basics', 'Typing'], families: ['BPO & service'] },
  { id: 'mis', title: 'Data entry or MIS executive', needs: ['Excel', 'Reporting', 'Typing', 'Computer basics', 'Documentation'], families: ['Administration', 'IT & analytics'] },
  { id: 'sales', title: 'Inside sales executive', needs: ['Sales', 'English communication', 'Customer handling', 'Computer basics'], families: ['Sales & business'] },
  { id: 'helpdesk', title: 'IT helpdesk and technical support', needs: ['Technical support', 'Computer basics', 'IT knowledge', 'English communication', 'Troubleshooting'], families: ['IT & analytics'] },
  { id: 'annotator', title: 'AI data annotator', needs: ['Data annotation', 'Computer basics', 'English writing', 'Typing'], families: ['IT & analytics'] },
  { id: 'warehouse', title: 'Warehouse associate', needs: ['Picking', 'Packing', 'Documentation', 'Computer basics'], families: ['Logistics & warehouse'] },
];

/** Words that link an institute's listed trades or branches to a programme. */
const PROGRAMME_WORDS = {
  'dip-mech': /mechanical/i, 'dip-elec': /electrical/i, 'dip-ece': /electronic/i, 'dip-cs': /computer|information|hardware|\bit\b/i, 'dip-civil': /civil/i, 'dip-auto': /auto/i,
  'btech-cs': /cse|computer|\bit\b|information/i, 'btech-ece': /ece|electronic/i, 'btech-mech': /mechanical/i, 'btech-ee': /electrical|eee/i, bca: /bca|computer/i, bcom: /commerce|b\.?com/i, bba: /bba|management|mba/i, ba: /arts|humanities|english/i,
};
const lc = (s) => s.toLowerCase();

/** How much of a role's skills a trade or programme covers. */
export function cover(role, core) {
  const have = new Set(core.map(lc));
  const matched = role.needs.filter((s) => have.has(lc(s)));
  return { matched, missing: role.needs.filter((s) => !have.has(lc(s))), share: matched.length / role.needs.length };
}

/** Monthly pay seen in local ads for the role's kind of work. */
export function payBenchmark(role, ads) {
  const vals = [];
  for (const r of ads) {
    if (!role.families.includes(r.occupation_family) || !r.wage?.stated || r.wage.min == null) continue;
    const f = r.wage.period === 'year' ? 1 / 12 : r.wage.period === 'month' ? 1 : null;
    if (!f) continue;
    vals.push({ min: Math.round(r.wage.min * f), max: Math.round((r.wage.max ?? r.wage.min) * f) });
  }
  if (!vals.length) return null;
  const mins = vals.map((v) => v.min).sort((a, b) => a - b);
  return { n: vals.length, low: mins[0], high: Math.max(...vals.map((v) => v.max)), median: mins[Math.floor(mins.length / 2)] };
}

/**
 * @param {typeof ROLES[number]} role
 * @param {{trades:any[], programmes:any[], institutes:any[], ads:any[], area:string}} data
 */
export function talentForRole(role, { trades, programmes, institutes, ads, area }) {
  const rank = (list) => list.map((x) => ({ ...x, ...cover(role, x.core_skills) })).filter((x) => x.share >= 0.4).sort((a, b) => b.share - a.share || a.name.localeCompare(b.name)).slice(0, 3);
  const fits = {
    iti: rank(trades.map((t) => ({ id: t.trade, name: t.trade, core_skills: t.core_skills }))),
    polytechnic: rank(programmes.filter((p) => p.type === 'polytechnic')),
    college: rank(programmes.filter((p) => p.type === 'college')),
  };
  const local = institutes.filter((i) => i.area === area);
  const trains = (i) => {
    const text = (i.offers || []).join(' ') + ' ' + i.name;
    if (i.type === 'iti') return fits.iti.some((f) => new RegExp(f.name.split(/[ (]/)[0], 'i').test(text));
    const list = i.type === 'polytechnic' ? fits.polytechnic : fits.college;
    return list.some((f) => PROGRAMME_WORDS[f.id]?.test(text));
  };
  const best = [...fits.iti, ...fits.polytechnic, ...fits.college].sort((a, b) => b.share - a.share)[0];
  return { role, fits, gaps: best ? best.missing : role.needs, pay: payBenchmark(role, ads), institutes: local.filter(trains), adsLikeThis: ads.filter((r) => role.families.includes(r.occupation_family)).length };
}

/** Institutes in the area grouped into talent pools by what they teach. */
export const POOLS = [
  { id: 'electronics', label: 'Electronics and electrical', re: /electronic|electrical|electrician|wireman|ece|eee|instrument/i },
  { id: 'mechanical', label: 'Mechanical and production', re: /mechanical|fitter|turner|machinist|welder|cad|draughts/i },
  { id: 'it', label: 'Computers and IT', re: /computer|cse|\bit\b|information|copa|bca|mca|hardware|data/i },
  { id: 'business', label: 'Business, commerce and office', re: /commerce|management|mba|bba|b\.?com|secretar/i },
  { id: 'civil', label: 'Civil and construction', re: /civil|survey|architect|mason|carpenter/i },
];
export function talentPools(institutes, area) {
  const local = institutes.filter((i) => i.area === area);
  return POOLS.map((p) => ({ ...p, institutes: local.filter((i) => p.re.test((i.offers || []).join(' ') + ' ' + i.name)) }));
}
