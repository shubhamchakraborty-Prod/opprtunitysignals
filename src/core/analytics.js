// @ts-check
// Analytics with explicit denominators, as-of dates and refusal rules.
// Every function returns enough metadata for the UI to explain the number,
// or a status explaining why no number is shown.
import { PRECISE_GEO_BASES, PUBLIC_EVIDENCE_SOURCE_TYPES, NARRATIVE_SOURCE_TYPES, RECENT_WINDOW_DAYS, TREND_MIN_PER_WAVE, VERIFICATION_VALID_DAYS, INTERVIEW_THEMES, PILOT_SECTORS } from './constants.js';
import { filterOpportunities, isOlder, isInScope, isPublished, displaySector } from './filters.js';
import { representatives } from './dedupe.js';
import { daysBetween, tally, fmtDate } from './util.js';
import { extractEmploymentTerms } from './terms.js';

/** Current public signal: public evidence source, not historical/expired/contradicted. */
const isCurrentPublicSignal = (r) =>
  PUBLIC_EVIDENCE_SOURCE_TYPES.includes(r.source_type) && !isOlder(r) && r.verification_status !== 'contradicted' && r.evidence_type !== 'employer_presence';

/**
 * Is a confirmed opening usable for the verified-openings KPI on date asOf?
 * Never true for observed_public records, whatever their claimed vacancies.
 */
export function isValidConfirmed(r, asOf) {
  if (r.verification_status !== 'employer_confirmed') return false;
  if (!isPublished(r) || !isInScope(r)) return false;
  if (r.evidence_type === 'employer_presence') return false;
  if (!Number.isInteger(r.vacancy_count_verified) || r.vacancy_count_verified <= 0) return false;
  if (r.expiry && r.expiry < asOf) return false;
  const age = daysBetween(r.verified_at, asOf);
  return age != null && age >= 0 && age <= VERIFICATION_VALID_DAYS;
}

/**
 * Headline counters. All respect the same filters so switching sector updates everything.
 * @param {any[]} records all records (any state)
 * @param {import('./filters.js').Filters} f
 * @param {{asOf:string, pendingVerifications?:any[]}} opts
 */
export function computeKpis(records, f, { asOf, pendingVerifications = [] }) {
  const visible = filterOpportunities(records, f);
  const reps = representatives(visible);
  const current = reps.filter((r) => isCurrentPublicSignal(r) && isInScope(r));
  const olderShown = reps.filter((r) => isOlder(r)).length;
  const unclearShown = reps.filter((r) => !isInScope(r)).length;
  const mirrorsCollapsed = visible.length - reps.length;
  const confirmed = reps.filter((r) => isValidConfirmed(r, asOf));
  const staleConfirmed = reps.filter((r) => r.verification_status === 'employer_confirmed' && !isValidConfirmed(r, asOf));
  const confirmedTotal = confirmed.reduce((s, r) => s + r.vacancy_count_verified, 0);
  const verifiedDates = confirmed.map((r) => r.verified_at).sort();
  const sectorOf = (sec) => current.filter((r) => r.sector === sec);
  const byPrecision = (list) => ({
    precise: list.filter((r) => PRECISE_GEO_BASES.includes(r.geo.basis)).length,
    labelOnly: list.filter((r) => !PRECISE_GEO_BASES.includes(r.geo.basis)).length,
  });
  const captured = current.map((r) => r.captured_at).sort();
  const pendingOpenings = pendingVerifications
    .filter((v) => v.outcome === 'confirmed' && v.approval?.state === 'pending')
    .filter((v) => f.sector === 'all' || v.work_location?.sector === f.sector)
    .reduce((s, v) => s + (v.roles || []).reduce((a, x) => a + (Number(x.openings) || 0), 0), 0);
  return {
    signalCount: current.length,
    signalWindow: captured.length ? { from: captured[0], to: captured[captured.length - 1] } : null,
    sector62: sectorOf('62').length,
    sector63: sectorOf('63').length,
    sector62Precision: byPrecision(sectorOf('62')),
    sector63Precision: byPrecision(sectorOf('63')),
    olderShown,
    unclearShown,
    mirrorsCollapsed,
    confirmedOpenings: confirmedTotal,
    confirmedRecords: confirmed.length,
    confirmedAsOf: verifiedDates.length ? { earliest: verifiedDates[0], latest: verifiedDates[verifiedDates.length - 1] } : null,
    staleConfirmed: staleConfirmed.length,
    pendingApprovalOpenings: pendingOpenings,
    claimedButUnverified: current.filter((r) => r.vacancy_claimed && r.verification_status !== 'employer_confirmed').reduce((s, r) => s + r.vacancy_claimed, 0),
    listCount: reps.length,
  };
}

