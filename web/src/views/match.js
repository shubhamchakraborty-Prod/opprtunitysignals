// Who could fit? Example learner profiles, hard gates and skill overlap.
import { app } from '../app.js';
import { esc, $ } from '../ui.js';
import { rankMatches, eduLabel } from '../../../src/core/matching.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { wageText } from '../../../src/core/decisions.js';

const STATUS_TEXT = { pass: 'Met', fail: 'Not met', unknown: 'Unresolved', not_stated: 'Not stated' };

function profile() {
  const base = app.data.profiles.find((p) => p.id === app.state.persona) || app.data.profiles[0];
  return { ...base, ...app.state.adjust };
}

export function renderMatch() {
  const p = profile();
  const records = comparisonBase(app.data.records.filter((r) => r.review.state === 'approved'), app.state.filters.sector);
  const ranked = rankMatches(p, records, 12);
  const opt = (v, cur, label) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
  $('#match').innerHTML = `<div class="wide"><h2 class="section-title">Which opportunities might match a learner?</h2><p class="section-description">Choose an example learner profile. Hard gates (qualification, certification, experience, location, language) are checked separately from skill overlap. <strong>Skill overlap is not hiring eligibility</strong>, and nothing here certifies a learner or promises a job. Uses the sector chosen on the Explore tab (${app.state.filters.sector === 'all' ? 'both sectors' : 'Sector ' + app.state.filters.sector}).</p>
  <div class="profile-wrap"><div class="profile-aside"><h3><label for="persona">Choose a learner profile</label></h3><select id="persona">${app.data.profiles.map((x) => opt(x.id, app.state.persona, esc(x.label))).join('')}</select>
  <div class="eyebrow">Assumed for this example</div>
  <ul><li>Qualifications: ${esc(p.qualifications.map(eduLabel).join(', '))}</li><li>Certificates: ${esc(p.certifications.join(', ') || 'none recorded')}</li><li>Lives in: ${esc(p.home_catchment)}</li></ul>
  <div class="form" style="margin-top:10px"><label for="adjEnglish">Spoken English (assumption)</label><select id="adjEnglish">${['unknown', 'basic', 'functional', 'strong'].map((v) => opt(v, p.english, v)).join('')}</select>
  <label for="adjExp" style="margin-top:10px">Work experience</label><select id="adjExp">${[[0, 'Fresher'], [6, '6 months'], [12, '1 year'], [24, '2 years'], [36, '3 years'], [60, '5 years']].map(([v, l]) => opt(v, p.experience_months, l)).join('')}</select>
  <label class="checkline" style="margin-top:12px;text-transform:none;letter-spacing:0"><input type="checkbox" id="adjReloc" ${p.willing_to_relocate ? 'checked' : ''}/> Willing to relocate</label></div>
  <div class="eyebrow" style="margin-top:14px">Skills in this example</div><ul>${p.skills.map((s) => '<li>' + esc(s) + '</li>').join('')}</ul>
  <div class="method">These are illustrative profiles, not records of real trainees. Authorised, aggregate ITI capability inventories can replace them later only with approval. No personal data is used or shown.</div></div>
  <div class="matchlist"><div class="panel-head"><h3>Potential occupational connections</h3><span class="count">Gates first, then skill overlap</span></div>${ranked.map(({ r, m }, i) => item(r, m, i < 3)).join('') || '<div class="empty">No current signals for this sector.</div>'}</div></div></div>`;
  $('#persona').onchange = (e) => { app.state.persona = e.target.value; app.state.adjust = {}; renderMatch(); };
  $('#adjEnglish').onchange = (e) => { app.state.adjust.english = e.target.value; renderMatch(); };
  $('#adjExp').onchange = (e) => { app.state.adjust.experience_months = Number(e.target.value); renderMatch(); };
  $('#adjReloc').onchange = (e) => { app.state.adjust.willing_to_relocate = e.target.checked; renderMatch(); };
}

function item(r, m, open) {
  const vcls = m.verdict === 'gates_met' ? '' : m.verdict === 'gates_unresolved' ? 'mid' : 'low';
  const ocls = m.overlap.ratio >= 0.65 ? '' : m.overlap.ratio >= 0.34 ? 'mid' : 'low';
  return `<div class="matchitem"><h4>${esc(r.role_title_raw)} <span class="matchtag ${vcls}">${esc(m.verdictLabel)}</span><span class="matchtag ${ocls}">${esc(m.overlap.label)} · ${m.overlap.matched.length}/${m.overlap.matched.length + m.overlap.missing.length}</span></h4>
  <div class="matchmeta">${esc(r.employer_identity || 'Employer undisclosed')} · Sector ${esc(r.sector)} · ${esc(r.experience.raw)} · ${esc(wageText(r.wage))}</div>
  <details ${open ? 'open' : ''}><summary class="need" style="cursor:pointer;margin-top:6px">Hard gates: ${m.gates.filter((g) => g.status === 'pass').length} met · ${m.gates.filter((g) => g.status === 'unknown').length} unresolved · ${m.gates.filter((g) => g.status === 'fail').length} not met</summary><table class="minitable" style="margin-top:8px"><tr><th>Gate</th><th>Status</th><th>Source fact</th><th>Inference</th></tr>${m.gates.map((g) => `<tr><td>${esc(g.gate)}</td><td><span class="status ${g.status}">${STATUS_TEXT[g.status]}</span></td><td>${esc(g.fact)}</td><td>${esc(g.inference || '-')}</td></tr>`).join('')}</table></details>
  <p><strong>Matched skills:</strong> ${esc(m.overlap.matched.join(', ') || 'None of the named skills')}</p>
  <p><strong>Skills to develop:</strong> ${esc(m.overlap.missing.join(', ') || 'No additional named skills in this simplified mapping')}</p>
  ${m.gaps.length ? `<p><strong>Qualification or experience gaps:</strong> ${esc(m.gaps.join(' '))}</p>` : ''}
  ${m.conditions.length ? `<p><strong>Employment terms to discuss:</strong> ${esc(m.conditions.join(', '))}</p>` : ''}
  <p><strong>Recommendation:</strong> ${m.verdict === 'gate_not_met' ? 'Not a referral candidate on stated requirements; use as a skills-gap signal.' : 'Confirm unresolved gates with the employer before any referral.'} <a href="${esc(r.source_url)}" target="_blank" rel="noopener">Check listing requirements ↗</a></p></div>`;
}

app.views.match = renderMatch;
