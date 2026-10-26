import {SIGNALS,SOURCE_REGISTRY,INSTITUTES,ROLE_FAMILIES,GEOGRAPHIES,distinct,AS_OF} from './data.js';
import {pageMarkup, recordMarkup} from './showcase-pages.js';
import {icon} from '../ui.js';

export const demoState={page:'overview',area:'noida',query:'',kind:'all',confidence:'all',selected:'',
  programme:'Electrician',institutionType:'ITI',sourceGroup:'all',role:'quality',saved:new Set(),drafts:[],
  notice:'',modal:'',sync:0,openNav:false,period:'30'};
export const allRecords=()=>SIGNALS.filter(x=>x.area===demoState.area);
export const canonical=()=>distinct(allRecords());
export const roles=()=>canonical().filter(x=>['job_ad','employer_confirmation'].includes(x.kind));
export const confirmed=()=>roles().filter(x=>x.employerVerified);
export const geography=()=>GEOGRAPHIES.find(x=>x.id===demoState.area)||GEOGRAPHIES[0];
export const human=(v)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const number=(n)=>Number(n).toLocaleString('en-IN');
export const rupees=(n)=>n==null?'Not listed':'₹'+number(n*1000)+'/mo';
export const confidence=(x)=>x.confidence>=85?'High':x.confidence>=65?'Medium':'Low';
export const badge=(x)=>`<span class="show-confidence ${confidence(x).toLowerCase()}">${confidence(x)} · ${x.confidence}%</span>`;
export const action=(label,kind,attr='',style='quiet',symbol='arrow_forward')=>`<button class="show-button ${style}" type="button" data-do="${kind}" ${attr}>${icon(symbol)}${human(label)}</button>`;
const MENU=[['overview','Overview','layout_dashboard'],['opportunities','Opportunities','briefcase_business'],
['trends','Market intelligence','chart_no_axes_combined'],['institutions','Institutions','school'],
['industry','Industry','factory'],['learners','Learners','graduation_cap'],
['sources','Integrations','database'],['operations','Operations','shield_check']];
export const menus=MENU;
let logo='';
function chrome(){
 const d=demoState,p=MENU.find(x=>x[0]===d.page)?.[1]||'Overview';
 return `<div class="show-shell"><header class="show-topbar">
    <button class="show-logo" data-do="nav" data-id="overview"><img src="${human(logo)}" alt="ConveGenius.ai"/><span><strong>Opportunity Explorer</strong><small>LABOUR MARKET INTELLIGENCE</small></span></button>
    <label class="show-search">${icon('search')}<input id="showSearch" placeholder="Search occupations, skills, employers" value="${human(d.query)}" aria-label="Search opportunity intelligence"/><kbd>/</kbd></label>
    <div class="show-topactions"><span class="show-health">${icon('cloud_done')} Sources healthy</span>
    <button data-do="help" class="show-icon" aria-label="About this workspace">${icon('circle_help')}</button>
    <button data-do="alerts" class="show-icon" aria-label="Notifications">${icon('bell')}</button>
    <span class="show-demo">DEMO</span><button data-do="menu" class="show-icon show-menu" aria-label="Toggle navigation">${icon('menu')}</button></div>
  </header><div class="show-workspace"><aside class="show-sidebar ${d.openNav?'open':''}"><span class="show-nav-caption">WORKSPACE</span><nav aria-label="Main menu">
   ${MENU.map(([id,l,ic])=>`<button data-do="nav" data-id="${id}" class="${id===d.page?'active':''}" aria-current="${id===d.page?'page':'false'}">${icon(ic)}<span>${l}</span></button>`).join('')}</nav>
   <span class="show-nav-caption">REGIONS</span><div class="show-sideareas">${GEOGRAPHIES.map(g=>`<button data-do="area" data-id="${g.id}" class="${g.id===d.area?'active':''}">${icon('map_pin')} ${human(g.label)}</button>`).join('')}</div>
   <div class="show-sidebar-foot">${icon('sparkles')}<strong>One intelligence layer</strong><p>Useful answers for learners, institutions, industry and research teams.</p></div></aside>
  <main class="show-main" id="showMain"><div class="show-breadcrumb">Workspace ${icon('chevron_right')} <strong>${human(p)}</strong><span>${icon('clock')} ${AS_OF}</span></div>
  ${d.notice?`<div class="show-notice" role="status">${icon('check_circle')} ${human(d.notice)}</div>`:''}
  ${pageMarkup(d.page)}<footer class="show-footer"><span>© ConveGenius.ai · Opportunity Explorer</span><span>Illustrative workspace · ${AS_OF}</span></footer></main></div>
  ${d.modal?`<div class="show-overlay" data-do="close"><aside class="show-drawer" role="dialog" aria-label="Detail"><button data-do="close" class="show-close" aria-label="Close">${icon('x')}</button>${d.modal==='help'?help():d.modal==='alerts'?alerts():d.modal==='source'?sourceDetail():recordMarkup(SIGNALS.find(x=>x.id===d.selected))}</aside></div>`:''}</div>`;
}
function help(){return `<h2>About Opportunity Explorer</h2><p>Opportunity Explorer helps people understand local employment signals, skills and training supply.</p>
<div class="show-help-notice"><strong>Demonstration workspace</strong><p>All employers, datasets, job records, source statuses, map markers, institution names, candidate supply and metrics here are fabricated for demonstration. No government, job-portal or social-media API is actually connected. No actions contact outside organisations.</p></div><h3>How to read confidence</h3><p>Confidence measures the illustrative strength of evidence—not the probability of hiring. Employer-confirmed openings are separate from public advertisements, social discussion and investment announcements.</p>`;}
function alerts(){return `<h2>Latest updates</h2><p>This sample alert panel shows useful, evidence-led changes rather than artificial urgency.</p><div class="show-alert-row">10 data source categories included in the fictitious integration network.</div><div class="show-alert-row">Automation and quality role families have new illustrative signals.</div><div class="show-alert-row">Institution supply profiles are available for your selected region.</div>`;}
function sourceDetail(){return `<h2>Connection details</h2><p>Illustrative source integration. A production connector would need a provider-specific agreement, access credential, retry strategy, audit history, update cadence and source licence.</p>`;}
export function renderShowcase(goTop=false){
 const root=document.getElementById('showcase-app');if(!root)return;
 const y=window.scrollY;root.innerHTML=chrome();
 const q=document.getElementById('showSearch');
 q?.addEventListener('change',e=>{demoState.query=e.target.value;demoState.page='opportunities';renderShowcase(true)});
 document.getElementById('showRegion')?.addEventListener('change',e=>{demoState.area=e.target.value;demoState.selected='';renderShowcase()});
 document.getElementById('showPeriod')?.addEventListener('change',e=>{demoState.period=e.target.value;renderShowcase()});
 document.getElementById('showConfidence')?.addEventListener('change',e=>{demoState.confidence=e.target.value;renderShowcase()});
 document.getElementById('showProgramme')?.addEventListener('change',e=>{demoState.programme=e.target.value;renderShowcase()});
 document.getElementById('showRole')?.addEventListener('change',e=>{demoState.role=e.target.value;renderShowcase()});
 document.getElementById('showLayer')?.addEventListener('change',e=>{demoState.kind=e.target.value;renderShowcase()});
 document.getElementById('showHiringForm')?.addEventListener('submit',e=>{
    e.preventDefault();const f=new FormData(e.target),count=Number(f.get('count'));
    if(!Number.isInteger(count)||count<1||count>500)return;
    demoState.drafts.unshift({role:String(f.get('role')),count,window:String(f.get('window'))});
    demoState.notice='Requirement saved to this demo session. No request was sent.';renderShowcase();
 });
 window.scrollTo({top:goTop?0:y,behavior:'instant'});
}
function dispatch(el,event){
 const d=demoState,k=el.dataset.do,id=el.dataset.id;
 if(k==='nav'){d.page=id;d.openNav=false;d.notice='';d.query='';renderShowcase(true)}
 else if(k==='area'){d.area=id;d.openNav=false;d.selected='';renderShowcase(true)}
 else if(k==='kind'){d.kind=id;renderShowcase()}
 else if(k==='institutetype'){d.institutionType=id;renderShowcase()}
 else if(k==='sourcegroup'){d.sourceGroup=id;renderShowcase()}
 else if(k==='select'){d.selected=id;renderShowcase()}
 else if(k==='detail'){d.selected=id;d.modal='record';renderShowcase()}
 else if(k==='role'){d.role=id;d.page='industry';renderShowcase(true)}
 else if(k==='institute'){d.page='institutions';d.institutionType=INSTITUTES.find(x=>x.id===id)?.type||'ITI';d.selected=id;renderShowcase(true)}
 else if(k==='save'){if(d.saved.has(id))d.saved.delete(id);else d.saved.add(id);d.notice=d.saved.has(id)?'Saved to your watchlist.':'Removed from your watchlist.';renderShowcase()}
 else if(k==='help'||k==='alerts'){d.modal=k;renderShowcase()}
 else if(k==='source'){d.modal='source';renderShowcase()}
 else if(k==='close'){if(event.target.classList.contains('show-overlay')||el.classList.contains('show-close')){d.modal='';renderShowcase()}}
 else if(k==='sync'){d.sync++;d.notice='Sources synchronised in the demonstration.';renderShowcase()}
 else if(k==='menu'){d.openNav=!d.openNav;renderShowcase()}
 else if(k==='remove-draft'){d.drafts.splice(Number(id),1);renderShowcase()}
}
export function initShowcase(){
 logo=document.querySelector('.brand img')?.src||'assets/convegenius-logo.png';
 document.body.className='showcase-body';document.body.innerHTML='<div id="showcase-app"></div>';
 document.addEventListener('click',e=>{const el=e.target.closest?.('[data-do]');if(el)dispatch(el,e)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&demoState.modal){demoState.modal='';renderShowcase()}if(e.key==='/'&&!/input|textarea|select/i.test(e.target.tagName)){e.preventDefault();document.getElementById('showSearch')?.focus()}});
 renderShowcase(true);
}
