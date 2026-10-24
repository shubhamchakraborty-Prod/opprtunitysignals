// Where to apply: for college, polytechnic and ITI learners, the jobs here
// that accept their qualification, the official portals to apply on, the
// skills employers ask for, and how Swift AI Academy helps close the gap.
import { app } from '../app.js';
import { esc, $, artBox, icon, sectorTag } from '../ui.js';
import { filterOpportunities } from '../../../src/core/filters.js';
import { representatives } from '../../../src/core/dedupe.js';
import { wageText } from '../../../src/core/decisions.js';
import { profile } from './learner-profile.js';
import { acceptsType } from '../../../src/core/learners.js';

const TYPES = {
  iti: { label: 'ITI', long: 'ITI trainee or pass-out', accepts: (acc) => acc.some((t) => t.startsWith('iti_') || t === '10th'), tracks: ['comms', 'analytics'], first: ['CO01', 'DA01'],
    why: 'Most entry roles near Sector 62 and 63 ask for spoken English, customer handling and basic computer and Excel skills on top of the trade.' },
  polytechnic: { label: 'Polytechnic', long: 'Diploma student or holder', accepts: (acc) => acc.includes('diploma') || acc.some((t) => t.startsWith('iti_')), tracks: ['analytics', 'comms'], first: ['DA01', 'CO01'],
    why: 'Diploma holders can reach supervisor, quality and MIS roles. Reporting, dashboards and clear communication make the difference.' },
  college: { label: 'College', long: 'Degree student or graduate', accepts: (acc) => acc.some((t) => /degree|graduate|12th/.test(t)), tracks: ['analytics', 'aiml', 'comms'], first: ['DA01', 'AI01'],
    why: 'Graduate roles here are in data, IT support, sales and customer service. AI and data skills are the fastest-growing asks nationally.' },
};
const AREA_ROUTES = { noida_ncr: ['up_sewayojan', 'up_rozgar_mela'], kalyani: ['wb_employment_bank', 'wb_karmadisha'], siliguri: ['wb_employment_bank', 'wb_karmadisha'] };
const WB = ['wb_employment_bank', 'wb_karmadisha'];
const UP = ['up_sewayojan', 'up_rozgar_mela'];