/** Records used for sector comparison: current, in scope, deduplicated. */
export function comparisonBase(records, sector) {
  const f = { sector, query: '', family: 'all', career: 'all', includeHistorical: false, includeUnclear: false, verification: 'all', from: null, to: null };
  return representatives(filterOpportunities(records, /** @type {any} */ (f))).filter((r) => isCurrentPublicSignal(r) && isInScope(r));
}

/**
 * Role prevalence: share of sampled records in each occupation family.
 * Explicitly scoped to the collected sample.
 */
export function rolePrevalence(records, sector) {
  const base = comparisonBase(records, sector);
  const n = base.length;
  return {
    denominator: n,
    scope: `Share of ${n} deduplicated public records collected for ${sector === 'all' ? 'Sectors 62 and 63' : 'Sector ' + sector}. Not a share of all hiring.`,
    rows: tally(base.map((r) => r.occupation_family)).map(([family, count]) => ({ family, count, share: n ? count / n : null })),
  };
}

/**
 * Requirement frequencies in recent ads (skills, education, experience, terms).
 * @param {any[]} records
 * @param {'all'|'62'|'63'} sector
 * @param {string} asOf
 */
export function requirementFrequencies(records, sector, asOf, windowDays = RECENT_WINDOW_DAYS) {
  const base = comparisonBase(records, sector).filter((r) => {
    const d = daysBetween(r.published_at || r.captured_at, asOf);
    return d != null && d >= 0 && d <= windowDays;
  });
  const n = base.length;
  const skills = tally(base.flatMap((r) => r.skills.map((s) => s.name)));
  const terms = tally(base.flatMap((r) => extractEmploymentTerms(r).map((t) => t.label)));
  const edu = base.filter((r) => r.education.stated).length;
  const exp12 = base.filter((r) => (r.experience.min_months ?? 0) >= 12).length;
  const expUnknown = base.filter((r) => r.experience.min_months == null).length;
  const wageStated = base.filter((r) => r.wage.stated).length;
  return {
    denominator: n,
    windowDays,
    skills: skills.map(([name, count]) => ({ name, count })),
    terms: terms.map(([name, count]) => ({ name, count, category: 'employment_terms' })),
    missingness: [
      { field: 'Education requirement', stated: edu, missing: n - edu },
      { field: 'Pay advertised', stated: wageStated, missing: n - wageStated },
      { field: 'Experience requirement', stated: n - expUnknown, missing: expUnknown },
    ],
    experienceOneYearPlus: exp12,
  };
}

/** Source coverage: which platforms and evidence kinds feed each sector. */
export function sourceCoverage(records, sector) {
  const base = comparisonBase(records, sector);
  return {
    denominator: base.length,
    platforms: tally(base.map((r) => r.platform)).map(([name, count]) => ({ name, count })),
    pageKinds: tally(base.map((r) => r.source_url_kind)).map(([name, count]) => ({ name, count })),
    locationBasis: tally(base.map((r) => r.geo.basis)).map(([name, count]) => ({ name, count })),
    employerConfirmed: base.filter((r) => r.verification_status === 'employer_confirmed').length,
  };
}

