// Rendering helpers shared by all views.
import { fmtDate, daysBetween } from '../../src/core/util.js';
import { STALE_AFTER_DAYS } from '../../src/core/constants.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
export { fmtDate };

export const STATUS_LABEL = {
  observed_public: 'Observed in public source',
  pending_employer_check: 'Pending employer check',
  employer_confirmed: 'Employer confirmed',
  contradicted: 'Contradicted by employer',
  expired: 'Expired',
  historical: 'Historical',
};
export const STATUS_CHIP = { observed_public: 'teal', pending_employer_check: 'amber', employer_confirmed: 'navy', contradicted: 'red', expired: 'grey', historical: 'amber' };
export const BASIS_LABEL = {
  stated_in_listing: 'Sector stated in listing',
  aggregator_label_only: 'Sector from portal label only',
  curator_transcribed: 'Sector transcribed by curator',
  employer_confirmed: 'Location confirmed by employer',
  geocode_verified: 'Verified geocoded address',
};
export const PRECISION_LABEL = { building: 'Building', address: 'Address', locality: 'Locality / block', sector: 'Sector only', citywide: 'Citywide', unknown: 'Unknown' };
export const KIND_LABEL = { job_post: 'individual post', category_page: 'category page', search_results_page: 'search-results page', social_post: 'social post', other_page: 'web page' };

export function statusChip(status) {
  return `<span class="chip ${STATUS_CHIP[status] || ''}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

export function staleBadge(r, asOf) {
  const d = daysBetween(r.last_rechecked_at || r.captured_at, asOf);
  return d != null && d > STALE_AFTER_DAYS ? `<span class="stale" title="Last rechecked ${d} days ago">Stale ${d}d</span>` : '';
}

export function postedText(r) {
  if (!r.published_at) return 'Post date not shown';
  return r.published_at_basis === 'derived_from_post_id' ? `Posted c. ${fmtDate(r.published_at)} (derived from post ID)` : `Posted ${fmtDate(r.published_at)}`;
}

export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hide');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hide'), 3500);
}

export function errorBox(e) {
  const details = e?.details?.length ? `<ul>${e.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '';
  return `<div class="errors" role="alert"><strong>${esc(e?.message || 'Something went wrong')}</strong>${details}</div>`;
}

export function download(name, text, type) {
  const a = document.createElement('a');
  const u = URL.createObjectURL(new Blob([text], { type }));
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}

export function lockNotice(text) {
  return `<div class="lock" role="note"><strong>Restricted.</strong> ${esc(text)} Use “Viewing as” at the top right to sign in with an authorised role.</div>`;
}

export const pct = (n, d) => (d ? Math.round((n / d) * 100) + '%' : '-');
