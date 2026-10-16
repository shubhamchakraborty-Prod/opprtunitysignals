// @ts-check
// Deterministic parsers that turn transcribed listing text into structured
// fields. They never guess: anything unrecognised becomes null ("not stated").

/**
 * Parse an advertised wage string.
 * Supports "₹40,000–₹60,000 / month", "₹2.3–₹3 lakh / year", "Up to ₹25,000 / month",
 * "₹5–₹8 lakh / year + incentives", "Not stated".
 * @param {string|null|undefined} raw
 * @returns {{min:number|null,max:number|null,period:string|null,currency:'INR',incentives:boolean,stated:boolean,raw:string}}
 */
export function parseWage(raw) {
  const text = String(raw ?? '').trim();
  const out = { min: null, max: null, period: null, currency: /** @type {'INR'} */ ('INR'), incentives: /incentive/i.test(text), stated: false, raw: text || 'Not stated' };
  if (!text || /not stated/i.test(text)) return out;
  const lakh = /lakh|lac|lpa/i.test(text);
  const period = /year|annum|lpa|p\.?a\.?/i.test(text) ? 'year' : /month|pm\b/i.test(text) ? 'month' : /day/i.test(text) ? 'day' : /hour/i.test(text) ? 'hour' : null;
  const nums = (text.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (!nums.length) return out;
  const scale = lakh ? 100000 : 1;
  const vals = nums.slice(0, 2).map((n) => Math.round(n * scale));
  if (/up to|upto|max/i.test(text) && vals.length === 1) {
    out.max = vals[0];
  } else {
    out.min = vals[0];
    out.max = vals.length > 1 ? vals[1] : vals[0];
  }
  out.period = period;
  out.stated = true;
  return out;
}

/**
 * Parse an experience requirement into months.
 * @param {string|null|undefined} raw
 * @returns {{raw:string,min_months:number|null,max_months:number|null,fresher_ok:boolean|null}}
 */
export function parseExperience(raw) {
  const text = String(raw ?? '').trim();
  const out = { raw: text || 'Not stated', min_months: null, max_months: null, fresher_ok: null };
  if (!text || /not stated/i.test(text)) return out;
  if (/any experience|fresher/i.test(text)) {
    out.min_months = 0;
    out.fresher_ok = true;
  }
  // "6 months–1 year", "3–4 years", "1+ year", "up to 6 months"
  const parts = text.toLowerCase().replace(/–|—/g, '-').match(/(\d+(?:\.\d+)?)\s*\+?\s*(months?|years?|yrs?)?/g) || [];
  /** @type {number[]} */
  const months = [];
  let lastUnit = null;
  const tokens = parts.map((p) => {
    const m = p.match(/(\d+(?:\.\d+)?)\s*\+?\s*(months?|years?|yrs?)?/);
    return { n: Number(m?.[1]), unit: m?.[2] || null };
  });
  // Units apply backwards: "3-4 years" means both in years.
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].unit) lastUnit = tokens[i].unit;
    const u = tokens[i].unit || lastUnit || 'years';
    months[i] = /month/.test(u) ? tokens[i].n : Math.round(tokens[i].n * 12);
  }
  if (months.length) {
    if (/up to/i.test(text) && out.fresher_ok) {
      out.max_months = months[0];
    } else {
      out.min_months = out.min_months === 0 && /fresher/i.test(text) ? 0 : months[0];
      out.max_months = /\+/.test(text) ? null : months.length > 1 ? months[1] : null;
      out.fresher_ok = out.min_months === 0;
    }
  }
  return out;
}

/**
 * Parse an education statement into accepted tokens. Unknown stays unstated.
 * @param {string|null|undefined} raw
 * @returns {{raw:string,accepted:string[],stated:boolean}}
 */
export function parseEducation(raw) {
  const text = String(raw ?? '').trim();
  const t = text.toLowerCase();
  const out = { raw: text || 'Not stated', accepted: /** @type {string[]} */ ([]), stated: false };
  if (!text || /not stated/.test(t)) return out;
  if (/12th|10\+2|hsc|intermediate/.test(t)) out.accepted.push('12th');
  if (/10th|matric|ssc/.test(t)) out.accepted.push('10th');
  if (/iti/.test(t)) {
    if (/electronic/.test(t)) out.accepted.push('iti_electronics_mechanic');
    else if (/fitter/.test(t)) out.accepted.push('iti_fitter');
    else if (/machinist/.test(t)) out.accepted.push('iti_machinist');
    else if (/turner/.test(t)) out.accepted.push('iti_turner');
    else if (/copa|computer operator/.test(t)) out.accepted.push('iti_copa');
    else if (/electrician/.test(t)) out.accepted.push('iti_electrician');
    else out.accepted.push('iti_any');
  }
  if (/diploma/.test(t)) out.accepted.push('diploma');
  if (/b\.?tech|b\.?e\b|engineering degree/.test(t)) out.accepted.push('engineering_degree');
  else if (/degree|graduate|bachelor/.test(t)) out.accepted.push('degree');
  out.stated = out.accepted.length > 0;
  return out;
}

/**
 * Pull the sector number out of free text such as "H Block, Sector 63".
 * @param {string|null|undefined} text
 * @returns {string|null}
 */
export function sectorFromText(text) {
  const m = String(text ?? '').match(/sector[\s-]*(\d{1,3})/i);
  return m ? m[1] : null;
}

/** LinkedIn / TymblHub / Indeed post identifiers where the URL carries one. */
export function originalPostIdFromUrl(url) {
  const u = String(url ?? '');
  let m = u.match(/linkedin\.com\/jobs\/view\/[^?#]*?(\d{8,})/);
  if (m) return m[1];
  m = u.match(/activity-(\d{10,})/);
  if (m) return m[1];
  m = u.match(/jid-(\d+)/);
  if (m) return m[1];
  m = u.match(/-(\d{5,})-jid$/);
  if (m) return m[1];
  m = u.match(/placementindia\.com\/job-detail\/.*-(\d+)\.htm/);
  if (m) return m[1];
  m = u.match(/teamlease\.com\/jobs\/.*-(\d+)$/);
  if (m) return m[1];
  m = u.match(/[?&]jk=([a-f0-9]+)/i);
  if (m) return m[1];
  return null;
}

/** Classify the kind of page a URL points to; listing pages are weaker evidence. */
export function urlKind(url) {
  const u = String(url ?? '');
  if (/linkedin\.com\/posts\//.test(u)) return 'social_post';
  if (/linkedin\.com\/jobs\/view\//.test(u) || /jid-\d+/.test(u) || /-\d{5,}-jid$/.test(u) || /[?&]jk=/.test(u) || /placementindia\.com\/job-detail\//.test(u) || /teamlease\.com\/jobs\/.*-\d+$/.test(u)) return 'job_post';
  if (/placementindia\.com\/job-search\//.test(u) || /workindia\.in\/[a-z-]*jobs-in-/.test(u)) return 'category_page';
  if (/indeed\.[a-z.]+\/q-/.test(u)) return 'search_results_page';
  if (/apna\.co\/jobs\/[a-z-]*jobs-in-/.test(u)) return 'category_page';
  return 'other_page';
}
