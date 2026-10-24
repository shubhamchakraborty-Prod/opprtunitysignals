// Institution demand and employer follow-up: current Noida pilot evidence only.
import { app } from '../app.js';
import { esc, $, icon, toast, fmtDate, artBox } from '../ui.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { instituteDemand, instituteEmployerLeads } from '../../../src/core/institution.js';

const TYPES = ['iti', 'polytechnic', 'college'];
const LABELS = { iti: 'ITI', polytechnic: 'Polytechnic', college: 'College / university' };
const PIPE_KEY = 'opx-inst-outreach-v1';
const STAGES = [['saved', 'To review'], ['planned', 'Contact planned'], ['attempted', 'Contact attempted'], ['followup', 'Follow-up needed']];
let focusProgramme = '';
let leadQuery = '';

const selectedType = () => {
  const type = app.ls.get('opx-inst-type', 'iti');
  return TYPES.includes(type) ? type : 'iti';
};
const sample = () => comparisonBase(app.data.records, app.state.filters.sector);
const scope = () => {
  const area = app.area();
  const selected = app.state.filters.sector;
  return `<div class="inst-evidence" role="note">
    <strong>${icon('info')} Pilot evidence: ${selected === 'all' ? 'Noida Sectors 62 and 63' : 'Noida Sector ' + esc(selected)}</strong>
    <p>Based on approved, current, deduplicated public job advertisements collected for the Noida pilot. An ad is not a verified opening. It is not a complete picture of market demand.</p>
    ${area !== 'noida_ncr' ? '<p><strong>Regional coverage gap:</strong> Kalyani and Siliguri do not yet have comparable vacancy data. Noida figures below are a method demonstration, not evidence about your selected region.</p><button class="linkbtn" data-action="tab" data-tab="regions">See regional context</button>' : ''}
  </div>`;
};
const types = () => `<div class="inst-type-switch" role="group" aria-label="Institution type">
  ${TYPES.map((type) => `<button type="button" class="fchip ${type === selectedType() ? 'active' : ''}" data-action="inst-type-switch" data-type="${type}" aria-pressed="${type === selectedType()}">${LABELS[type]}</button>`).join('')}
</div>`;
const bar = (n, max) => `<div class="inst-bar" aria-hidden="true"><i style="width:${max ? Math.round(n / max * 100) : 0}%"></i></div>`;
const noData = (title, description) => `<div class="inst-empty"><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;

export function renderInstitutionDemand() {
  const type = selectedType();
  const ads = sample();
  const data = instituteDemand(type, ads, app.data.trades?.trades || [], app.data.programmes?.programmes || [], app.data.courses?.skills || {});
  const top = data.rows.filter((r) => r.related > 0).slice(0, 10);
  const selected = data.rows.find((r) => r.id === focusProgramme) || top[0] || data.rows[0];
  const byId = new Map(ads.map((r) => [r.source_id, r]));
  const max = top[0]?.related || 0;
  const topSkill = data.skills.slice(0, 8);
  const skillMax = topSkill[0]?.ads || 0;
  $('#idemand').innerHTML = `<div class="inst-head">
    <div><div class="eyebrow">Institutions · Demand intelligence</div><h2>Which programmes connect with local job advertisements?</h2>
    <p>Explore programme relevance, skills mentioned by employers and supporting source records. Use this as a starting point for curriculum discussions, not as a placement forecast.</p></div>
    <div class="inst-head-art">${artBox('trades')}</div>
  </div>
  ${scope()}
  ${types()}
  <div class="inst-metrics">
    <div class="inst-metric"><span>Ads in pilot sample</span><strong>${ads.length}</strong><small>Not the number of vacancies</small></div>
    <div class="inst-metric"><span>Programmes in catalogue</span><strong>${data.rows.length}</strong><small>${LABELS[type]}</small></div>
    <div class="inst-metric"><span>Programmes with related ads</span><strong>${data.rows.filter((r) => r.related > 0).length}</strong><small>Indicative skills or trade relevance</small></div>
    <div class="inst-metric"><span>Confirmed institutional supply</span><strong>Not available</strong><small>Pass-outs and seats not supplied</small></div>
  </div>
  <div class="inst-panels">
    <section class="card inst-panel">
      <div class="card-head"><h3>Programme relevance</h3><small>Number of related ads in the sample</small></div>
      <div class="inst-chart" aria-label="Related advertisements by programme">
        ${top.length ? top.map((r) => `<button class="inst-chart-row ${selected?.id === r.id ? 'active' : ''}" data-action="inst-programme" data-id="${esc(r.id)}" aria-pressed="${selected?.id === r.id}">
            <span class="inst-chart-label">${esc(r.label)}</span>${bar(r.related,max)}<strong>${r.related}</strong>
          </button>`).join('') : noData('No relevant ads in this sample', 'The current records cannot establish a programme match.')}
      </div>
      <p class="note inst-chart-note">A single advertisement can be relevant to multiple programmes. Do not add these bars together to estimate total hiring.</p>
    </section>
    <section class="card inst-panel">
      <div class="card-head"><h3>Skills to examine</h3><small>Distinct ads naming each missing skill</small></div>
      <div class="inst-chart">${topSkill.length ? topSkill.map((s) => `<div class="inst-chart-row plain">
        <span class="inst-chart-label">${esc(s.skill)}</span>${bar(s.ads,skillMax)}<strong>${s.ads}</strong>
      </div>`).join('') : noData('No skill gaps identified', 'Insufficient evidence is not proof that there are no gaps.')}</div>
      <p class="note inst-chart-note">Inferred from standard programme-skill catalogues. Not assessed learner competence, an official syllabus gap or evidence of unmet jobs.</p>
    </section>
  </div>
  <section class="card inst-detail">
    <div class="card-head"><div><h3>Explore a specific ${type === 'iti' ? 'trade' : 'programme'}</h3><small>See what the source advertisements actually mention</small></div>
      <label class="inst-select-label">Programme <select id="instProgrammeSelect" aria-label="Choose programme">
        ${data.rows.map((r) => `<option value="${esc(r.id)}" ${r.id === selected?.id ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}
      </select></label></div>
    <div class="card-body">
      ${selected ? `<div class="inst-detail-top"><div><div class="eyebrow">Selected programme</div><h4>${esc(selected.label)}</h4></div>
        <div class="inst-detail-stats"><span><strong>${selected.related}</strong> related ads</span><span><strong>${selected.fresher}</strong> asking less than one year experience and meeting the catalogue's fresher filter</span></div></div>
      <div class="inst-detail-grid">
        <div><h5>Skills to investigate</h5>${selected.gaps.length ? `<ul class="inst-chip-list">${selected.gaps.slice(0, 8).map((g) => `<li>${esc(g.skill)} <small>${g.ads} ad${g.ads === 1 ? '' : 's'}</small></li>`).join('')}</ul>` : '<p class="note">No additional skills identified from related advertisements.</p>'}</div>
        <div><h5>Supporting advertisements</h5>${selected.adIds.length ? `<ul class="inst-source-list">${selected.adIds.slice(0, 6).map((id) => { const r=byId.get(id);return r ? `<li><a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.role_title_raw)} ${icon('open_in_new')}</a><span>${esc(r.employer_identity || 'Employer not named')} · Sector ${esc(r.sector)}</span></li>` : ''; }).join('')}</ul>` : '<p class="note">No related ads in the pilot dataset for this programme.</p>'}</div>
      </div>` : noData('No catalogue loaded','Programme data is unavailable.')}
      <p class="note">Programmes reflect a catalogue, not actual offerings at a named institute. Confirm qualifications, current vacancies, training capacity and employer requirements independently.</p>
      <div class="actions"><button class="btn primary small" data-action="tab" data-tab="ioutreach">${icon('handshake')}Plan employer outreach</button><button class="btn outlined small" data-action="tab" data-tab="trades">Explore trade catalogue</button></div>
    </div>
  </section>`;
  $('#instProgrammeSelect').onchange = (ev) => {
    focusProgramme = ev.target.value;
    renderInstitutionDemand();
  };
}