/**
 * Trend: computed only when at least two comparable capture waves exist.
 * Comparable = same capture method, same platform set, both sectors covered,
 * and at least TREND_MIN_PER_WAVE records per wave.
 */
export function requirementTrend(records) {
  const base = records.filter((r) => isPublished(r) && r.source_type === 'public_listing' && r.verification_status !== 'historical' && isInScope(r));
  const waves = new Map();
  for (const r of base) {
    const k = String(r.captured_at).slice(0, 7);
    if (!waves.has(k)) waves.set(k, []);
    waves.get(k).push(r);
  }
  const list = [...waves.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([wave, rs]) => ({
    wave, n: rs.length, platforms: [...new Set(rs.map((r) => r.platform))].sort().join('|'), sectors: [...new Set(rs.map((r) => r.sector))].sort().join('|'),
  }));
  const blocking = [];
  if (list.length < 2) blocking.push(`Only ${list.length} capture wave${list.length === 1 ? '' : 's'} (${list.map((w) => w.wave).join(', ') || 'none'}). At least two comparable waves are needed.`);
  const small = list.filter((w) => w.n < TREND_MIN_PER_WAVE);
  if (small.length) blocking.push(`${small.length} wave(s) have fewer than ${TREND_MIN_PER_WAVE} records.`);
  if (list.length >= 2 && new Set(list.map((w) => w.platforms)).size > 1) blocking.push('Waves use different platform sets, so they are not comparable.');
  if (list.length >= 2 && list.some((w) => w.sectors !== PILOT_SECTORS.join('|'))) blocking.push('Not every wave covers both sectors.');
  const historical = records.filter((r) => r.verification_status === 'historical').length;
  const reasons = [...blocking];
  if (historical) reasons.push(`${historical} historical post(s) exist but were collected differently and are not a comparable baseline.`);
  if (blocking.length) {
    return { status: 'insufficient_evidence', message: 'Insufficient evidence to say whether requirements are rising or falling.', waves: list, reasons };
  }
  const [a, b] = [list[list.length - 2], list[list.length - 1]];
  const freq = (wave) => {
    const rs = waves.get(wave);
    const t = new Map(tally(rs.flatMap((r) => r.skills.map((s) => s.name))));
    return { t, n: rs.length };
  };
  const fa = freq(a.wave), fb = freq(b.wave);
  const names = new Set([...fa.t.keys(), ...fb.t.keys()]);
  return {
    status: 'ok', message: `Comparison of ${a.wave} (n=${a.n}) with ${b.wave} (n=${b.n}).`, waves: list, reasons,
    rows: [...names].map((name) => ({ name, before: (fa.t.get(name) || 0) / fa.n, after: (fb.t.get(name) || 0) / fb.n })).sort((x, y) => (y.after - y.before) - (x.after - x.before)),
  };
}

/**
 * Sentiment from attributed, consented narratives only. Job adverts are rejected.
 * @param {any[]} narratives interview / workforce_sentiment records
 * @param {{enabled:boolean}} settings
 */
export function sentimentSummary(narratives, settings) {
  const usable = narratives.filter((n) => NARRATIVE_SOURCE_TYPES.includes(n.source_type) && n.consent?.obtained === true && n.review?.state === 'approved');
  const rejected = narratives.length - usable.length;
  if (!settings?.enabled) {
    return { status: 'disabled', message: 'No measured sentiment available.', detail: 'The sentiment layer is switched off until attributed, consented interviews are collected and approved.', usable: usable.length, rejected };
  }
  if (!usable.length) return { status: 'no_data', message: 'No measured sentiment available.', detail: 'No approved, consented employer or worker interviews have been recorded.', usable: 0, rejected };
  const byGroup = tally(usable.map((n) => n.respondent_group));
  const themes = INTERVIEW_THEMES.map((theme) => {
    const mentions = usable.filter((n) => (n.themes || []).some((t) => t.theme === theme));
    const quotes = mentions.flatMap((n) => (n.themes || []).filter((t) => t.theme === theme && t.quote && n.consent?.quote_allowed).map((t) => ({ quote: t.quote, group: n.respondent_group, sector: n.sector })));
    return {
      theme,
      mentions: mentions.length,
      of: usable.length,
      byGroup: tally(mentions.map((n) => n.respondent_group)).map(([group, count]) => ({ group, count })),
      quotes: quotes.slice(0, 3),
    };
  });
  return {
    status: 'ok',
    message: `${usable.length} consented interview(s): ${byGroup.map(([g, c]) => `${c} ${g}`).join(', ')}.`,
    method: 'Themes coded by a researcher from interview notes using a fixed codebook (aspirations, commute, pay, safety, work hours, retention). Counts are interviews mentioning a theme, not population shares. No sentiment score is derived from job adverts.',
    sampleSizes: byGroup.map(([group, count]) => ({ group, count })),
    themes,
    usable: usable.length,
    rejected,
  };
}

