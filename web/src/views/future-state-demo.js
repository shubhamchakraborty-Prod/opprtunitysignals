// Future-state demo is deliberately segregated from production datasets and APIs.
// Everything on this screen is fictional, simulated, and intended only for team reviews.
import { app } from '../app.js';
import { esc, $, icon } from '../ui.js';
import { FUTURE_DEMO_MAP_SVG } from './future-state-map.generated.js';
import { DEMO_AREAS, DEMO_ASOF, DEMO_CONNECTORS, DEMO_SIGNALS, DEMO_STORY } from './future-state-demo-data.js';
import { demoConfidence, demoSignalCounts } from '../../../src/core/demo-confidence.js';
import { demoBriefHtml } from './future-state-brief.js';
import { visionTourHtml } from './vision-tour.js';

let area='noida', band='all', selected='DM-002', category='all', persona='learner', syncCounter=0;
const LABEL = {job_ad:'Job advertisement',employer_confirmation:'Employer-confirmed opening · simulated',social_signal:'Unverified social signal',training_supply:'Institution supply signal',project_announcement:'Project announcement'};
const ICON = {job_ad:'work',employer_confirmation:'verified',social_signal:'campaign',training_supply:'school',project_announcement:'factory'};
const PERSONAS=[['research','Research team'],['learner','Learner'],['institution','Institution'],['industry','Industry']];
const access = {Government:'Documented API or formal government data access',Jobs:'Commercial licensing or employer consent', 'Social & media':'Platform-approved access or licensed media feeds',Direct:'Institution/employer opt-in with access controls'};
const signalKind = s=>({job_ad:'jobs',employer_confirmation:'jobs',training_supply:'institutes',social_signal:'social',project_announcement:'projects'})[s.kind];
const trust=(s)=>demoConfidence(s);
const badge=(s)=>`<span class="fd-confidence fd-${trust(s).band.toLowerCase().replaceAll(' ','-')}">${trust(s).band} · ${trust(s).score}/100</span>`;
const label = (s)=>`<span class="fd-signal-type">${icon(ICON[s.kind]||'info')}${esc(LABEL[s.kind] || s.kind)}</span>`;
const allow=(s)=>category==='all'||signalKind(s)===category;
const filtered=()=>demoSignalCounts(DEMO_SIGNALS,area,band).items.filter(allow);
const group=(s)=>DEMO_SIGNALS.filter(x=>x.cluster===s.cluster);
function roleContent(s) {
  const note={
    research:['Researcher','Trace evidence, check duplicates and request verification before publishing a vacancy.'],
    learner:['Learner','Explain why this record is relevant, which requirements need checking and where the authorised application route would appear.'],
    institution:['Institution','See nearby programme relevance and possible employer outreach, only if the evidence supports it.'],
    industry:['Industry','Compare role requirements with course catalogues; verify institute capacity and learner consent before outreach.'],
  }[persona];
  return `<div class="fd-persona-result"><strong>${note[0]} interpretation</strong><p>${note[1]}</p><small>Source record: ${esc(s.id)} · ${esc(LABEL[s.kind])}. This is not a live opportunity or an eligibility decision.</small></div>`;
}
function evidence(s){
 const v=trust(s);
 return `<article class="fd-evidence-panel">
   <div class="fd-panel-heading"><div><small>Selected evidence · ${esc(s.id)}</small><h3>${esc(s.title)}</h3></div>${badge(s)}</div>
   <p>${esc(s.detail)}</p>
   <div class="fd-facts"><span>Source <strong>${esc(s.source)}</strong></span><span>Evidence status <strong>${s.mockVerification==='approved'?'Approved in simulation only':'Not employer-confirmed'}</strong></span><span>Location <strong>${s.geoPrecision==='sector_only'?'Sector-level only':'Region-level only'}</strong></span><span>Illustrative freshness <strong>${esc(s.fresh)}</strong></span></div>
   <p class="fd-subhead">Why the example is scored this way</p>
   <div class="fd-score-breakdown">${v.components.map(c=>`<div><span>${esc(c.label)}</span><span class="fd-factor"><i style="width:${Math.round(c.value/c.max*100)}%"></i></span><strong>${c.value}/${c.max}</strong></div>`).join('')}</div>
   ${v.limits.length?`<p class="fd-caps"><strong>Confidence caps:</strong> ${esc(v.limits.join(' · '))}</p>`:''}
   <p class="note">The score describes confidence in this claim, not probability of hiring. Verification, geocoding precision and actual vacancy status are separate checks.</p>
   <div class="fd-persona-tabs" role="group" aria-label="Preview the same evidence by user role">${PERSONAS.map(([id,name])=>`<button class="${persona===id?'active':''}" data-action="fd-persona" data-persona="${id}" aria-pressed="${persona===id}">${name}</button>`).join('')}</div>
   ${roleContent(s)}
  </article>`;
}
export function renderFutureDemo(){
 const data=filtered();
 const counts=demoSignalCounts(DEMO_SIGNALS,area,band);
 const observed=DEMO_SIGNALS.filter(s=>s.area===area);
 if(!data.some(s=>s.id===selected)) selected=data[0]?.id||'';
 const current=DEMO_SIGNALS.find(s=>s.id===selected)||observed[0];
 const avg=data.length?Math.round(data.reduce((a,s)=>a+trust(s).score,0)/data.length):0;
 const connectors=DEMO_CONNECTORS.filter(x=>category==='all'||(category==='jobs'?x.group==='Jobs':category==='social'?x.group==='Social & media':category==='institutes'?x.id==='institutes'||x.id==='ncvt':category==='projects'?x.group==='Government':true));
 $('#idemo').innerHTML=`
  <div class="fd-simulation-header"><span>${icon('auto_awesome')} FUTURE-STATE SIMULATION</span>
    <p>This preview uses entirely synthetic source data, integration statuses and map positions. <strong>No external API keys are connected.</strong> No values on this page are production statistics.</p></div>
  ${visionTourHtml()}
  <div class="fd-hero" id="vision-promise"><div><div class="eyebrow">Opportunity Explorer · Connected intelligence concept</div>
    <h1>One intelligence layer. Four ways to act.</h1>
    <p>See how approved government datasets, licensed jobs feeds, permitted media signals and verified employer inputs could come together—without confusing observations with confirmed openings.</p></div>
    <button class="btn primary" type="button" data-action="fd-sync">${icon('refresh')} Run simulated sync</button>
  </div>
  ${demoBriefHtml(data,persona,trust)}
  <div class="fd-overview-bar" role="group" aria-label="Demo filters">
    <label>Demo geography <select id="fdArea">${DEMO_AREAS.map(x=>`<option value="${x.id}" ${x.id===area?'selected':''}>${esc(x.label)}</option>`).join('')}</select></label>
    <label>Confidence level <select id="fdBand"><option value="all">All confidence levels</option>${['Very high','High','Medium','Low','Needs review'].map(x=>`<option ${band===x?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>Evidence category <select id="fdCategory">${[['all','All source types'],['jobs','Job advertisements and direct checks'],['institutes','Institution supply'],['social','Social mentions'],['projects','Projects / public data']].map(([id,name])=>`<option value="${id}" ${category===id?'selected':''}>${name}</option>`).join('')}</select></label>
  </div>
  <div class="fd-kpis">
    <div><span>Simulated evidence records</span><strong>${data.length}</strong><small>Never live vacancies</small></div>
    <div><span>Distinct source clusters</span><strong>${new Set(data.map(s=>s.cluster)).size}</strong><small>Mirrors counted once</small></div>
    <div><span>Mock-confirmed openings</span><strong>${data.filter(s=>s.mockVerification==='approved').reduce((sum,s)=>sum+(s.illustrativeOpenings||0),0)}</strong><small>Simulation only; real total unchanged</small></div>
    <div><span>Average sample confidence</span><strong>${data.length?avg+'/100':'–'}</strong><small>Illustrative claim scoring</small></div>
  </div>
  <div class="fd-map-grid" id="vision-map">
    <section class="fd-map-card"><div class="fd-card-header"><div><h2>Opportunity intelligence map</h2><p>${esc(DEMO_AREAS.find(x=>x.id===area)?.label)} · synthetic markers</p></div><span class="fd-map-warning">${icon('info')} Illustrative · not to scale</span></div>
      <div class="fd-map-art"><div class="fd-map-background">${FUTURE_DEMO_MAP_SVG}</div>
        ${data.map(s=>`<button type="button" class="fd-marker ${s.id===selected?'active':''} fd-marker-${signalKind(s)}" style="left:${s.x}%;top:${s.y}%" data-action="fd-select" data-id="${s.id}" aria-label="${esc(s.title)}; ${trust(s).band} confidence" aria-pressed="${selected===s.id}"><span>${icon(ICON[s.kind])}</span></button>`).join('')}
        <div class="fd-map-key"><span><i class="fd-dot jobs"></i>Job / direct</span><span><i class="fd-dot institutes"></i>Institution</span><span><i class="fd-dot projects"></i>Projects</span><span><i class="fd-dot social"></i>Social</span></div>
      </div><p class="note fd-map-foot">The generated background is a schematic illustration. Pins are positioned for storytelling only; no actual addresses, sectors or employers are being mapped. A real product should retain MapLibre with verified coordinates and geographic uncertainty.</p>
    </section>
    <section class="fd-signal-card" id="vision-signals"><div class="fd-card-header"><div><h2>Unified signals</h2><p>${data.length} visible synthetic records</p></div><span class="fd-sync-status">Demo sync ${syncCounter? '#'+syncCounter:'snapshot'}</span></div>
      <div class="fd-signal-list">${data.length?data.map(s=>`<button class="fd-signal ${s.id===selected?'active':''}" data-action="fd-select" data-id="${s.id}">
       <span class="fd-signal-top">${label(s)} ${badge(s)}</span><strong>${esc(s.title)}</strong><span class="fd-signal-desc">${esc(s.detail)}</span><small>${esc(s.source)} · demo ${esc(s.fresh)}</small></button>`).join(''):'<div class="fd-no-matches">No sample records meet the current demo filters. Clear one filter to explore other signals.</div>'}</div></section>
  </div>
  <div id="vision-evidence">${current?evidence(current):'<div class="fd-no-matches">Select a visible signal to view its evidence explanation.</div>'}</div>
  <section class="vision-role-doors" id="vision-people" aria-label="Open each audience experience">
    <div class="fd-card-header"><div><h2>Four people, one intelligence foundation</h2><p>Experience the same evidence from each user's point of view, then explore the role-specific sample screens.</p></div></div>
    <div class="vision-role-grid">
      ${[
        ['learners','Learner','Discover roles, skills and appropriate application routes','school'],
        ['institution','Institution','Understand programme relevance and employer outreach','apartment'],
        ['industry','Industry','Explore role requirements, institutes and partnerships','factory'],
        ['internal','Research team','Check reliability, verify claims and approve evidence','fact_check']
      ].map(([v,title,body,ic])=>`<article><span class="vision-role-icon">${icon(ic)}</span><h3>${title}</h3><p>${body}</p>${v!=='internal'?`<button class="btn outlined small" data-action="view" data-view="${v}">Open ${title.toLowerCase()} example ${icon('arrow_forward')}</button>`:'<p class="note">The operational research workbench remains permission-controlled. Use the Research perspective in this demo for a preview.</p>'}</article>`).join('')}
    </div>
  </section>
  <section class="fd-connectors" id="vision-sources"><div class="fd-card-header"><div><h2>Simulated integration hub</h2><p>These are planned connector capabilities, not active APIs.</p></div><span class="fd-map-warning">0 real keys configured by this demo</span></div>
   <div class="fd-connector-grid">${connectors.map(c=>`<article><div class="fd-connector-top"><strong>${esc(c.name)}</strong><span>DEMO FEED</span></div>
    <p>${esc(c.use)}</p><dl><div><dt>Category</dt><dd>${esc(c.group)}</dd></div><div><dt>Access model</dt><dd>${esc(c.access)}</dd></div><div><dt>Illustrative rows</dt><dd>${c.demoRows}</dd></div><div><dt>Simulated last sync</dt><dd>${esc(c.age)}</dd></div></dl><p class="fd-connector-real"><strong>Actual access:</strong> ${esc(c.real)}</p></article>`).join('')}</div>
  </section>
  <section class="fd-pipeline" id="vision-pipeline"><h2>How one signal becomes a decision</h2><ol>${DEMO_STORY.map((s,i)=>`<li><b>${i+1}</b><strong>${esc(s.title)}</strong><p>${esc(s.body)}</p></li>`).join('')}</ol></section>
  <div class="fd-endnote"><strong>For the team demo</strong> · Start with the simulated integrations, select a map marker, open its confidence breakdown, switch user perspectives and run the simulated sync. No data on this page is used by the live research KPIs.</div>
 `;
 $('#fdArea').onchange=(e)=>{area=e.target.value;selected='';renderFutureDemo()};
 $('#fdBand').onchange=(e)=>{band=e.target.value;selected='';renderFutureDemo()};
 $('#fdCategory').onchange=(e)=>{category=e.target.value;selected='';renderFutureDemo()};
}
app.actions['fd-select']=(el)=>{selected=el.dataset.id;renderFutureDemo()};
app.actions['fd-persona']=(el)=>{persona=el.dataset.persona;renderFutureDemo()};
app.actions['fd-sync']=()=>{syncCounter+=1;renderFutureDemo()};
app.views.idemo=renderFutureDemo;
