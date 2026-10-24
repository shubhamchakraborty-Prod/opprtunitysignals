// Industry intelligence and partnership planning, separate from job-ad verification.
// The current user never contacts an institute or transfers learner data here.
import { app } from '../app.js';
import { esc, $, icon, artBox, toast } from '../ui.js';
import { ROLES, talentForRole } from '../../../src/core/talent.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { supplyOverview, roleEvidenceSummary, roleInstitutionOptions, partnershipDraft, PARTNER_STAGES, PARTNER_PURPOSES, validPartnerStage } from '../../../src/core/industry-intelligence.js';

const KEY = 'opx-industry-partnerships-v1';
const AREAS = { noida_ncr: 'Noida / NCR', kalyani: 'Kalyani', siliguri: 'Siliguri' };
const TYPES = { iti: 'ITI', polytechnic: 'Polytechnic', college: 'College', university: 'University' };
let poolFilter = 'all';
let supplyQuery = '';
let roleChoice = 'smt';

const allInstitutes = () => app.data.demand?.institutes || [];
const region = () => app.area();
const role = () => ROLES.find((r) => r.id === roleChoice) || ROLES[0];
const pilotAds = () => comparisonBase(app.data.records, 'all');
const dataset = () => ({ trades: app.data.trades?.trades || [], programmes: app.data.programmes?.programmes || [],
  institutes: allInstitutes(), ads: pilotAds(), area: region() });
const list = () => {
  const x = app.ls.get(KEY, []);
  if (!Array.isArray(x)) return [];
  return x.filter((q) => q && typeof q.id === 'string' && validPartnerStage(q.stage) &&
    ROLES.some((r) => r.id === q.role) && PARTNER_PURPOSES.some(([p]) => p === q.purpose) &&
    allInstitutes().some((i) => i.name === q.institute && i.area === q.area)).slice(0, 30);
};
const save = (entries) => app.ls.set(KEY, entries.slice(0, 30));
const options = (items, picked) => items.map(([k, label]) => `<option value="${esc(k)}" ${k === picked ? 'selected' : ''}>${esc(label)}</option>`).join('');
const scope = () => `<div class="ind-evidence" role="note"><strong>${icon('info')} Supply evidence, not a count of available candidates</strong>
  <p>Institution names, locations and listed courses come from a research starting list. They do not confirm active cohorts, available students, seat capacity or hiring interest. Verify before contacting.</p>
  ${region() !== 'noida_ncr' ? '<p><strong>Regional evidence gap:</strong> Noida job advertisements and pay data cannot be projected onto Kalyani or Siliguri. We do not show either as regional estimates.</p>' : '<p>Role-specific advertisement evidence elsewhere in the Industry experience comes only from the Noida pilot and is not a census.</p>'}
  </div>`;
const source = (i) => i.url?.startsWith('https://') ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">Institute source ${icon('open_in_new')}</a>` : '<span class="note">No independently verified institute link</span>';