/**
 * Demand coverage = verified openings / expected ITI pass-outs, by trade and catchment.
 * Returns ratio null with reasons whenever the denominator is missing or zero.
 * @param {{trade:string, openings:number}[]} verifiedByTrade
 * @param {any[]} passouts rows {trade, catchment, expected_passouts, year, source, approved}
 */
export function demandCoverage(verifiedByTrade, passouts, catchment = 'Gautam Buddh Nagar') {
  const trades = [...new Set([...verifiedByTrade.map((v) => v.trade), ...passouts.map((p) => p.trade)])].filter((t) => t && t !== 'non_iti').sort();
  if (!trades.length) {
    return { status: 'not_available', rows: [], reasons: ['No employer-confirmed openings mapped to an ITI trade.', 'No authorised ITI pass-out dataset has been loaded for this catchment.'] };
  }
  const rows = trades.map((trade) => {
    const openings = verifiedByTrade.filter((v) => v.trade === trade).reduce((s, v) => s + v.openings, 0);
    const p = passouts.find((x) => x.trade === trade && x.catchment === catchment && x.approved);
    const reasons = [];
    if (!p) reasons.push('No approved expected pass-out figure for this trade and catchment.');
    else if (!(p.expected_passouts > 0)) reasons.push('Expected pass-outs recorded as zero; a ratio would be meaningless.');
    if (!openings) reasons.push('No employer-confirmed openings for this trade.');
    const ok = p && p.expected_passouts > 0 && openings > 0;
    return { trade, catchment, openings, expected_passouts: p ? p.expected_passouts : null, year: p?.year ?? null, source: p?.source ?? null, ratio: ok ? openings / p.expected_passouts : null, display: ok ? (openings / p.expected_passouts).toFixed(2) : 'Not available', reasons };
  });
  return { status: rows.some((r) => r.ratio != null) ? 'partial' : 'not_available', rows, reasons: rows.every((r) => r.ratio == null) ? ['No trade has both confirmed openings and an approved pass-out figure.'] : [] };
}

/** Verified openings grouped by trade (from approved verification roles). */
export function verifiedOpeningsByTrade(records, asOf) {
  return records.filter((r) => isValidConfirmed(r, asOf)).flatMap((r) => (r.verified_roles || []).map((v) => ({ trade: v.trade || 'non_iti', openings: Number(v.openings) || 0, source_id: r.source_id })));
}

/** Freshness statement for a set of records. */
export function freshness(records, asOf, staleDays = 14) {
  const dates = records.map((r) => r.last_rechecked_at || r.captured_at).filter(Boolean).sort();
  const stale = records.filter((r) => (daysBetween(r.last_rechecked_at || r.captured_at, asOf) ?? 0) > staleDays).length;
  return { oldest: dates[0] || null, newest: dates[dates.length - 1] || null, stale, total: records.length, text: dates.length ? `Rechecked between ${fmtDate(dates[0])} and ${fmtDate(dates[dates.length - 1])}; ${stale} of ${records.length} older than ${staleDays} days.` : 'No records.' };
}

export { displaySector };
