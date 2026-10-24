// Industry interface: talent, not job ads. Where people with the right skills
// are trained near the employer, what a fresh hire knows and lacks, what local
// ads pay, apprentice schemes, and a way to ask for candidates.
import { app } from '../app.js';
import { esc, $, artBox, icon, toast } from '../ui.js';
import { ROLES, talentForRole, talentPools } from '../../../src/core/talent.js';
import { comparisonBase } from '../../../src/core/analytics.js';
import { roleEvidenceSummary } from '../../../src/core/industry-intelligence.js';

const ui = { role: 'smt' };
const AREA = { noida_ncr: 'Noida and NCR', kalyani: 'Kalyani', siliguri: 'Siliguri' };
const TYPE = { iti: 'ITI', polytechnic: 'Polytechnic', college: 'College', university: 'University' };
const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const ads = () => comparisonBase(app.data.records.filter((r) => r.review.state === 'approved'), 'all');
const data = () => ({ trades: app.data.trades?.trades || [], programmes: app.data.programmes?.programmes || [], institutes: app.data.demand?.institutes || [], ads: app.area() === 'noida_ncr' ? ads() : [], area: app.area() });

function head(key, eyebrow, title, lead) {
  return `<div class="ind-hero"><div class="ph-text"><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2><p>${esc(lead)}</p></div>${artBox(key)}</div>`;
}
function saaFor(skill) {
  const m = app.data.saa?.skill_map?.[skill];
  return m && m.fit !== 'none' ? app.data.saa.courses.find((c) => c.id === m.courses[0]) : null;
}

export function renderTalent() {
  const d = data();
  const local = d.institutes.filter((i) => i.area === d.area);
  const pools = talentPools(d.institutes, d.area);
  const count = (t) => local.filter((i) => i.type === t || (t === 'college' && i.type === 'university')).length;
  $('#talent').innerHTML = `${head('institutes', `Industry · ${AREA[d.area]}`, 'Explore local training institutions', 'See institutions in the research list, their listed course areas and potential links to different role skills. Actual student availability is not yet known.')}
  <div class="answers">
    <div class="answer"><span class="label">${icon('location_city')}Training institutes nearby</span><span class="big">${local.length}</span><span class="sub">Research-list institutions around ${esc(AREA[d.area])}, not an official census</span></div>
    <div class="answer"><span class="label">${icon('construction')}ITIs</span><span class="big">${count('iti')}</span><span class="sub">Trade-trained technicians and operators</span></div>
    <div class="answer"><span class="label">${icon('engineering')}Polytechnics</span><span class="big">${count('polytechnic')}</span><span class="sub">Diploma holders for supervisor and QC roles</span></div>
    <div class="answer"><span class="label">${icon('school')}Colleges and universities</span><span class="big">${count('college')}</span><span class="sub">Graduates for engineering, IT and office roles</span></div>
  </div>
  <div class="card"><div class="card-head"><h3>Potential training pools</h3><small>Listed institutions grouped by programme keywords</small></div>
    <div class="pool-grid">${pools.map((p) => `<article class="pool"><div class="pool-top"><h4>${esc(p.label)}</h4><span class="pool-n">${p.institutes.length}</span></div><ul class="inst-mini">${p.institutes.slice(0, 4).map((i) => `<li>${icon('location_city')}<span>${esc(i.name)} <span class="note">${esc(TYPE[i.type])} · ${esc(i.town)}</span></span></li>`).join('') || '<li class="note">None in our list</li>'}</ul></article>`).join('')}</div></div>
  <div class="grid2">
    <div class="card card-body"><h3>${icon('work')} Hiring for a specific role?</h3><p class="note" style="margin:6px 0 12px">See which trades and degrees fit, the gaps, local pay and where to recruit.</p><div class="role-chips">${ROLES.slice(0, 6).map((r) => `<button class="fchip" data-action="hire-role" data-role="${r.id}">${esc(r.title)}</button>`).join('')}</div></div>
    <div class="callout"><strong>How many will graduate this year?</strong> Not available yet. Pass-out numbers by trade and branch need NCVT MIS (ITIs), the state technical board (polytechnics) and AISHE (colleges). Batches usually finish in early summer; confirm dates with each institute.</div>
  </div>
  <div class="ind-overview-next"><button class="btn primary" data-action="tab" data-tab="isupply">Explore institution supply ${icon('arrow_forward')}</button><button class="btn outlined" data-action="tab" data-tab="partner">Plan a partnership</button></div><p class="note">Institute list: ${esc(app.data.demand?.method || '')}. Not learner counts, verified vacancies or an official census. Map positions may be approximate.</p>`;
}

