// Short, finite, explainable role briefings; session-only controls.
import { app } from '../app.js';
import { esc, icon } from '../ui.js';
import { DEMO_PEOPLE, demoBrief } from '../../../src/core/demo-brief.js';

const saved=new Set(), hidden=new Set(), read=new Set();
let currentPersona='learner',notice='';
const key=(id,p)=>p+':'+id;
export function demoBriefHtml(signals,persona,confidence) {
  currentPersona=DEMO_PEOPLE.some(([id])=>id===persona)?persona:'learner';
  const items=demoBrief(signals,currentPersona,10).filter(item=>!hidden.has(key(item.id,currentPersona)));
  const top=items.slice(0,3),seen=top.filter(item=>read.has(key(item.id,currentPersona))).length;
  return `<section class="engage-brief" aria-labelledby="engageTitle">
    <div class="engage-head">
      <div><span class="engage-eyebrow">${icon('auto_awesome')} Purposeful, personal, demo-only</span>
      <h2 id="engageTitle">What matters to you today?</h2>
      <p>Three relevant examples. One useful next step each. No endless scrolling or fake alerts.</p></div>
      <div class="engage-counter"><strong>${seen} / ${top.length}</strong><span>examples explored</span></div>
    </div>
    <div class="engage-roles" role="group" aria-label="Choose a role for your briefing">
      ${DEMO_PEOPLE.map(([id,label])=>`<button type="button" data-action="fd-persona" data-persona="${id}" class="${id===currentPersona?'active':''}" aria-pressed="${id===currentPersona}">${esc(label)}</button>`).join('')}
    </div>
    ${notice?`<p class="engage-message" role="status">${esc(notice)}</p>`:''}
    ${top.length?`<div class="engage-items">${top.map(item=>{
      const s=item.signal,c=confidence(s),isSaved=saved.has(key(item.id,currentPersona)),isRead=read.has(key(item.id,currentPersona));
      return `<article class="engage-item">
        <div class="engage-item-meta"><span>${esc(s.kind.replaceAll('_',' '))} · SIMULATION</span><span>${esc(c.band)} confidence</span></div>
        <h3>${esc(item.headline)}</h3><p class="engage-topic">${esc(s.title)}</p>
        <p class="engage-next">${esc(item.next)}</p>
        <details><summary>Why am I seeing this?</summary><p>${esc(item.because)} No personal profiling or real hiring data is used.</p></details>
        <div class="engage-actions"><button class="btn primary small" data-action="fd-brief-open" data-id="${esc(item.id)}">${icon('visibility')}${isRead?'Revisit evidence':'Check evidence'}</button>
         <button class="btn outlined small" data-action="fd-brief-save" data-id="${esc(item.id)}" aria-pressed="${isSaved}">${icon(isSaved?'bookmark':'bookmark_border')}${isSaved?'Saved':'Save'}</button>
         <button class="engage-less" data-action="fd-brief-hide" data-id="${esc(item.id)}" aria-label="Hide ${esc(s.title)} from this session">Not relevant</button></div>
      </article>`;
    }).join('')}</div>`:`<div class="engage-finished"><strong>You are all caught up with these examples.</strong><p>Restore hidden items or try another region. There is no need to keep scrolling.</p></div>`}
    <div class="engage-footer"><p>${top.length&&top.length===seen?'You have finished this set. You can stop here.':'Your choices affect this session only, not your real recommendations.'}</p>
      ${[...hidden].some(k=>k.startsWith(currentPersona+':'))?'<button class="linkbtn" data-action="fd-brief-restore">Restore hidden examples</button>':''}
      ${saved.size?`<span>${icon('bookmark')} ${saved.size} saved this visit</span>`:''}</div>
    </section>`;
}
app.actions['fd-brief-open']=(el)=>{
  read.add(key(el.dataset.id,currentPersona));notice='Evidence opened. This is not a live job.';
  app.actions['fd-select']?.({dataset:{id:el.dataset.id}});
  document.querySelector('.fd-evidence-panel')?.scrollIntoView({block:'start'});
};
app.actions['fd-brief-save']=(el)=>{
  const k=key(el.dataset.id,currentPersona);
  if(saved.has(k)){saved.delete(k);notice='Removed from saved examples.';}
  else{saved.add(k);notice='Saved for this visit; no alert or account was created.';}
  app.views.idemo?.();
};
app.actions['fd-brief-hide']=(el)=>{
  hidden.add(key(el.dataset.id,currentPersona));notice='Hidden for this visit. Use Restore to undo.';
  app.views.idemo?.();
};
app.actions['fd-brief-restore']=()=>{
  for(const k of [...hidden])if(k.startsWith(currentPersona+':'))hidden.delete(k);
  notice='The hidden examples are visible again.';app.views.idemo?.();
};
