// @ts-check
// Management note generator. Plain Markdown so it can be pasted into a file
// note, emailed, or printed. Separates fact, inference and recommendation.
import { fmtDate } from './util.js';
import { planningBoard, TIERS, wageText } from './decisions.js';

/**
 * @param {{asOf:string, filters:any, kpis:any, prevalence:any, requirements:any, coverage:any, trend:any, sentiment:any, demandCoverage:any, records:any[], freshness:any}} a
 */
export function buildManagementNote(a) {
  const f = a.filters;
  const k = a.kpis;
  const scope = f.sector === 'all' ? 'Sectors 62 and 63' : `Sector ${f.sector}`;
  const board = planningBoard(a.records, a.asOf);
  const platforms = [...new Set(a.records.map((r) => r.platform))].sort();
  const lines = [];
  const p = (s = '') => lines.push(s);
  p(`# Management note: Noida ${scope} opportunity evidence`);
  p();
  p(`Prepared ${fmtDate(a.asOf)} from the Industry Opportunity Explorer (ConveGenius.AI internal pilot). Not an official employment statistic.`);
  p();
  p('## Filters and scope');
  p();
  p('| Item | Value |');
  p('|---|---|');
  p(`| Geography | Noida ${scope}, Gautam Buddh Nagar, Uttar Pradesh |`);
  p(`| Occupation group | ${f.family === 'all' ? 'All' : f.family} |`);
  p(`| Experience level | ${f.career === 'all' ? 'All' : f.career} |`);
  p(`| Search text | ${f.query || 'None'} |`);
  p(`| Older / expired signals | ${f.includeHistorical ? 'Included, dated' : 'Excluded'} |`);
  p(`| Unclear / adjacent locations | ${f.includeUnclear ? 'Listed separately, not counted' : 'Excluded'} |`);
  p(`| Sources | ${platforms.join(', ') || 'None'} |`);
  p(`| Freshness | ${a.freshness.text} |`);
  p();
  p('## Source facts');
  p();
  p(`- ${k.signalCount} deduplicated current public signals${k.signalWindow ? `, captured ${fmtDate(k.signalWindow.from)} to ${fmtDate(k.signalWindow.to)}` : ''} (Sector 62: ${k.sector62}; Sector 63: ${k.sector63}).`);
  p(`- Employer-confirmed openings: **${k.confirmedOpenings}**${k.confirmedAsOf ? ` (verified ${fmtDate(k.confirmedAsOf.earliest)} to ${fmtDate(k.confirmedAsOf.latest)})` : ' (no approved employer verification yet)'}.`);
  if (k.pendingApprovalOpenings) p(`- ${k.pendingApprovalOpenings} further opening(s) reported by employers are awaiting second-person approval and are not counted.`);
  if (k.claimedButUnverified) p(`- Adverts claim ${k.claimedButUnverified} opening(s) in total. These are advertiser claims and are not counted as vacancies.`);
  if (k.mirrorsCollapsed) p(`- ${k.mirrorsCollapsed} mirrored or duplicate post(s) were collapsed and counted once.`);
  if (k.unclearShown) p(`- ${k.unclearShown} record(s) with unclear or adjacent locations are listed but not counted in either sector.`);
  p();
  p('## Inferences (sample-based, not population estimates)');
  p();
  for (const s of ['62', '63']) {
    const pr = a.prevalence[s];
    const top = pr.rows.slice(0, 3).map((r) => `${r.family} ${r.count}/${pr.denominator}`).join('; ');
    p(`- Sector ${s}: ${top || 'no records'}. ${pr.scope}`);
  }
  p(`- Trend: ${a.trend.message} ${a.trend.reasons.join(' ')}`);
  p(`- Worker and employer sentiment: ${a.sentiment.message}`);
  const dc = a.demandCoverage;
  p(`- Demand coverage (verified openings / expected ITI pass-outs): ${dc.rows.some((r) => r.ratio != null) ? dc.rows.map((r) => `${r.trade} ${r.display}`).join('; ') : 'Not available. ' + (dc.reasons.join(' ') || dc.rows.flatMap((r) => r.reasons).join(' '))}`);
  p();
  p('## Recommendations');
  p();
  for (const tier of Object.keys(TIERS)) {
    const items = board[tier];
    p(`### ${TIERS[tier].label} (${items.length})`);
    p();
    if (!items.length) { p('- None.'); p(); continue; }
    for (const { r, reasons } of items) p(`- ${r.source_id} · ${r.role_title_raw} · ${r.employer_identity || r.recruiter_identity || 'Undisclosed'} · Sector ${r.sector || r.geo.claimed_sector + ' (unclear)'} · ${wageText(r.wage)}. ${reasons.join(' ')}`);
    p();
  }
  p('## What must be verified before planning use');
  p();
  p('- Whether each advertised role is still open, and how many people the employer will hire.');
  p('- Entry pay, shift pattern, start date and any pre-screening tests.');
  p('- Whether the employer accepts ITI pass-outs (and which trades) for roles where education is not stated.');
  p('- Exact workplace address. Map pins are sector-level illustrations unless marked "verified geocode".');
  p('- Expected ITI pass-outs by trade for the catchment, from an authorised dataset, before any coverage ratio is used.');
  p();
  p('## Confidence and limitations');
  p();
  p('- Public adverts are observations, not hiring commitments. Job-board search totals are never used as vacancy totals.');
  p('- Many records come from portal category pages whose sector label may include nearby areas.');
  p('- Skill names were normalised by a curator. Skill overlap with a learner profile is not hiring eligibility.');
  p('- Employment terms such as night shift or a six-day week are advert conditions, not worker sentiment.');
  p();
  p('## Source register');
  p();
  p('| ID | Role | Employer | Sector | Platform | Captured | Status | Link |');
  p('|---|---|---|---|---|---|---|---|');
  for (const r of a.records) p(`| ${r.source_id} | ${r.role_title_raw} | ${r.employer_identity || r.recruiter_identity || 'Undisclosed'} | ${r.sector || 'unclear'} | ${r.platform} | ${fmtDate(r.captured_at)} | ${r.verification_status} | ${r.source_url} |`);
  p();
  return lines.join('\n');
}