export function renderHire() {
  const d = data();
  const role = ROLES.find((r) => r.id === ui.role) || ROLES[0];
  const t = talentForRole(role, d);
  const e = roleEvidenceSummary(role, ads(), d.area, app.data.asOf);
  const col = (k, label) => `<div class="fit-col"><h4>${esc(label)}</h4>${t.fits[k].length ? t.fits[k].map((f) => `<div class="fit-row"><div class="fit-name">${esc(f.name)}</div><div class="bar"><i style="width:${Math.round(f.share * 100)}%"></i></div><div class="note">Catalogue mentions ${f.matched.length} of ${role.needs.length} role skills${f.missing.length ? ` · explore: ${esc(f.missing.join(', '))}` : ''}</div></div>`).join('') : '<p class="note">No close fit. Train from a related background.</p>'}</div>`;
  const gapCourses = t.gaps.map((s) => ({ s, c: saaFor(s) }));
  $('#hire').innerHTML = `${head('match', 'Industry · Hire for a role', 'Compare qualifications and role skills', 'Review typical ITI trade, diploma and degree skills alongside your role needs, source advertisements and potential institution partners. This is not a candidate assessment.')}
  <div class="role-chips big" role="group" aria-label="Role">${ROLES.map((r) => `<button class="fchip ${r.id === role.id ? 'active' : ''}" data-action="hire-role" data-role="${r.id}" aria-pressed="${r.id === role.id}">${esc(r.title)}</button>`).join('')}</div>
  <div class="answers">
    <div class="answer"><span class="label">${icon('construction')}Skills the role needs</span><span class="big">${role.needs.length}</span><span class="sub">${esc(role.needs.join(', '))}</span></div>
    <div class="answer"><span class="label">${icon('currency_rupee')}Advertised monthly pay sample</span><span class="big">${e.pay ? rupees(e.pay.median) : '-'}</span><span class="sub">${e.pay ? `Middle advertised minimum; ${e.pay.n} Noida pilot ad(s), range of advertised amounts ${rupees(e.pay.low)} to ${rupees(e.pay.high)}` : 'No comparable local advertised-pay evidence available'}</span></div>
    <div class="answer"><span class="label">${icon('location_city')}Possible institute matches</span><span class="big">${t.institutes.length}</span><span class="sub">Heuristic match from listed courses; confirm directly</span></div>
    <div class="answer"><span class="label">${icon('groups')}Related public ads</span><span class="big">${e.status === 'region_unavailable' ? '-' : e.count}</span><span class="sub">${e.status === 'region_unavailable' ? 'Regional ad sample unavailable' : 'Noida pilot ads, not confirmed opportunities'}</span></div>
  </div>
  <div class="card"><div class="card-head"><h3>Catalogue-based qualification comparisons</h3><small>Named role skills appearing in typical programme catalogues</small></div><div class="fit-cols">${col('iti', 'ITI trades')}${col('polytechnic', 'Diplomas')}${col('college', 'Degrees')}</div></div>
  <div class="grid2">
    <div class="card"><div class="card-head"><h3>Skills to validate or develop</h3><small>Courses and workplace training are possible approaches</small></div><div class="card-body"><ul class="plain">${gapCourses.length ? gapCourses.map(({ s, c }) => `<li><strong>${esc(s)}</strong>: ${c ? `${esc(c.title)} <span class="note">· Swift AI Academy · ${esc(c.hours)} h</span>` : '<span class="note">on-the-job or ITI/Sector Skill Council short course</span>'}</li>`).join('') : '<li>The best-fit background already covers every skill.</li>'}</ul><p class="note" style="margin-top:10px">A course cannot establish formal eligibility, replace employer assessments, or guarantee availability. Training options need separate confirmation.</p><div class="actions" style="margin-top:10px"><button class="btn primary" data-action="tab" data-tab="partner">${icon('handshake')}Plan a partnership</button><button class="btn tonal" data-action="tab" data-tab="apprentice">Hire as apprentices</button></div></div></div>
    <div class="card"><div class="card-head"><h3>Institutes to investigate</h3><small>${t.institutes.length} possible matches from listed programmes</small></div><div class="card-body"><ul class="inst-mini">${t.institutes.map((i) => `<li>${icon('location_city')}<span>${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>` : esc(i.name)} <span class="note">${esc(TYPE[i.type])} · ${esc(i.town)}</span></span></li>`).join('') || '<li class="note">None in our list for this area.</li>'}</ul></div></div>
  </div>
  <section class="card ind-evidence-sources"><div class="card-head"><h3>Public advertisements behind this comparison</h3><small>${e.status === 'region_unavailable' ? 'Comparable regional data unavailable' : `${e.count} deduplicated Noida pilot ads`}</small></div><div class="card-body">${e.records.length ? `<ul class="inst-source-list">${e.records.slice(0,5).map((x)=>`<li><a href="${esc(x.source_url)}" target="_blank" rel="noopener">${esc(x.role_title_raw)} ${icon('open_in_new')}</a><span>${esc(x.employer_identity || 'Employer not named')} · Sector ${esc(x.sector)}</span></li>`).join('')}</ul>` : `<p class="note">${esc(e.reason)}</p>`}<p class="note">${esc(e.reason)} Qualification shares are a catalogue comparison, not a measurement of any person's skills or a verified employment outcome.</p></div></section>`;
}