function entries() {
  const current = app.ls.get(PIPE_KEY, []);
  if (!Array.isArray(current)) return [];
  return current.filter((x) => x && typeof x.id === 'string' && STAGES.some(([v]) => v === x.stage)).slice(0, 80);
}
function save(entriesList) { app.ls.set(PIPE_KEY, entriesList.slice(0, 80)); }
const stageLabel = (stage) => STAGES.find(([k]) => k === stage)?.[1] || 'To review';

export function renderInstitutionOutreach() {
  const ads = sample();
  const leads = instituteEmployerLeads(ads, app.data.asOf);
  const own = entries();
  const valid = new Map(leads.map((lead) => [lead.id, lead]));
  const tracked = own.map((x) => ({ ...x, lead: valid.get(x.id) })).filter((x) => !!x.lead);
  const q = leadQuery.trim().toLowerCase();
  const show = leads.filter((l) => !q || l.name.toLowerCase().includes(q) || l.sources.some((s) => s.role.toLowerCase().includes(q))).slice(0, 18);
  $('#ioutreach').innerHTML = `<div class="inst-head">
    <div><div class="eyebrow">Institutions · Employer engagement</div><h2>Turn employer signals into a follow-up plan</h2>
    <p>Review the advertisements, decide which employers to contact and track next steps. These records are personal planning notes stored only in your browser.</p></div>
    <div class="inst-head-art">${artBox('institutes')}</div></div>
    ${scope()}
    <div class="inst-metrics"><div class="inst-metric"><span>Named employers in sample</span><strong>${leads.length}</strong><small>Observed in public listings</small></div>
    <div class="inst-metric"><span>Saved for outreach</span><strong>${tracked.length}</strong><small>Browser-only planning</small></div>
    <div class="inst-metric"><span>Follow-up needed</span><strong>${tracked.filter((x) => x.stage === 'followup').length}</strong><small>Self-recorded status</small></div>
    <div class="inst-metric"><span>Openings confirmed by employers</span><strong>${leads.reduce((sum,l) => sum+l.confirmedOpenings,0)}</strong><small>Only currently valid approved verification</small></div></div>
  <div class="inst-outreach-grid">
    <section class="card inst-panel">
      <div class="card-head"><h3>Employers to investigate</h3><small>Source-backed advertisements</small></div>
      <div class="inst-lead-search"><label for="instLeadQuery">Search employer or role</label><input id="instLeadQuery" type="search" placeholder="Employer or job title" value="${esc(leadQuery)}"/></div>
      <div class="inst-leads">${show.length ? show.map((lead) => {
        const stored = tracked.find((x) => x.id === lead.id);
        return `<article class="inst-lead"><div class="inst-lead-title"><h4>${esc(lead.name)}</h4><span class="tag">${lead.adCount} ad${lead.adCount === 1 ? '' : 's'}</span></div>
          <p class="note">Sector${lead.sectors.length > 1 ? 's' : ''} ${esc(lead.sectors.join(', '))} · Last captured ${esc(fmtDate(lead.lastSeen))}</p>
          <p>${esc(lead.sources.slice(0, 2).map((s) => s.role).join(' · '))}</p>
          <p class="note">${lead.confirmedOpenings ? `${lead.confirmedOpenings} currently verified opening(s) in this evidence group` : 'No currently verified openings for this employer in the sample'}</p>
          <div class="inst-lead-actions"><a class="btn outlined small" href="${esc(lead.sources[0].url)}" target="_blank" rel="noopener">Review source ${icon('open_in_new')}</a>
            <button class="btn ${stored ? 'tonal' : 'primary'} small" type="button" data-action="inst-lead-toggle" data-id="${esc(lead.id)}">${stored ? 'Remove from plan' : 'Add to plan'}</button></div></article>`;
      }).join('') : noData('No employers match', 'Try a broader search. Employers without a name are not included.')}</div>
    </section>
    <section class="card inst-panel">
      <div class="card-head"><h3>My outreach plan</h3><small>Not shared or submitted</small></div>
      <div class="inst-pipeline">${tracked.length ? tracked.map(({id,stage,lead}) => `<article class="inst-pipeline-item">
        <div><h4>${esc(lead.name)}</h4><p class="note">${lead.adCount} source ad${lead.adCount === 1 ? '' : 's'} · ${esc(lead.sources[0].role)}</p></div>
        <label>Planning status<select data-inst-stage="${esc(id)}" aria-label="Outreach stage for ${esc(lead.name)}">
          ${STAGES.map(([key, name]) => `<option value="${key}" ${stage === key ? 'selected' : ''}>${name}</option>`).join('')}
        </select></label><button class="linkbtn" data-action="inst-lead-toggle" data-id="${esc(id)}">Remove</button>
      </article>`).join('') : noData('Nothing saved yet', 'Add a source-backed employer on the left to build a follow-up plan.')}
      </div>${tracked.length ? '<div class="inst-clear"><button class="btn text small" data-action="inst-clear-outreach">Clear this plan</button></div>' : ''}
      <div class="inst-outreach-note"><strong>Planning only</strong><p>Changing a status here does not verify a vacancy, contact an employer or send candidate information. Confirm requirements directly with the employer before any placement decision.</p></div>
    </section>
  </div>`;
  $('#instLeadQuery').oninput = (ev) => { leadQuery = ev.target.value; const pos=ev.target.selectionStart; renderInstitutionOutreach(); const input=$('#instLeadQuery');input.focus();input.setSelectionRange(pos,pos); };
}

