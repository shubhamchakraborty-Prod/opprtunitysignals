// Source register: every record traced to its source, with freshness,
// verification status, confidence and follow-up flagging.
import { app } from '../app.js';
import { esc, $, fmtDate, trustBadge, staleBadge, postedText, sectorTag, KIND_LABEL, BASIS_LABEL } from '../ui.js';
import { freshness } from '../../../src/core/analytics.js';
import { evidenceStrength } from '../../../src/core/schema.js';

export function renderRegister() {
  const recs = app.data.records.filter((r) => r.review.state === 'approved').sort((a, b) => a.source_id.localeCompare(b.source_id));
  const fr = freshness(recs, app.data.asOf);
  $('#evidence').innerHTML = `<div class="section-head"><div><h2>Where every number comes from</h2><p>Every ad links back to the page we saw it on. Use the links to check whether the job is still open.</p></div><div class="actions"><button class="btn primary" data-action="register-download">Download all sources (CSV)</button><button class="btn" data-action="note-download">Download management note</button></div></div>
  <div class="callout"><strong>Good to know.</strong> A job ad is not a confirmed job. A company being based here does not mean it is hiring. Job-website totals often include nearby areas, so we never use them as job counts. <strong>Freshness:</strong> ${esc(fr.text)}</div>
  <div class="table-scroll"><table class="minitable"><thead><tr><th>Job ad</th><th>Area</th><th>Where we saw it</th><th>Dates</th><th>Status</th><th>How sure we are</th></tr></thead><tbody>
  ${recs.map((r) => `<tr><td><a href="${esc(r.source_url)}" rel="noopener" target="_blank"><strong>${esc(r.role_title_raw)}</strong> ↗</a><div class="note">${esc(r.employer_identity || 'Employer not named')}${r.recruiter_identity ? ' via ' + esc(r.recruiter_identity) : ''} · <span class="mono">${esc(r.source_id)}</span></div>${r.open_flags.length ? `<div class="badges" style="margin-top:4px">${r.open_flags.map((f) => `<span class="tag stale">${esc(f.replace(/_/g, ' '))}</span>`).join('')}</div>` : ''}</td>
  <td>${sectorTag(r)}<div class="note" style="margin-top:4px">${esc(BASIS_LABEL[r.geo.basis] || r.geo.basis)}</div></td>
  <td>${esc(r.platform)}<div class="note">${esc(KIND_LABEL[r.source_url_kind] || r.source_url_kind)}</div></td>
  <td>Seen ${fmtDate(r.captured_at)}<div class="note">${esc(postedText(r))}<br/>Checked ${fmtDate(r.last_rechecked_at)}</div>${staleBadge(r, app.data.asOf)}</td>
  <td>${trustBadge(r, app.data.asOf)}</td>
  <td><strong style="text-transform:capitalize">${esc(r.confidence.level)}</strong><div class="note">${esc(r.confidence.rationale)}</div></td></tr>`).join('')}</tbody></table></div>
  <p class="note">Method adapted from ConveGenius.AI’s West Bengal PM SETU Strategic Investment Plan (sections 5.3 to 5.4 and 6.1). This is a Noida test, not an official West Bengal or Noida government deployment.</p>`;
}

app.views.evidence = renderRegister;