export function renderApprentice() {
  const routes = app.data.demand?.apply_routes || [];
  const get = (id) => routes.find((r) => r.id === id);
  const naps = get('naps'), nats = get('nats'), pmis = get('pmis');
  const card = (r, who, steps) => r ? `<article class="route"><div class="route-top"><h4>${esc(r.name)}</h4></div><p><strong>Hire:</strong> ${esc(who)}</p><p>${esc(r.what)}</p>${r.stipend ? `<p class="note"><strong>Stipend:</strong> ${esc(r.stipend)}</p>` : ''}<details class="disclose"><summary>How an employer takes part</summary><ol class="how-list">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details><a class="btn outlined small" href="${esc(r.url)}" target="_blank" rel="noopener">Open the portal${icon('open_in_new')}</a></article>` : '';
  $('#apprentice').innerHTML = `${head('plan', 'Industry · Apprentices and interns', 'Train your own talent, with government support', 'Apprenticeship schemes let you hire freshers on a stipend, train them on your line, and keep the best. These are the main routes for employers.')}
  <div class="route-grid">
    ${card(naps, 'ITI pass-outs, freshers and others in designated and optional trades', ['Register your establishment on the Apprenticeship India portal', 'Post apprenticeship seats by trade', 'Pick candidates and sign the apprenticeship contract online', 'Pay the stipend and claim the government share where eligible'])}
    ${card(nats, 'Diploma holders and graduates', ['Register your establishment on the NATS portal', 'Post training places for diploma or degree holders', 'Select candidates and register their contracts', 'Pay the stipend; the scheme reimburses its share as per current rules'])}
    ${card(pmis, 'Young people aged 21 to 24 not in full-time work or study', ['Check whether your company is eligible to offer places', 'Post internships on the portal', 'Select interns and track their 12 months on the portal'])}
  </div>
  <div class="callout"><strong>Check the current rules on each portal.</strong> Stipend rates and the government share were revised recently and some sources disagree. The figures above come from web search results on 24 Oct 2026.</div>`;
}

