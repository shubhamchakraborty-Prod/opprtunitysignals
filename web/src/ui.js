// Rendering helpers and plain-language labels shared by all views.
import { fmtDate, daysBetween } from '../../src/core/util.js';
import { STALE_AFTER_DAYS } from '../../src/core/constants.js';
import { isValidConfirmed } from '../../src/core/analytics.js';
import { isInScope } from '../../src/core/filters.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
export { fmtDate };

/** Plain-language status names (internal codes stay in exports). */
export const STATUS_LABEL = {
  observed_public: 'Seen online, not checked yet',
  pending_employer_check: 'Employer call planned',
  employer_confirmed: 'Confirmed by employer',
  contradicted: 'Employer says not hiring',
  expired: 'Closed',
  historical: 'Old ad',
};
export const BASIS_LABEL = {
  stated_in_listing: 'The ad names the sector',
  aggregator_label_only: 'Only the job website’s area label',
  curator_transcribed: 'Noted by our researcher from the ad',
  employer_confirmed: 'Confirmed by the employer',
  geocode_verified: 'Exact address checked on the map',
};
export const PRECISION_LABEL = { building: 'Building', address: 'Street address', locality: 'Block within the sector', sector: 'Sector only', citywide: 'Somewhere in Noida', unknown: 'Unknown' };
export const KIND_LABEL = { job_post: 'single job ad', category_page: 'list of ads on a job website', search_results_page: 'search results page', social_post: 'social media post', other_page: 'web page' };
export const FAMILY_LABEL = {
  'BPO & service': 'Customer service',
  'IT & analytics': 'IT and data',
  'Sales & business': 'Sales',
  Administration: 'Office and admin',
  'Electronics & manufacturing': 'Electronics production',
  'Mechanical & production': 'Machines and production',
};
export const familyLabel = (f) => FAMILY_LABEL[f] || f;

/** Traffic-light trust badge: what a layperson needs to know first. */
export function trust(r, asOf) {
  if (!isInScope(r)) return { cls: 'bad', text: 'Location unclear, not counted' };
  switch (r.verification_status) {
    case 'employer_confirmed': return isValidConfirmed(r, asOf) ? { cls: 'ok', text: `Confirmed by employer · ${r.vacancy_count_verified} opening${r.vacancy_count_verified > 1 ? 's' : ''}` } : { cls: 'warn', text: 'Confirmation out of date' };
    case 'pending_employer_check': return { cls: 'plan', text: 'Employer call planned' };
    case 'contradicted': return { cls: 'bad', text: 'Employer says not hiring' };
    case 'expired': return { cls: 'old', text: 'Closed' };
    case 'historical': return { cls: 'old', text: r.published_at ? `Old ad · ${fmtMonth(r.published_at)}` : 'Old ad' };
    default: return { cls: 'warn', text: 'Seen online · not checked yet' };
  }
}
export const trustBadge = (r, asOf) => {
  const t = trust(r, asOf);
  return `<span class="trust ${t.cls}">${esc(t.text)}</span>`;
};
export function statusChip(status) {
  const cls = { employer_confirmed: 'ok', observed_public: 'warn', pending_employer_check: 'plan', contradicted: 'bad', expired: 'old', historical: 'old' }[status] || 'old';
  return `<span class="trust ${cls}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

function fmtMonth(d) {
  const s = fmtDate(d).split(' ');
  return s.slice(1).join(' ');
}

export function staleBadge(r, asOf) {
  const d = daysBetween(r.last_rechecked_at || r.captured_at, asOf);
  return d != null && d > STALE_AFTER_DAYS ? `<span class="tag stale" title="Last checked ${d} days ago">Not checked for ${d} days</span>` : '';
}

export function postedText(r) {
  if (!r.published_at) return 'Post date not shown';
  return r.published_at_basis === 'derived_from_post_id' ? `Posted around ${fmtDate(r.published_at)} (worked out from the post ID)` : `Posted ${fmtDate(r.published_at)}`;
}

export const sectorTag = (r) => (isInScope(r) ? `<span class="sector-tag s${esc(r.sector)}">Sector ${esc(r.sector)}</span>` : '<span class="sector-tag sx">Not counted</span>');

export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hide');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hide'), 3500);
}

export function errorBox(e) {
  const details = e?.details?.length ? `<ul>${e.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '';
  return `<div class="errors" role="alert"><strong>${esc(e?.message || 'Something went wrong. Try again.')}</strong>${details}</div>`;
}

/**
 * Offer a file. Inside the claude.ai viewer this goes through the
 * `downloads` capability (the viewer confirms); elsewhere a normal download.
 */
export async function download(name, text, type) {
  const c = /** @type {any} */ (window).claude;
  if (c?.use) {
    try {
      const d = await c.use('downloads');
      if (d) {
        await d.save({ filename: name, data: text });
        return;
      }
    } catch (e) {
      if (e?.code === 'declined') return;
    }
  }
  const a = document.createElement('a');
  const u = URL.createObjectURL(new Blob([text], { type }));
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}

export function lockNotice(title, text) {
  return `<div class="lock" role="note"><h3>${esc(title)}</h3><p>${esc(text)}</p><div><button class="btn" data-action="open-signin">Team sign-in</button></div></div>`;
}

export const pct = (n, d) => (d ? Math.round((n / d) * 100) + '%' : '-');