export function renderIndustrySupply() {
  const o = supplyOverview(allInstitutes(), region());
  const pools = o.pools;
  if (poolFilter !== 'all' && !pools.some((p) => p.id === poolFilter)) poolFilter = 'all';
  const active = pools.find((p) => p.id === poolFilter);
  const filtered = active ? active.institutes : o.institutes;
  const q = supplyQuery.toLowerCase();
  const shown = filtered.filter((i) => !q || [i.name, i.town, ...(i.offers || [])].join(' ').toLowerCase().includes(q));
  $('#isupply').innerHTML = `<div class="ind-hero"><div class="ph-text"><div class="eyebrow">Industry · Institution supply explorer</div>
  <h2>Where are relevant courses taught?</h2><p>Map the listed institutions and programme categories around ${esc(AREAS[o.area])}. Explore potential partnerships before estimating recruitment capacity.</p></div>${artBox('institutes')}</div>
  ${scope()}
  <div class="inst-metrics">
    <div class="inst-metric"><span>Institutes in research list</span><strong>${o.total}</strong><small>Not learner headcount</small></div>
    <div class="inst-metric"><span>ITIs listed</span><strong>${o.byType.iti}</strong><small>Trade-based training</small></div>
    <div class="inst-metric"><span>Polytechnics listed</span><strong>${o.byType.polytechnic}</strong><small>Diploma programmes</small></div>
    <div class="inst-metric"><span>College and university listings</span><strong>${o.byType.college}</strong><small>Degree programmes</small></div>
  </div>
  <div class="ind-supply-grid">
    <section class="card"><div class="card-head"><h3>Explore by programme family</h3><small>Institutes may appear in several groups</small></div>
      <div class="ind-pool-list">
        <button class="ind-pool ${poolFilter === 'all' ? 'active' : ''}" data-action="ind-pool" data-pool="all" aria-pressed="${poolFilter === 'all'}"><span>All institution listings</span><strong>${o.total}</strong></button>
        ${pools.map((p) => `<button class="ind-pool ${poolFilter === p.id ? 'active' : ''}" data-action="ind-pool" data-pool="${p.id}" aria-pressed="${poolFilter === p.id}"><span>${esc(p.label)}</span><strong>${p.count}</strong></button>`).join('')}
      </div>
      <p class="note ind-note">Programme families come from institute listing text, not a verified census or student enrolment data.</p>
    </section>
    <section class="card"><div class="card-head"><h3>Institutions in ${esc(AREAS[o.area])}</h3><small>${shown.length} listed under current filters</small></div>
      <label class="ind-query">Find an institution or course <input id="industryInstituteQuery" type="search" value="${esc(supplyQuery)}" placeholder="Name, trade or programme"/></label>
      <div class="ind-supply-list">${shown.length ? shown.slice(0, 40).map((i) => `<article class="ind-institute"><div class="ind-institute-title"><h4>${esc(i.name)}</h4><span class="tag">${esc(TYPES[i.type] || i.type)}</span></div>
        <p class="note">${esc(i.town || AREAS[o.area])}</p><p>${esc((i.offers || []).slice(0, 5).join(' · ') || 'Programme details not listed')}</p>
        <div class="ind-institute-foot">${source(i)}<button class="linkbtn" data-action="ind-plan-institute" data-name="${esc(i.name)}">Plan a partnership ${icon('arrow_forward')}</button></div>
      </article>`).join('') : '<div class="empty">No matching institute in the current research list. This does not establish that none exist.</div>'}</div>
    </section>
  </div>
  <p class="note">Method: ${esc(app.data.demand?.method || 'Institute listings assembled for the pilot.')}. Map points and institute-to-programme matching are approximate. No number of graduates or applicants is supplied.</p>`;
  $('#industryInstituteQuery').oninput = (ev) => {
    supplyQuery = ev.target.value;
    const pos = ev.target.selectionStart;
    renderIndustrySupply();
    const input = $('#industryInstituteQuery');
    input.focus(); input.setSelectionRange(pos, pos);
  };
}

function eligibleSchools(r, d) {
  const m = roleInstitutionOptions(r, d);
  const all = allInstitutes().filter((i) => i.area === d.area);
  // Matching schools are only heuristics. The rest remain available, not presented as matches.
  const selected = new Set(m.map((i) => i.name));
  return [...m.map((i) => ({ ...i, suggested: true })),
    ...all.filter((i) => !selected.has(i.name)).map((i) => ({ ...i, suggested: false }))];
}
function roleEvidence(r, d) {
  return roleEvidenceSummary(r, d.ads, d.area, app.data.asOf);
}