app.actions['inst-type-switch'] = (el) => {
  if (!TYPES.includes(el.dataset.type)) return;
  app.ls.set('opx-inst-type', el.dataset.type);
  focusProgramme = '';
  if (app.state.tab === 'idemand') renderInstitutionDemand();
  else app.views[app.state.tab]?.();
};
app.actions['inst-programme'] = (el) => { focusProgramme = el.dataset.id; renderInstitutionDemand(); };
app.actions['inst-lead-toggle'] = (el) => {
  const valid = instituteEmployerLeads(sample(), app.data.asOf).some((lead) => lead.id === el.dataset.id);
  if (!valid) return;
  const current = entries();
  const found = current.some((x) => x.id === el.dataset.id);
  save(found ? current.filter((x) => x.id !== el.dataset.id) : [{ id: el.dataset.id, stage: 'saved' }, ...current]);
  toast(found ? 'Removed from this browser plan' : 'Added to this browser plan');
  renderInstitutionOutreach();
};
app.actions['inst-clear-outreach'] = () => { app.ls.del(PIPE_KEY); renderInstitutionOutreach(); toast('Outreach plan erased from this browser'); };
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (!el.matches?.('[data-inst-stage]')) return;
  const current = entries();
  if (!STAGES.some(([v]) => v === el.value)) return;
  save(current.map((entry) => entry.id === el.dataset.instStage ? { ...entry, stage: el.value } : entry));
  toast(`Planning status: ${stageLabel(el.value)} (browser only)`);
  renderInstitutionOutreach();
});
app.views.idemand = renderInstitutionDemand;
app.views.ioutreach = renderInstitutionOutreach;
