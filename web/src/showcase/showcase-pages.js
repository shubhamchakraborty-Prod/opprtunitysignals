import {SIGNALS,SOURCE_REGISTRY,INSTITUTES,ROLE_FAMILIES,GEOGRAPHIES,distinct,LOCATION_LABEL,AS_OF} from './data.js';
import {demoState as S,allRecords,canonical,roles,confirmed,geography,human as h,number as num,rupees,badge,confidence,action} from './showcase.js';
import {FUTURE_DEMO_MAP_SVG} from '../views/future-state-map.generated.js';
import {icon} from '../ui.js';
const ico=(v)=>icon(v);
const f=(id)=>ROLE_FAMILIES.find(r=>r.id===id)||ROLE_FAMILIES[0];
const common=(title,lead)=>`<div class="show-intro"><div><small>WORKSPACE · ${h(LOCATION_LABEL[S.area])}</small><h1>${h(title)}</h1><p>${h(lead)}</p></div>
 <div class="show-controls"><label>${ico('map_pin')}<select id="showRegion" aria-label="Select region">${GEOGRAPHIES.map(x=>`<option value="${x.id}" ${x.id===S.area?'selected':''}>${h(x.label)}</option>`).join('')}</select></label>
 <label>${ico('calendar_days')}<select id="showPeriod" aria-label="Reporting period"><option value="7" ${S.period==='7'?'selected':''}>7 days</option><option value="30" ${S.period==='30'?'selected':''}>30 days</option><option value="90" ${S.period==='90'?'selected':''}>90 days</option></select></label></div></div>`;
