// Match a learner: pick an example learner, see which ads could fit, grouped
// by what stands in the way. Hard rules are shown separately from skills.
import { app, SOME_OVERLAP } from '../app.js';
import { esc, $, sectorTag, artBox } from '../ui.js';
import { rankMatches, eduLabel } from '../../../src/core/matching.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { wageText } from '../../../src/core/decisions.js';

const STATUS_TEXT = { pass: 'OK', fail: 'Not met', unknown: 'Ask employer', not_stated: 'Not mentioned' };
const SHORT = { iti_electronics: 'Electronics repair, soldering, testing', iti_fitter: 'Fitting, assembly, measuring', iti_machinist: 'Lathe, milling, CNC basics', iti_copa: 'Computers, typing, office work', class12: 'School-leaver, no trade yet' };

function profile() {
  const base = app.profile(app.state.persona) || app.data.profiles[0];
  return { ...base, ...app.state.adjust };
}

export function renderMatch() {
  const p = profile();
  const records = comparisonBase(app.data.records.filter((r) => r.review.state === 'approved'), app.state.filters.sector);
  const ranked = rankMatches(p, records, 50);
  const groups = [
    ['Worth a call to the employer', 'No stated rule rules this learner out, and they share some of the skills.', ranked.filter(({ m }) => m.verdict !== 'gate_not_met' && m.overlap.ratio >= SOME_OVERLAP)],
    ['Possible, but the learner needs more skills', 'No stated rule rules them out, but they share few of the skills asked for.', ranked.filter(({ m }) => m.verdict !== 'gate_not_met' && m.overlap.ratio < SOME_OVERLAP)],
    ['Not eligible as the ad is written', 'The ad asks for more experience, a different qualification or a language level this learner does not have. Useful for spotting training gaps.', ranked.filter(({ m }) => m.verdict === 'gate_not_met')],
  ];
  const opt = (v, cur, label) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
  $('#match').innerHTML = `<div class="section-head">${artBox('match')}<div><h2>Which jobs could a learner go for?</h2><p>Pick an example learner. We check the ad’s firm requirements first, then the skills. A match is a reason to call the employer, not a promise of a job. Uses the area chosen on the Jobs map (${app.state.filters.sector === 'all' ? 'both sectors' : 'Sector ' + esc(app.state.filters.sector)}).</p></div></div>
  <div class="profiles" role="group" aria-label="Example learner">${app.data.profiles.map((x) => `<button class="profile-tile ${x.id === app.state.persona ? 'active' : ''}" aria-pressed="${x.id === app.state.persona}" data-action="persona" data-id="${esc(x.id)}"><b>${esc(x.label.replace(/ \(.*\)$/, ''))}</b><span>${esc(SHORT[x.id] || '')}</span></button>`).join('')}</div>
  <div class="card card-body"><div class="assume">
    <div class="fgroup"><span class="flabel">Qualifications</span><span>${esc(p.qualifications.map(eduLabel).join(', '))}</span></div>
    <div class="fgroup"><label for="adjEnglish">Spoken English</label><select id="adjEnglish" class="input">${[['unknown', 'Not assessed'], ['basic', 'Basic'], ['functional', 'Workable'], ['strong', 'Strong']].map(([v, l]) => opt(v, p.english, l)).join('')}</select></div>
    <div class="fgroup"><label for="adjExp">Work experience</label><select id="adjExp" class="input">${[[0, 'Fresher'], [6, '6 months'], [12, '1 year'], [24, '2 years'], [36, '3 years'], [60, '5 years']].map(([v, l]) => opt(v, p.experience_months, l)).join('')}</select></div>
    <label class="check"><input type="checkbox" id="adjReloc" ${p.willing_to_relocate ? 'checked' : ''}/> Willing to move</label>
  </div><p class="note" style="margin-top:10px">Example profile, not a real trainee. No personal data is used. Later, approved ITI-level summaries can replace these examples.</p></div>
  <div class="match-groups">${groups.map(([title, desc, items], gi) => {
    const inner = items.length ? `<div class="match-list">${items.map(({ r, m }) => item(r, m)).join('')}</div>` : '<p class="note">None.</p>';
    return gi < 2
      ? `<div class="match-group"><h3>${esc(title)} <span class="tag">${items.length}</span></h3><p>${esc(desc)}</p>${inner}</div>`
      : `<details class="match-group disclose"><summary><h3 style="display:inline-flex">${esc(title)} <span class="tag">${items.length}</span></h3></summary><p>${esc(desc)}</p>${inner}</details>`;
  }).join('')}</div>`;
  $('#adjEnglish').onchange = (e) => { app.state.adjust.english = e.target.value; renderMatch(); };
  $('#adjExp').onchange = (e) => { app.state.adjust.experience_months = Number(e.target.value); renderMatch(); };
  $('#adjReloc').onchange = (e) => { app.state.adjust.willing_to_relocate = e.target.checked; renderMatch(); };
}

function item(r, m) {
  const total = m.overlap.matched.length + m.overlap.missing.length;
  return `<div class="match"><div class="job-top"><h4>${esc(r.role_title_raw)}</h4>${sectorTag(r)}</div>
  <div class="note">${esc(r.employer_identity || 'Employer not named')} · ${esc(wageText(r.wage))} · ${esc(r.experience.raw)}</div>
  <div class="meter"><span>Skills</span><div class="bar s${esc(r.sector)}"><i style="width:${Math.round(m.overlap.ratio * 100)}%"></i></div><strong>${m.overlap.matched.length}/${total}</strong></div>
  ${m.gaps.length ? `<p><strong>Gap:</strong> ${esc(m.gaps.join(' '))}</p>` : ''}
  ${m.overlap.missing.length ? `<p><strong>Skills to build:</strong> ${esc(m.overlap.missing.join(', '))}</p>` : '<p><strong>Skills:</strong> all named skills covered</p>'}
  ${m.conditions.length ? `<p><strong>Conditions to discuss:</strong> ${esc(m.conditions.join(', '))}</p>` : ''}
  <details class="disclose"><summary>Firm requirements checked</summary><div class="table-scroll" style="margin-top:8px"><table class="minitable"><tr><th>Rule</th><th>Result</th><th>Why</th></tr>${m.gates.map((g) => `<tr><td>${esc(g.gate)}</td><td><span class="status ${g.status}">${STATUS_TEXT[g.status]}</span></td><td>${esc(g.fact)}${g.inference ? `<br/><span class="note">${esc(g.inference)}</span>` : ''}</td></tr>`).join('')}</table></div></details>
  <div class="actions"><button class="btn small" data-action="open-record" data-id="${esc(r.source_id)}">View job</button><a class="btn small ghost" href="${esc(r.source_url)}" target="_blank" rel="noopener">Original ad ↗</a></div></div>`;
}

app.actions.persona = (el) => {
  app.state.persona = el.dataset.id;
  app.state.adjust = {};
  renderMatch();
};

app.views.match = renderMatch;
