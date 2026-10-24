// @ts-check
// Market signals for the Swift team: which skills local job ads ask for,
// whether the Swift AI Academy catalogue teaches them, whether other course
// providers already do, and what that suggests for the catalogue.
// Demand comes from current, in-scope, deduplicated ads only.
import { bridgeJobs } from './trades.js';

export const ACTIONS = {
  build: { label: 'Build a new course', order: 1 },
  extend: { label: 'Extend an existing course', order: 2 },
  curate: { label: 'Curate a free course', order: 3 },
  promote: { label: 'Promote an existing course', order: 4 },
  refer: { label: 'Refer to trade training', order: 5 },
  watch: { label: 'Watch for more demand', order: 6 },
};

/** Ad skill name -> skill name used in the provider scan. */
const SCAN_ALIAS = {
  'Basic English': 'English communication', Communication: 'English communication', Documentation: 'English writing',
  Typing: 'Typing and data entry', 'Data entry': 'Typing and data entry', Reporting: 'Excel', 'IT knowledge': 'Computer basics',
  'Office administration': 'Computer basics', 'Google Ads': 'Digital marketing', Python: 'Python for data', 'Machine learning': 'Machine learning foundations',
  Soldering: 'Soldering and PCB assembly', 'PCB assembly': 'Soldering and PCB assembly', 'Electronics testing': 'Soldering and PCB assembly',
  'Machine setting': 'CNC basics', 'Lathe operation': 'CNC basics', 'Vehicle repair': 'EV basics', 'Auto electrical wiring': 'EV basics',
  'Electrical maintenance': 'PLC and industrial automation', 'Plant machinery': 'PLC and industrial automation', Measurement: 'Quality inspection',
};
export const scanSkill = (skill) => SCAN_ALIAS[skill] || skill;

const strongEnglish = (r) => /strong english|fluent english/i.test([r.curator_note, r.shift?.raw].join(' '));
const asks = (r, skill) => r.skills.some((s) => s.name === skill) || (skill === 'English communication' && strongEnglish(r));
const fresherOk = (r) => (r.experience.min_months ?? 0) < 12;

/** Offerings in the provider scan for one skill. */
export function offeringsFor(skill, providers) {
  if (!providers?.offerings) return [];
  const key = scanSkill(skill).toLowerCase();
  return providers.offerings.filter((o) => String(o.skill).toLowerCase() === key);
}
const isFree = (o) => /^free/i.test(String(o.cost || ''));

/**
 * One row per skill: demand, Swift AI Academy coverage, market coverage and a suggested action.
 * @param {{ads:any[], trades:any[], saa:any, providers?:any}} input
 */