const tile=(label,value,desc,ic,delta='')=>`<div class="show-tile"><div><span>${h(label)}</span><b>${ico(ic)}</b></div><strong>${h(value)}</strong><small>${h(desc)}</small>${delta?`<em>${ico('trending_up')}${h(delta)}</em>`:''}</div>`;
const panelHead=(title,sub,extra='')=>`<div class="show-panel-head"><div><h3>${h(title)}</h3><p>${h(sub)}</p></div>${extra}</div>`;
const kpis=(a)=>`<div class="show-kpis">${a.join('')}</div>`;
const share=(x)=>`<span class="show-status ${x.employerVerified?'approved':x.kind==='job_ad'?'observed':'watch'}">${x.employerVerified?'Employer confirmed':x.kind==='job_ad'?'Observed posting':x.kind==='social_signal'?'Emerging mention':'Industry announcement'}</span>`;
const meter=(n,kind='')=>`<div class="show-bar ${kind}"><i style="width:${Math.min(100,n)}%"></i></div>`;
const stats=()=>{const v=roles();return {ads:v.length,openings:confirmed().reduce((n,r)=>n+(r.openings||0),0),companies:new Set(v.map(r=>r.employer)).size,institutes:INSTITUTES.filter(i=>i.area===S.area),sources:SOURCE_REGISTRY.length,confidence:Math.round(v.reduce((n,r)=>n+r.confidence,0)/Math.max(1,v.length))}};
const evidenceRows=(list,maximum=6)=>`<div class="show-activity">${list.slice(0,maximum).map(x=>`<button data-do="detail" data-id="${x.id}" class="show-activity-row"><span class="show-activity-icon ${x.kind}">${ico(x.employerVerified?'check_circle':x.kind==='social_signal'?'message_circle':x.kind==='project_announcement'?'building_2':'briefcase_business')}</span><span class="show-activity-main"><strong>${h(x.title)}</strong><small>${h(x.employer)} · ${h(x.zone)} · ${h(x.source)}</small></span><span class="show-activity-meta">${badge(x)}<small>${h(x.posted)}</small></span></button>`).join('')}</div>`;
const roleList=()=>ROLE_FAMILIES.map(r=>({...r,ad:roles().filter(x=>x.roleId===r.id)}));
export function recordMarkup(x){
 if(!x)return '<h3>Select a source record to inspect the evidence.</h3>';
 return `<div class="show-detail"><span class="show-mini">EVIDENCE RECORD · ${h(x.id)}</span><h2>${h(x.title)}</h2><p>${h(x.employer)} · ${h(x.zone)}</p>
 <div class="show-detail-states">${share(x)}${badge(x)}</div><div class="show-detail-grid">
 ${[['Role family',f(x.roleId).title],['Source',x.source],['Published',x.posted],['Typical qualification',x.qualification],['Salary',rupees(x.wage)],['Sources cross-checked',String(x.sourceCount)]].map(([a,b])=>`<div><small>${h(a)}</small><strong>${h(b)}</strong></div>`).join('')}</div>
 <h4>Role skills</h4><div class="show-tags">${x.skill.map(t=>`<span>${h(t)}</span>`).join('')}</div>
 <h4>Why this confidence?</h4><p>${h(x.description)}</p>
 <div class="show-confidence-part"><span>Evidence completeness</span>${meter(Math.min(100,x.confidence+2))}<strong>${x.confidence+2}%</strong></div>
 <div class="show-confidence-part"><span>Source corroboration</span>${meter(x.sourceCount*29)}<strong>${x.sourceCount} source${x.sourceCount===1?'':'s'}</strong></div>
 <div class="show-info">${ico('info')} Confidence measures the strength of supporting evidence, not the probability of employment. ${x.employerVerified?'A direct confirmation is recorded in this fictional example.':'This source does not establish a currently open job.'}</div>
 ${action(S.saved.has(x.id)?'Remove saved item':'Save to watchlist','save',`data-id="${x.id}"`,'primary','bookmark')}</div>`;
}
function map(){
 const pins=canonical().filter(x=>['employer_confirmation','social_signal','project_announcement'].includes(x.kind)).slice(0,13);
 return `<section class="show-card show-map-card">${panelHead('Opportunity intelligence map',h(LOCATION_LABEL[S.area])+' · observed opportunities and industrial signals',`<select id="showLayer" aria-label="Filter map layers"><option value="all" ${S.kind==='all'?'selected':''}>All signals</option><option value="employer_confirmation" ${S.kind==='employer_confirmation'?'selected':''}>Employer confirmed</option><option value="social_signal" ${S.kind==='social_signal'?'selected':''}>Social mentions</option><option value="project_announcement" ${S.kind==='project_announcement'?'selected':''}>Investments</option></select>`)}
 <div class="show-map-stage"><div class="show-map-base">${FUTURE_DEMO_MAP_SVG}</div>
 ${pins.filter(x=>S.kind==='all'||x.kind===S.kind).map(x=>`<button class="show-map-pin ${x.employerVerified?'verified':x.kind}" style="left:${x.x}%;top:${x.y}%" data-do="detail" data-id="${x.id}" aria-label="Inspect ${h(x.title)}">${ico(x.employerVerified?'check_circle':x.kind==='social_signal'?'message_circle':'building_2')}</button>`).join('')}
 <div class="show-map-tag">${ico('layers')} 4 layers</div></div>
 <div class="show-map-legend"><span><i class="green"></i>Employer verified</span><span><i class="blue"></i>Ads</span><span><i class="violet"></i>Social</span><span><i class="orange"></i>Investments</span></div>
 </section>`;
}
function demandBars(){
 const rows=roleList().slice(0,6),max=Math.max(1,...rows.map(x=>x.ad.length));
 return `<section class="show-card">${panelHead('In-demand role families','Distinct job observations and role momentum',action('All market insights','nav','data-id="trends"','text','arrow_up_right'))}
 <div class="show-bars">${rows.map(r=>`<button data-do="role" data-id="${r.id}" class="show-bar-row"><span>${h(r.title)}</span>${meter(r.ad.length/max*100)}<b>${r.ad.length}</b><em>+${r.change}%</em></button>`).join('')}</div>
 <div class="show-card-note">Volume and changes are based on a simulated integrated source set.</div></section>`;
}
function overview(){
 const s=stats();
 return `${common('Overview','A single view of labour demand, training supply and the evidence connecting them.')}
 ${kpis([tile('Signals analysed',num(canonical().length),'Deduplicated observations','activity','+12.4%'),tile('Employer-verified openings',num(s.openings),'Directly confirmed examples','badge_check','+8.2%'),tile('Employers tracked',num(s.companies),'Unique employers in region','building_2'),tile('Connected sources',num(s.sources),'Source health is normal','plug_zap','99.8%')])}
 <div class="show-two-col">${map()}${demandBars()}</div>
 <div class="show-two-col wide-left"><section class="show-card">${panelHead('Latest intelligence','Recent observations across the source network',action('View all','nav','data-id="opportunities"','text','arrow_up_right'))}
 ${evidenceRows(canonical().slice().sort((a,b)=>b.posted.localeCompare(a.posted)),6)}</section>
 <section class="show-card">${panelHead('Workforce supply','Local institute and programme intelligence',action('Explore supply','nav','data-id="institutions"','text','arrow_up_right'))}
 <div class="show-supply-snapshot"><div><span>Institutions mapped</span><strong>${s.institutes.length}</strong></div><div><span>Illustrative cohort seats</span><strong>${num(s.institutes.reduce((n,i)=>n+i.seats,0))}</strong></div><div><span>Role families covered</span><strong>${ROLE_FAMILIES.length}</strong></div></div>
 <div class="show-info">${ico('lightbulb')} Compare regional role requirements with programmes, cohorts and relevant employers.</div></section></div>`;
}
function filtered(){
 let records=canonical().filter(x=>S.kind==='all'||x.kind===S.kind);
 if(S.confidence==='high')records=records.filter(x=>x.confidence>=85);
 if(S.confidence==='medium')records=records.filter(x=>x.confidence>=65);
 if(S.query.trim()){const q=S.query.toLowerCase();records=records.filter(x=>[x.title,x.employer,x.sector,x.zone,...x.skill].join(' ').toLowerCase().includes(q))}
 return records.sort((a,b)=>b.posted.localeCompare(a.posted));
}
function opportunities(){
 const records=filtered(),chosen=records.find(x=>x.id===S.selected)||records[0];
 return `${common('Opportunity explorer','All job, employer-confirmation, social and industrial signals in one searchable, verifiable workspace.')}
 <div class="show-filterbar"><div class="show-filterchips">${[['all','All signals'],['employer_confirmation','Verified openings'],['job_ad','Job advertisements'],['social_signal','Social'],['project_announcement','Investments']].map(([id,l])=>`<button class="${S.kind===id?'active':''}" data-do="kind" data-id="${id}">${l}</button>`).join('')}</div>
 <label class="show-mini-select">Evidence confidence<select id="showConfidence"><option value="all" ${S.confidence==='all'?'selected':''}>All confidence</option><option value="high" ${S.confidence==='high'?'selected':''}>High</option><option value="medium" ${S.confidence==='medium'?'selected':''}>Medium or better</option></select></label></div>
 <div class="show-count-line"><strong>${records.length}</strong> matching records · <strong>${confirmed().length}</strong> employer-confirmed examples · <strong>${S.saved.size}</strong> saved</div>
 <div class="show-list-detail"><section class="show-card show-opp-list">${panelHead('Opportunity stream','Select a record to inspect the associated evidence')}
 ${records.length?records.map(x=>`<button class="show-op-row ${chosen?.id===x.id?'selected':''}" data-do="select" data-id="${x.id}"><span class="show-op-line"><strong>${h(x.title)}</strong>${badge(x)}</span><small>${h(x.employer)} · ${h(x.zone)}</small><span class="show-op-footer"><span>${ico('wallet')} ${rupees(x.wage)}</span><span>${ico('calendar')} ${h(x.posted)}</span></span>${share(x)}</button>`).join(''):'<p class="show-empty">No results for these filters. Try another confidence level or search.</p>'}
 </section><aside class="show-card show-selected-detail">${recordMarkup(chosen)}</aside></div>`;
}
function trends(){
 const all=roles(),table=roleList(),max=Math.max(1,...table.map(r=>r.ad.length));
 const skills=[...new Set(ROLE_FAMILIES.flatMap(r=>r.skills))].map(k=>({name:k,count:all.filter(x=>x.skill.includes(k)).length})).sort((a,b)=>b.count-a.count).slice(0,8);
 return `${common('Market intelligence','See growing role families, recurring skills and sectors worth investigating.')}
 ${kpis([tile('Role families',ROLE_FAMILIES.length,'Comparable occupational groups','briefcase_business'),tile('Distinct job records',all.length,'After mirror removal','layers'),tile('Emerging role','Automation','Fastest illustrative momentum','trending_up','+42%'),tile('Average confidence',stats().confidence+'%','Observed job evidence','shield_check')])}
 <div class="show-two-col"><section class="show-card">${panelHead('Demand and momentum','Comparable counts by role family')}
 <div class="show-bars">${table.map(r=>`<button data-do="role" data-id="${r.id}" class="show-bar-row"><span>${h(r.title)}</span>${meter(r.ad.length/max*100)}<b>${r.ad.length}</b><em>+${r.change}%</em></button>`).join('')}</div></section>
 <section class="show-card">${panelHead('Skills employers mention','Occurrences in distinct advertised role records')}
 <div class="show-bars">${skills.map(k=>`<div class="show-bar-row"><span>${h(k.name)}</span>${meter(k.count/Math.max(1,skills[0].count)*100,'teal')}<b>${k.count}</b></div>`).join('')}</div>
 <div class="show-info">${ico('info')} Trends are fictional comparisons. Real forecasts need representative historical coverage and validation.</div></section></div>
 <section class="show-card show-bottom-card">${panelHead('What institutions can do next','Bring these signals into curriculum and employer discussions')}
 <div class="show-mini-grid">${table.slice(0,4).map(r=>`<div><span>${h(r.sector)}</span><h4>${h(r.title)}</h4><p>Review ${h(r.skills.slice(0,2).join(' and '))} alongside ${h(r.programme)} programme outcomes.</p>${action('Explore institutions','nav','data-id="institutions"','text')}</div>`).join('')}</div></section>`;
}
function institutions(){
 const set=INSTITUTES.filter(x=>x.area===S.area),shown=set.filter(x=>x.type===S.institutionType),picked=shown.find(x=>x.id===S.selected)||shown[0];
 return `${common('Institution intelligence','Explore course offerings and planned cohorts alongside local employer and skill signals.')}
 <div class="show-filterchips show-typechips">${['ITI','Polytechnic','College'].map(x=>`<button data-do="institutetype" data-id="${x}" class="${x===S.institutionType?'active':''}">${h(x)}</button>`).join('')}</div>
 ${kpis([tile('Institutions',set.length,'Mapped organisations','school'),tile('Selected category',shown.length,'Institutes of this type','building_2'),tile('Indicative cohort capacity',num(shown.reduce((n,x)=>n+x.seats,0)),'Completion year 2027','users'),tile('Programmes in system',new Set(set.flatMap(x=>x.programmes)).size,'Distinct course names','book_open')])}
 <div class="show-two-col"><section class="show-card">${panelHead('Institutions nearby','Select an institution to inspect its offerings')}
 <div class="show-institute-list">${shown.map(x=>`<button data-do="select" data-id="${x.id}" class="${picked?.id===x.id?'selected':''}"><b>${ico('school')}</b><span><strong>${h(x.name)}</strong><small>${h(x.type)} · ${num(x.seats)} cohort places</small></span>${ico('chevron_right')}</button>`).join('')||'<p class="show-empty">No institutions listed for this category.</p>'}</div></section>
 <section class="show-card">${panelHead('Institute snapshot','Programme relevance and indicative readiness')}
 ${picked?`<div class="show-inst-detail"><h3>${h(picked.name)}</h3><p>${h(picked.type)} · ${h(LOCATION_LABEL[picked.area])}</p><div class="show-inst-stats"><div><strong>${picked.seats}</strong><small>Planned seats</small></div><div><strong>${picked.completion}</strong><small>Completion</small></div><div><strong>${picked.readiness}%</strong><small>Readiness</small></div></div><h4>Programmes offered</h4><div class="show-tags">${picked.programmes.map(p=>`<span>${h(p)}</span>`).join('')}</div>
 <div class="show-info">${ico('lightbulb')} Investigate industry skills alongside this programme catalogue before planning interventions.</div>
 ${action('Explore demand','nav','data-id="trends"','primary')}</div>`:'<p class="show-empty">Select an institution type.</p>'}</section></div>`;
}
function industry(){
 const r=f(S.role),needed=roles().filter(x=>x.roleId===r.id),options=INSTITUTES.filter(x=>x.area===S.area)
   .map(i=>({i,score:Math.min(94,52+(i.programmes.some(p=>p.toLowerCase().includes(r.programme.toLowerCase()))?30:0)+(i.type==='ITI'?8:4))})).sort((a,b)=>b.score-a.score);
 return `${common('Industry and talent','Find programmes aligned to role skills, identify suitable institutes and prepare a hiring request.')}
 ${kpis([tile('Employers tracked',stats().companies,'Regional network','factory'),tile('Confirmed role records',confirmed().length,'Directly checked examples','badge_check'),tile('Training institutions',options.length,'Potential partners','school'),tile('Draft requirements',S.drafts.length,'Saved locally in demo','clipboard_list')])}
 <div class="show-two-col"><section class="show-card">${panelHead('Define the skills you need','Choose a role family to compare typical qualifications')}
 <label class="show-field">Role family<select id="showRole">${ROLE_FAMILIES.map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${h(x.role)}</option>`).join('')}</select></label>
 <div class="show-role-detail"><h3>${h(r.role)}</h3><p>Typical education: ${h(r.qualification)} · Indicative pay: ${rupees(r.salary)}</p><h4>Skills requested</h4><div class="show-tags">${r.skills.map(x=>`<span>${h(x)}</span>`).join('')}</div><div class="show-info">${ico('info')} ${needed.length} observed job examples in this role family. Programme overlap does not confirm available candidates.</div></div></section>
 <section class="show-card">${panelHead('Relevant training partners','Indicative programme and course fit')}
 <div class="show-partners">${options.slice(0,5).map(({i,score})=>`<button data-do="institute" data-id="${i.id}"><b>${ico('school')}</b><span><strong>${h(i.name)}</strong><small>${h(i.type)} · ${h(i.programmes.slice(0,2).join(', '))}</small></span><em>${score}%</em></button>`).join('')}</div></section></div>
 <section class="show-card show-bottom-card">${panelHead('Create a hiring requirement','Illustrative employer workflow — the request remains on this device')}
 <form id="showHiringForm" class="show-hiring-form"><label class="show-field">Hiring for<select name="role">${ROLE_FAMILIES.map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${h(x.role)}</option>`).join('')}</select></label><label class="show-field">Openings<input type="number" name="count" value="12" min="1" max="500" required/></label><label class="show-field">When needed<select name="window"><option>In 1 month</option><option>In 3 months</option><option>In 6 months</option></select></label><button type="submit" class="show-button primary">${ico('plus_circle')}Save requirement</button></form>
 <div class="show-drafts">${S.drafts.length?S.drafts.map((x,i)=>`<div><strong>${h(f(x.role).role)}</strong><span>${x.count} openings · ${h(x.window)}</span><button data-do="remove-draft" data-id="${i}">Remove</button></div>`).join(''):'<p>No draft requirements yet.</p>'}</div></section>`;
}
function learners(){
 const related=ROLE_FAMILIES.filter(x=>x.programme===S.programme||['Electrical','Electronics','Fitter'].some(y=>S.programme.includes(y)&&x.qualification.includes('ITI'))).slice(0,5);
 const list=related.length?related:ROLE_FAMILIES.slice(0,4),skills=ROLE_FAMILIES.find(x=>x.programme===S.programme)?.skills.slice(0,2)||['Excel','Communication'];
 const gaps=[...new Set(list.flatMap(x=>x.skills).filter(x=>!skills.includes(x)))];
 return `${common('My career explorer','Understand possible next roles, missing skills and nearby opportunities in a few simple steps.')}
 <section class="show-learner-hero"><div><small>YOUR NEXT STEP</small><h2>What could you do with your skills?</h2><p>Choose a programme to discover related roles. We explain which skills connect your learning to possible work.</p>
 <label class="show-field">My course<select id="showProgramme">${['Electrician','Electronics Mechanic','Fitter','COPA','BCA','Front Office Assistant'].map(x=>`<option ${x===S.programme?'selected':''}>${h(x)}</option>`).join('')}</select></label></div>
 <div class="show-career-route">${ico('graduation_cap')}<span>Studying <strong>${h(S.programme)}</strong></span>${ico('arrow_right')}<span>Explore <strong>${h(list[0].title)}</strong></span></div></section>
 ${kpis([tile('Relevant role families',list.length,'Based on the selected course','route'),tile('Related role observations',roles().filter(x=>list.some(y=>y.id===x.roleId)).length,'Source-linked role evidence','briefcase_business'),tile('Typical programme skills',skills.length,'Not an assessed capability','badge_check'),tile('Skills to explore',gaps.length,'Possible development areas','lightbulb')])}
 <div class="show-two-col"><section class="show-card">${panelHead('Roles that could fit you','Explore different types of work and what each requires')}
 <div class="show-learner-list">${list.map(r=>`<article><div><span>${h(r.sector)}</span><h4>${h(r.role)}</h4><small>Typical pay ${rupees(r.salary)} · ${h(r.qualification)}</small></div><details><summary>Why this role?</summary><p>${h(r.skills.slice(0,3).join(', '))} are relevant skills to investigate. Actual eligibility is employer-specific.</p></details>${action('Explore role','role',`data-id="${r.id}"`,'text')}</article>`).join('')}</div></section>
 <section class="show-card">${panelHead('Your skills pathway','From existing programme skills to possible next capabilities')}
 <div class="show-learner-skills"><h4>What your course could cover</h4><div class="show-tags">${skills.map(x=>`<span>${h(x)}</span>`).join('')}</div><h4>What could help you grow</h4><div class="show-tags accent">${gaps.slice(0,7).map(x=>`<span>${h(x)}</span>`).join('')}</div></div>
 <div class="show-info">${ico('school')} A real learning plan would also use your own experience, assessed evidence and chosen goals. These are typical programme assumptions.</div>
 ${action('See nearby training institutions','nav','data-id="institutions"','primary')}</section></div>`;
}
function sources(){
 const groups=['all','Government','Job portals','Social & media','Direct'],items=SOURCE_REGISTRY.filter(x=>S.sourceGroup==='all'||x.group===S.sourceGroup);
 return `${common('Data integrations','Connected information sources, refresh health and provenance in one place.')}
 ${kpis([tile('Active connectors',SOURCE_REGISTRY.length,'Demonstration adapters','plug_zap'),tile('Records processed',num(SOURCE_REGISTRY.reduce((n,x)=>n+x.records,0)+S.sync*SOURCE_REGISTRY.length),'Illustrative feed payloads','database'),tile('Source availability','99.8%','Illustrative reliability','activity'),tile('Processing failures','0','No demo feed errors','check_circle')])}
 <div class="show-filterbar"><div class="show-filterchips">${groups.map(g=>`<button data-do="sourcegroup" data-id="${g}" class="${S.sourceGroup===g?'active':''}">${h(g==='all'?'All connectors':g)}</button>`).join('')}</div>${action('Sync now','sync','','primary','refresh_cw')}</div>
 <div class="show-source-grid">${items.map(x=>`<article class="show-source"><div class="show-source-status"><span class="show-source-icon">${ico(x.group==='Government'?'landmark':x.group==='Job portals'?'briefcase_business':x.group==='Direct'?'badge_check':'message_circle')}</span><span>${ico('check_circle')} Healthy</span></div><h3>${h(x.name)}</h3><p>${h(x.type)}</p>
 <dl><div><dt>Records</dt><dd>${num(x.records+S.sync)}</dd></div><div><dt>Last sync</dt><dd>${S.sync?'Just now':x.latency+' min ago'}</dd></div><div><dt>Cadence</dt><dd>${h(x.cadence)}</dd></div><div><dt>Coverage</dt><dd>${h(x.coverage)}</dd></div></dl>
 <button data-do="source" data-id="${x.id}">Connection details ${ico('arrow_up_right')}</button></article>`).join('')}</div>`;
}
function operations(){
 const records=canonical(),review=records.filter(x=>x.confidence<65||['social_signal','project_announcement'].includes(x.kind)).slice(0,6);
 return `${common('Research operations','From raw signals to verified evidence, with traceability and transparent confidence.')}
 ${kpis([tile('Incoming observations',allRecords().length,'Raw source items','inbox'),tile('Duplicates grouped',allRecords().length-records.length,'Portal mirrors handled','layers'),tile('Employer checks pending',roles().filter(x=>!x.employerVerified).length,'Observed advertisements','phone'),tile('Low-confidence signals',records.filter(x=>x.confidence<65).length,'Review opportunities','shield_alert')])}
 <div class="show-two-col"><section class="show-card">${panelHead('Quality review queue','Source checks and corroboration to prioritise')}${evidenceRows(review)}</section>
 <section class="show-card">${panelHead('Evidence processing','An auditable path from signal to insight')}
 <div class="show-process">${[['Collect','Gather permitted and documented sources'],['Normalise','Standardise role, skill and location names'],['Cross-check','Deduplicate and trace corroborating evidence'],['Confirm','Contact employer and obtain separate approval'],['Publish','Share clear claims with limits and provenance']].map(([name,desc],i)=>`<div><b>${i+1}</b><section><strong>${name}</strong><p>${desc}</p></section></div>`).join('')}</div></section></div>`;
}
export function pageMarkup(page){return ({overview,opportunities,trends,institutions,industry,learners,sources,operations})[page]?.()||overview();}