export function renderPath() {
  const lt = profile().type;
  const root = $('#path');
  const d = app.data.demand;
  const T = TYPES[lt];
  const area = app.area();
  const saa = app.data.saa;
  const approved = app.data.records.filter((r) => r.review.state === 'approved');
  const ads = representatives(filterOpportunities(approved, { sector: 'all', query: '', family: 'all', career: 'all', includeHistorical: false, includeUnclear: false, verification: 'all', from: null, to: null }));
  const open = ads.filter((r) => acceptsType(r, lt)).sort((a, b) => (a.experience.min_months ?? 0) - (b.experience.min_months ?? 0));
  const fresh = open.filter((r) => (r.experience.min_months ?? 0) < 12);
  const routes = (d?.apply_routes || []).filter((r) => r.for.includes(lt) && !(area === 'noida_ncr' ? WB : UP).includes(r.id))
    .sort((a, b) => Number(AREA_ROUTES[area].includes(b.id)) - Number(AREA_ROUTES[area].includes(a.id)));
  const demand = (d?.in_demand || []).filter((x) => x.learner_types.includes(lt)).slice(0, 6);
  const tracks = T.tracks.map((id) => saa.tracks.find((t) => t.id === id)).filter(Boolean);
  const inst = (d?.institutes || []).filter((i) => i.area === area && (lt === 'iti' ? i.type === 'iti' : lt === 'polytechnic' ? i.type === 'polytechnic' : ['college', 'university'].includes(i.type)));
  const areaName = { noida_ncr: 'Noida', kalyani: 'Kalyani', siliguri: 'Siliguri' }[area];
  root.innerHTML = `<div class="section-head">${artBox('path')}<div><div class="eyebrow">For learners · ${esc(areaName)}</div><h2>Where can you apply, and what will help you get hired?</h2><p>Choose what you are studying. You will see jobs that accept your qualification, the official portals to apply on, the skills employers ask for, and the Swift AI Academy courses that build them.</p></div></div>
  <div class="type-tabs" role="tablist" aria-label="I am a">${Object.entries(TYPES).map(([k, t]) => `<button role="tab" class="type-tab ${lt === k ? 'active' : ''}" aria-selected="${lt === k}" data-action="lp-type" data-type="${k}">${icon(k === 'iti' ? 'construction' : k === 'polytechnic' ? 'engineering' : 'school')}<span><b>${esc(t.label)}</b><small>${esc(t.long)}</small></span></button>`).join('')}</div>

  <div class="answers">
    <div class="answer"><span class="label">${icon('work')}Ads open to you</span><span class="big">${open.length}</span><span class="sub">Of ${ads.length} ads in Sectors 62 and 63, these accept ${esc(T.label)} or name no qualification</span></div>
    <div class="answer go"><span class="label">${icon('north_east')}Open to freshers</span><span class="big">${fresh.length}</span><span class="sub">Less than a year of experience asked</span></div>
    <div class="answer"><span class="label">${icon('route')}Places to apply</span><span class="big">${routes.length}</span><span class="sub">Official portals for ${esc(T.label)} learners</span></div>
    <div class="answer"><span class="label">${icon('location_city')}Institutes nearby</span><span class="big">${inst.length}</span><span class="sub">${esc(T.label)} institutes within 100 km of ${esc(areaName)}</span></div>
  </div>

  <div class="path-steps">
    <section class="pstep"><div class="pstep-n">1</div><div class="pstep-body"><h3>Apply for jobs and apprenticeships</h3><p class="note">Government portals are free. Never pay anyone to apply.</p>
      <div class="route-grid">${routes.map((r) => `<article class="route ${AREA_ROUTES[area].includes(r.id) ? 'local' : ''}"><div class="route-top"><h4>${esc(r.name)}</h4>${AREA_ROUTES[area].includes(r.id) ? '<span class="tag suit">Your state</span>' : ''}</div><p>${esc(r.what)}</p>${r.stipend ? `<p class="note"><strong>Stipend:</strong> ${esc(r.stipend)}</p>` : ''}<p class="note"><strong>Who:</strong> ${esc(r.eligibility)}</p>${r.how?.length ? `<details class="disclose"><summary>How to apply</summary><ol class="how-list">${r.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol></details>` : ''}<a class="btn outlined small" href="${esc(r.url)}" target="_blank" rel="noopener">Open the portal${icon('open_in_new')}</a></article>`).join('')}</div></div></section>

    <section class="pstep"><div class="pstep-n">2</div><div class="pstep-body"><h3>Jobs here that accept ${esc(T.label)} learners</h3>
      ${open.length ? `<ul class="ad-list">${open.slice(0, 8).map((r) => `<li class="ad-row"><div><a href="#" data-action="open-record" data-id="${esc(r.source_id)}">${esc(r.role_title_raw)}</a><div class="note">${esc(r.employer_identity || 'Employer not named')} · ${esc(wageText(r.wage))} · ${esc(r.experience.raw)}</div></div>${sectorTag(r)}</li>`).join('')}</ul>${open.length > 8 ? `<button class="linkbtn" data-action="tab" data-tab="discover">See all ${open.length} on the jobs map${icon('arrow_forward')}</button>` : ''}` : '<p class="note">No current ads in Sectors 62 and 63 name this qualification.</p>'}
      ${area !== 'noida_ncr' ? `<p class="callout" style="margin-top:10px">Job ads are tracked for Noida Sectors 62 and 63 so far. For ${esc(areaName)}, use the state portals above and see <button class="linkbtn" data-action="tab" data-tab="regions">industry around ${esc(areaName)}</button>.</p>` : ''}</div></section>

    <section class="pstep"><div class="pstep-n">3</div><div class="pstep-body"><h3>Skills employers are asking for</h3>
      <ul class="demand-list">${demand.map((x) => `<li><strong>${esc(x.skill_or_role)}</strong><p class="note">${esc(x.detail)}</p></li>`).join('')}</ul></div></section>

    <section class="pstep"><div class="pstep-n">4</div><div class="pstep-body"><h3>How Swift AI Academy helps</h3><p>${esc(T.why)}</p>
      <div class="track-grid">${tracks.map((t) => `<article class="track"><div class="eyebrow">${esc(t.estimate.replace(/&bull;|•/g, '·'))}</div><h4>${esc(t.name)}</h4><p class="note">${esc(t.blurb)}</p><ul class="plain">${t.courses.map((cid) => { const c = saa.courses.find((x) => x.id === cid); return c ? `<li><strong>${esc(c.title)}</strong> <span class="note">${esc(c.hours)} h · ${esc(c.level || '')}</span></li>` : ''; }).join('')}</ul><p class="note">Leads to: ${esc(t.roles.join(', '))}</p></article>`).join('')}</div>
      <div class="actions"><button class="btn primary" data-action="tab" data-tab="learn">${icon('school')}Build my skill plan</button><button class="btn tonal" data-action="saa-start" data-course="${esc(T.first[0])}">Start with ${esc(saa.courses.find((c) => c.id === T.first[0])?.title || '')}</button></div></div></section>

    <section class="pstep"><div class="pstep-n">5</div><div class="pstep-body"><h3>Institutes near ${esc(areaName)}</h3>
      <ul class="inst-mini cols">${inst.map((i) => `<li>${icon('location_city')}<span>${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>` : esc(i.name)}<span class="note"> · ${esc(i.town)}</span></span></li>`).join('') || '<li class="note">None found in our list.</li>'}</ul>
      <button class="linkbtn" data-action="tab" data-tab="institutes">See all institutes on the map${icon('arrow_forward')}</button></div></section>
  </div>
  <p class="note">Portal details, stipends and eligibility come from web search results on 24 Oct 2026 and can change. Check the official portal before applying.</p>`;
}

app.views.path = renderPath;