export function skillSignals({ ads, trades, saa, providers = null }) {
  const map = saa?.skill_map || {};
  const tradeSkills = new Set((saa?.trade_skills || []).map((s) => s.toLowerCase()));
  // How many ITI trades need the skill to reach a fresher job outside the trade.
  const bridgeTrades = new Map();
  for (const t of trades || []) {
    const need = new Set(bridgeJobs(t, ads).filter((b) => b.ready_as_fresher).flatMap((b) => b.gaps.map((g) => g.skill)));
    for (const s of need) bridgeTrades.set(s, (bridgeTrades.get(s) || 0) + 1);
  }
  const names = new Set([...ads.flatMap((r) => r.skills.map((s) => s.name)), ...Object.keys(map)]);
  if (ads.some(strongEnglish)) names.add('English communication');
  const rows = [...names].map((skill) => {
    const asking = ads.filter((r) => asks(r, skill));
    const fresh = asking.filter(fresherOk);
    const cover = map[skill] || { courses: [], fit: 'none' };
    const trade = tradeSkills.has(skill.toLowerCase());
    const offers = offeringsFor(skill, providers);
    const free = offers.filter(isFree);
    const nsqf = offers.filter((o) => o.nsqf_level != null);
    const bt = bridgeTrades.get(skill) || 0;
    const demand = asking.length;
    let action;
    if (trade) action = demand ? 'refer' : 'watch';
    else if (cover.fit === 'full') action = demand || bt ? 'promote' : 'watch';
    else if (cover.fit === 'partial') action = demand || bt ? 'extend' : 'watch';
    else if (!demand && !bt) action = 'watch';
    else if (free.length && demand < 3) action = 'curate';
    else action = 'build';
    const priority = demand + fresh.length >= 6 || bt >= 40 ? 'high' : demand + fresh.length >= 2 || bt >= 10 ? 'medium' : 'low';
    const why = [
      demand ? `${demand} of ${ads.length} ads ask for it${fresh.length ? `, ${fresh.length} open to freshers` : ''}.` : 'No current ad names it.',
      bt ? `${bt} ITI trade${bt > 1 ? 's' : ''} need it to reach a fresher job outside the trade.` : '',
      cover.fit === 'full' ? `Taught in ${cover.courses.join(', ')}.` : cover.fit === 'partial' ? `Partly taught in ${cover.courses.join(', ')}. ${cover.gap || ''}` : trade ? 'Hands-on trade skill: taught at ITIs and by Sector Skill Councils.' : 'Not in the Swift AI Academy catalogue.',
      offers.length ? `${offers.length} similar course${offers.length > 1 ? 's' : ''} elsewhere${free.length ? `, ${free.length} free` : ''}${nsqf.length ? `, ${nsqf.length} NSQF-aligned` : ''}.` : providers ? 'No similar course found in the provider scan.' : '',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return { skill, demand, fresh: fresh.length, of: ads.length, bridgeTrades: bt, trade, fit: cover.fit, courses: cover.courses, gap: cover.gap || null, offerings: offers, free: free.length, nsqf: nsqf.length, action, priority, why };
  });
  const prio = { high: 0, medium: 1, low: 2 };
  return rows.sort((a, b) => ACTIONS[a.action].order - ACTIONS[b.action].order || prio[a.priority] - prio[b.priority] || b.demand - a.demand || b.bridgeTrades - a.bridgeTrades || a.skill.localeCompare(b.skill));
}

/**
 * Local demand for each Swift AI Academy course: ads that ask for a skill the course teaches.
 * @param {any[]} ads
 * @param {any} saa
 */
export function courseDemand(ads, saa) {
  const map = saa?.skill_map || {};
  return (saa?.courses || []).map((c) => {
    const skills = Object.entries(map).filter(([, v]) => v.courses.includes(c.id)).map(([k]) => k);
    const hits = ads.filter((r) => skills.some((s) => asks(r, s)));
    return { id: c.id, title: c.title, track: c.track, level: c.level, coding: c.coding, hours: c.hours, languages: c.languages, skills, ads: hits.length, fresh: hits.filter(fresherOk).length };
  });
}

/**
 * Product signals beyond single courses. Each is an inference from the data, with its evidence.
 * @param {{ads:any[], saa:any, regions?:any, announcements?:any}} input
 */
export function platformSignals({ ads, saa, regions = null, announcements = null }) {
  const out = [];
  const n = ads.length;
  const english = ads.filter((r) => asks(r, 'English communication')).length;
  const comms = (saa?.courses || []).filter((c) => c.track === 'comms');
  const hindi = comms.filter((c) => c.languages.some((l) => /hindi/i.test(l) && !/text only|planned/i.test(l)));
  if (english) out.push({ title: 'Teach English through Hindi, and Bengali for West Bengal', evidence: `${english} of ${n} ads ask for English. ${comms.length - hindi.length} of ${comms.length} communication courses are taught in English only.${regions ? ' The platform also covers Kalyani and Siliguri.' : ''}`, suggestion: 'Add Hindi-medium instruction to the communication pathway first, then Bengali. Keep English as the target language, with explanations in the learner’s language.' });
  const coding = ads.filter((r) => r.skills.some((s) => /python|machine learning|sql/i.test(s.name))).length;
  const aiCourses = (saa?.courses || []).filter((c) => c.track === 'aiml').length;
  out.push({ title: 'Lead ITI learners into communication and data pathways, not AI/ML', evidence: `${coding} of ${n} local ads ask for Python, SQL or machine learning. The AI/ML pathway has ${aiCourses} courses that assume some coding.`, suggestion: 'Recommend Workplace Communication and Business Data Analyst to ITI learners. Keep Applied AI/ML for degree and diploma learners.' });
  const ann = ads.filter((r) => asks(r, 'Data annotation') || asks(r, 'AI tools')).length;
  out.push({ title: 'Add a no-code “AI at work” starter', evidence: `${ann} ad${ann === 1 ? ' asks' : 's ask'} for data annotation or AI tools. The only related content sits inside AI02, which needs some coding.`, suggestion: 'A short no-code course: using AI assistants at work, labelling data, checking quality. A natural first step for Class 12 and COPA learners.' });
  const fresh = ads.filter(fresherOk).length;
  out.push({ title: 'Design for freshers in their first job', evidence: `${fresh} of ${n} ads are open to freshers. Many name six-day weeks or shifts.`, suggestion: 'Short mobile lessons of 10 to 15 minutes, evening cohorts, and an interview-ready badge employers can check.' });
  const trades = new Set((announcements?.items || []).flatMap((a) => a.trades));
  if (trades.size) out.push({ title: 'Partner for trade skills instead of building them', evidence: `Announced projects nearby will need ${[...trades].slice(0, 4).join(', ')} and other trades. These are taught hands-on at ITIs and by Sector Skill Councils.`, suggestion: 'Refer learners to ITI, NSTI and Sector Skill Council courses for trade skills. Swift AI Academy adds the communication, data and AI layer on top.' });
  return out;
}