export function renderIndustryPartnerships() {
  const savedRole = app.ls.get('opx-industry-role', roleChoice);
  if (ROLES.some((r) => r.id === savedRole)) roleChoice = savedRole;
  const d = dataset();
  const r = role();
  const schools = eligibleSchools(r, d);
  const reqs = list();
  const pending = app.ls.get('opx-industry-prefill', '');
  const preferred = schools.find((i) => i.name === pending)?.name || '';
  $('#partner').innerHTML = `<div class="ind-hero"><div class="ph-text"><div class="eyebrow">Industry · Institution partnerships</div><h2>Plan an institute partnership</h2>
    <p>Choose a role, identify an institution and record a next step. This is a private planning workspace, not a candidate request or outreach service.</p></div>${artBox('signals')}</div>
    ${scope()}
    <div class="ind-partner-grid">
      <form class="card card-body form" data-form="hire-request" id="industryPartnerForm">
        <div class="callout"><strong>Demo planning mode.</strong> Saved only on this device. No employer, institution or learner receives this information.</div>
        <div class="form-grid">
          <div class="full"><label for="hrRole">Role or capability area</label><select id="hrRole" name="role">${options(ROLES.map((x) => [x.id,x.title]),r.id)}</select></div>
          <div class="full"><label for="hrInstitute">Institution to investigate</label><select id="hrInstitute" name="institute" required>
             ${schools.length ? schools.map((i) => `<option value="${esc(i.id)}" ${i.name === preferred ? 'selected' : ''}>${esc(i.name)}${i.suggested ? ' · catalogue-based possible fit' : ' · unassessed'}</option>`).join('') : '<option value="">No institutes in regional research list</option>'}
          </select><p class="note">${schools.length ? 'A possible fit is inferred from programme titles and standard skills, not a confirmed pipeline.' : 'Choose a different area to review listed institutes.'}</p></div>
          <div><label for="hrN">Indicative people needed</label><input id="hrN" name="n" type="number" min="1" max="500" value="10" required/></div>
          <div><label for="hrWhen">Target month</label><input id="hrWhen" name="when" type="month" value="${esc((app.data.asOf || '2026-10-24').slice(0,7))}" required/></div>
          <div class="full"><label for="hrPurpose">Partnership idea</label><select id="hrPurpose" name="purpose">${options(PARTNER_PURPOSES, 'visit')}</select></div>
        </div>
        <div class="ind-match-note"><strong>Research context</strong><p>${r.needs.length} role-specific skills in the prototype catalogue: ${esc(r.needs.join(', '))}.</p><p>${roleEvidence(r,d).status === 'region_unavailable' ? 'No comparable local vacancy or pay data in this region.' : roleEvidence(r,d).count + ' related public job ad(s) in the Noida pilot, not confirmed hiring requirements.'}</p></div>
        <div class="actions"><button class="btn primary" type="submit" ${schools.length ? '' : 'disabled'}>${icon('save')} Save plan locally</button></div>
      </form>
      <section class="card ind-saved-plan"><div class="card-head"><h3>My partnership plans</h3><small>${reqs.length} saved in this browser</small></div>
        <div class="ind-plan-list">${reqs.length ? reqs.map((q) => {
          const label = ROLES.find((x) => x.id === q.role)?.title || q.role;
          const purpose = PARTNER_PURPOSES.find(([key]) => key === q.purpose)?.[1] || q.purpose;
          return `<article class="ind-plan" data-plan-id="${esc(q.id)}">
            <div class="ind-plan-top"><h4>${esc(q.institute)}</h4><span class="tag">${esc(AREAS[q.area] || q.area)}</span></div>
            <p><strong>${esc(label)}</strong> · ${esc(purpose)}</p>
            <p class="note">Indicative: ${q.n} people · Target ${esc(q.when)} · No institution has been contacted through this platform</p>
            <label>Planning status<select data-ind-partner-stage="${esc(q.id)}" aria-label="Planning status for ${esc(q.institute)}">
              ${options(PARTNER_STAGES,q.stage)}
            </select></label>
            <button class="linkbtn" data-action="ind-partner-remove" data-id="${esc(q.id)}">Remove from plan</button>
          </article>`;
        }).join('') : '<div class="empty">No plans saved. Complete the form to save an internal follow-up idea.</div>'}</div>
        ${reqs.length ? '<div class="ind-plan-clear"><button class="btn text small" data-action="hire-clear">Erase all saved plans</button></div>' : ''}
        <p class="note ind-note">Status changes are self-entered and are not independently verified. Contact the institution outside the platform if you decide to proceed.</p>
      </section>
    </div>`;
  $('#hrRole').onchange = (ev) => {
    roleChoice = ev.target.value;
    app.ls.set('opx-industry-role', roleChoice);
    app.ls.del('opx-industry-prefill');
    renderIndustryPartnerships();
  };
}

app.forms['hire-request'] = (form) => {
  const fields = new FormData(form);
  const choice = partnershipDraft({
    role: fields.get('role'), institute: fields.get('institute'), n: fields.get('n'),
    when: fields.get('when'), purpose: fields.get('purpose'),
  }, ROLES, allInstitutes().filter((i) => i.area === region()));
  if (!choice) { toast('Check the role, institution, target month and number of people.'); return; }
  const current = list();
  const id = 'plan-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  save([{ ...choice,id }, ...current]);
  app.ls.del('opx-industry-prefill');
  toast('Partnership idea saved only in this browser');
  renderIndustryPartnerships();
};
app.actions['hire-clear'] = () => {
  app.ls.del(KEY);
  renderIndustryPartnerships();
  toast('Browser-only partnership plans erased');
};
app.actions['ind-pool'] = (el) => { poolFilter = el.dataset.pool; renderIndustrySupply(); };
app.actions['ind-plan-institute'] = (el) => {
  const item = allInstitutes().find((i) => i.name === el.dataset.name && i.area === region());
  if (!item) return;
  app.ls.set('opx-industry-prefill', item.name);
  app.actions.tab({dataset:{tab:'partner'}});
};
app.actions['ind-partner-remove'] = (el) => { save(list().filter((x) => x.id !== el.dataset.id)); renderIndustryPartnerships(); };
document.addEventListener('change', (ev) => {
  const target = ev.target;
  if (!target.matches?.('[data-ind-partner-stage]') || !validPartnerStage(target.value)) return;
  save(list().map((q) => q.id === target.dataset.indPartnerStage ? { ...q,stage:target.value } : q));
  renderIndustryPartnerships();
  toast('Local planning status updated');
});
app.views.isupply = renderIndustrySupply;
app.views.partner = renderIndustryPartnerships;
