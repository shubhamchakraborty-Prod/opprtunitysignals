// Source register: every record traced to its source, with freshness,
// verification status, confidence and follow-up flagging.
import { app } from '../app.js';
import { esc, $, fmtDate, statusChip, staleBadge, postedText, KIND_LABEL, BASIS_LABEL } from '../ui.js';
import { freshness } from '../../../src/core/analytics.js';
import { evidenceStrength } from '../../../src/core/schema.js';

export function renderRegister() {
  const recs = app.data.records.filter((r) => r.review.state === 'approved').sort((a, b) => a.source_id.localeCompare(b.source_id));
  const fr = freshness(recs, app.data.asOf);
  $('#evidence').innerHTML = `<div class="wide" style="max-width:1300px"><h2 class="section-title">Trace every signal back to a source</h2><p class="section-description">The register lists every approved record, the kind of evidence, how its location is known, when it was last rechecked and whether an employer has confirmed an opening. Use the links to recheck the current situation.</p>
  <div class="source-note"><strong>Quality and interpretation:</strong> Public listings are observations, not verified hiring commitments. An employer's presence in an area is not proof of a vacancy. Job-board search totals often include positions outside the precise locality, so they are never used as vacancy totals. No worker-sentiment score, trend or demand-coverage ratio is calculated without suitable data. <strong>Freshness:</strong> ${esc(fr.text)}</div>
  <div class="detail-actions" style="margin:0 0 12px"><button class="btn strong" data-action="register-download">Download full source register (.csv)</button><button class="btn" data-action="note-download">Download management note (.md)</button></div>
  <div style="overflow:auto;border:1px solid var(--line)"><table class="sources-table"><thead><tr><th>Signal</th><th>Sector / location</th><th>Evidence</th><th>Dates</th><th>Status</th><th>Confidence</th></tr></thead><tbody>
  ${recs.map((r) => `<tr><td><a href="${esc(r.source_url)}" rel="noopener" target="_blank">${esc(r.role_title_raw)} ↗</a><div style="color:#7b8790;margin-top:4px">${esc(r.source_id)} · ${esc(r.employer_identity || 'Employer undisclosed')}${r.recruiter_identity ? ' via ' + esc(r.recruiter_identity) : ''}</div>${r.open_flags.length ? `<div style="margin-top:4px">${r.open_flags.map((f) => `<span class="chip red">${esc(f.replace(/_/g, ' '))}</span>`).join(' ')}</div>` : ''}</td>
  <td>${r.sector ? esc(r.sector) : 'Unclear (' + esc(r.geo.claimed_sector || '?') + ')'}<div style="color:#7b8790;margin-top:4px">${esc(BASIS_LABEL[r.geo.basis] || r.geo.basis)}</div></td>
  <td>${esc(r.platform)} · ${esc(KIND_LABEL[r.source_url_kind] || r.source_url_kind)}<div style="color:#7b8790;margin-top:4px">${esc(evidenceStrength(r))}</div></td>
  <td>Captured ${fmtDate(r.captured_at)}<div style="color:#7b8790;margin-top:4px">${esc(postedText(r))}<br/>Rechecked ${fmtDate(r.last_rechecked_at)} ${staleBadge(r, app.data.asOf)}</div></td>
  <td>${statusChip(r.verification_status)}${r.vacancy_count_verified ? `<div style="margin-top:4px">${r.vacancy_count_verified} confirmed</div>` : ''}</td>
  <td>${esc(r.confidence.level)}<div style="color:#7b8790;margin-top:4px">${esc(r.confidence.rationale)}</div></td></tr>`).join('')}</tbody></table></div>
  <div class="source-note" style="margin-top:15px"><strong>Framework reference:</strong> ConveGenius.AI West Bengal PM SETU Strategic Investment Plan, Sections 5.3–5.4 and 6.1. The pilot transfers its principles of collecting, classifying, verifying and interpreting employer demand to a Noida test area. It is not an official West Bengal or Noida government deployment.</div></div>`;
}

app.views.evidence = renderRegister;