const REQ_KEY = 'opx-hire-requests';
export function renderPartner() {
  const d = data();
  const reqs = app.ls.get(REQ_KEY, []);
  $('#partner').innerHTML = `${head('signals', 'Industry · Request candidates', 'Tell us who you need', 'Share the role, how many and when. We match you with institutes nearby, and Swift AI Academy can train the shortlist on the skills they lack.')}
  <div class="grid2">
    <form class="card card-body form" data-form="hire-request">
      <div class="callout"><strong>Demo.</strong> Requests are saved only in this browser. Nothing is sent to anyone.</div>
      <div class="form-grid">
        <div class="full"><label for="hrRole">Role</label><select id="hrRole" name="role">${ROLES.map((r) => `<option value="${r.id}" ${r.id === ui.role ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></div>
        <div><label for="hrN">How many people</label><input id="hrN" name="n" type="number" min="1" max="500" value="10" required/></div>
        <div><label for="hrWhen">Start by</label><input id="hrWhen" name="when" type="month" required/></div>
        <div class="full"><label for="hrTrain">Pre-joining training</label><select id="hrTrain" name="train"><option value="yes">Yes, train the shortlist on missing skills</option><option value="no">No, we train on the job</option></select></div>
      </div>
      <div class="actions"><button class="btn primary" type="submit">${icon('handshake')}Save request</button></div>
    </form>
    <div class="card"><div class="card-head"><h3>Your requests</h3><small>${reqs.length} saved in this browser</small></div><div class="card-body">${reqs.length ? reqs.map((q) => { const r = ROLES.find((x) => x.id === q.role); const t = talentForRole(r, d); return `<article class="req"><div class="rec-top"><h4>${esc(q.n)} × ${esc(r.title)}</h4><span class="trust plan">Matching</span></div><p class="note">Start by ${esc(q.when)} · ${q.train === 'yes' ? 'Pre-joining training requested' : 'On-the-job training'}</p><p class="note"><strong>Institutes to approach:</strong> ${esc(t.institutes.slice(0, 4).map((i) => i.name).join('; ') || 'none in our list')}</p>${q.train === 'yes' && t.gaps.length ? `<p class="note"><strong>Training plan:</strong> ${esc(t.gaps.map((s) => saaFor(s)?.title || s).join(', '))}</p>` : ''}</article>`; }).join('') : '<p class="note">No requests yet. Your matched institutes and training plan will show here.</p>'}${reqs.length ? '<button class="btn text small" data-action="hire-clear">Clear requests</button>' : ''}</div></div>
  </div>`;
}

app.forms['hire-request'] = (form) => {
  const f = new FormData(form);
  const list = app.ls.get(REQ_KEY, []);
  list.unshift({ role: String(f.get('role')), n: Number(f.get('n')), when: String(f.get('when')), train: String(f.get('train')), at: Date.now() });
  app.ls.set(REQ_KEY, list.slice(0, 10));
  toast('Request saved in this browser (demo)');
  renderPartner();
};
app.actions['hire-clear'] = () => { app.ls.set(REQ_KEY, []); renderPartner(); };
app.actions['hire-role'] = (el) => { ui.role = el.dataset.role; app.ls.set('opx-industry-role', ui.role); if (app.state.tab !== 'hire') app.actions.tab({ dataset: { tab: 'hire' } }); else renderHire(); };
app.views.talent = renderTalent;
app.views.hire = renderHire;
app.views.apprentice = renderApprentice;
app.views.partner = renderPartner;
