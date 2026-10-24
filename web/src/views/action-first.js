// Shared action-first landing block for the three real user experiences.
// Uses existing verified source context; no recommendation profiling or tracking.
import { app } from '../app.js';
import { esc, icon } from '../ui.js';

// State is ephemeral by design: saved examples are not claimed to sync across devices.
const saved=new Set(), hidden=new Set(), opened=new Set();
const scopeKey=(scope,id)=>scope+':'+id;
const safeScope=(scope)=>['learner','institution','industry'].includes(scope)?scope:'learner';

/**
 * @param {{scope:string,title:string,lead:string,context:string,items:{id:string,tag:string,title:string,summary:string,reason:string,action:string,tab:string,icon?:string}[]}} args
 */
export function actionFirst(args){
 const scope=safeScope(args.scope);
 const unique=args.items.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).slice(0,3);
 const shown=unique.filter(x=>!hidden.has(scopeKey(scope,x.id)));
 const n=shown.filter(x=>opened.has(scopeKey(scope,x.id))).length;
 return `<section class="af-home" aria-label="${esc(args.title)}" data-journey-scope="${scope}">
   <div class="af-header">
     <div><div class="eyebrow">Start here · ${esc(scope)}</div><h2>${esc(args.title)}</h2>
       <p>${esc(args.lead)}</p></div>
     <span class="af-progress"><strong>${n}/${shown.length}</strong><small>next steps explored</small></span>
   </div>
   <div class="af-context" role="note">${icon('info')}${esc(args.context)}</div>
   ${shown.length?`<div class="af-grid">${shown.map(x=>{
     const k=scopeKey(scope,x.id),didSave=saved.has(k),didOpen=opened.has(k);
     return `<article class="af-step">
       <span class="af-tag">${esc(x.tag)}</span>
       <h3>${esc(x.title)}</h3>
       <p class="af-summary">${esc(x.summary)}</p>
       <details class="af-why"><summary>Why this is shown</summary><p>${esc(x.reason)}</p></details>
       <div class="af-buttons">
         <button type="button" class="btn primary small" data-action="af-open" data-scope="${scope}" data-id="${esc(x.id)}" data-tab="${esc(x.tab)}">${icon(x.icon||'arrow_forward')}${esc(x.action)}</button>
         <button type="button" class="btn outlined small" data-action="af-save" data-scope="${scope}" data-id="${esc(x.id)}" aria-pressed="${didSave}">${icon(didSave?'bookmark':'bookmark_border')}${didSave?'Saved':'Save'}</button>
       </div>
       <button class="af-hide" type="button" data-action="af-hide" data-scope="${scope}" data-id="${esc(x.id)}">Not relevant</button>
       ${didOpen?'<span class="af-seen">Step opened</span>':''}
     </article>`;
   }).join('')}</div>`:'<p class="af-empty">No more recommendations in this short list. You can restore the hidden items.</p>'}
   <div class="af-bottom"><p>Explore only what is useful. Saving these steps lasts for this visit; opening a page does not mean a job application or employer contact was completed.</p>
     ${unique.some(x=>hidden.has(scopeKey(scope,x.id)))?`<button class="linkbtn" data-action="af-restore" data-scope="${scope}">Restore hidden steps</button>`:''}
   </div>
 </section>`;
}
const redraw=(scope)=>{
 const tab={learner:'lhome',institution:'ihome',industry:'talent'}[scope];
 if(app.state.tab===tab) app.views[tab]?.();
};
const valid=(el)=>{const scope=safeScope(el.dataset.scope),id=el.dataset.id;
  if(!id||id.length>120)return null;
  return {scope,id,key:scopeKey(scope,id)};
};
app.actions['af-open']=(el)=>{
 const v=valid(el);if(!v)return;
 const pages={learner:['discover','learn','path','lprofile','upcoming'],institution:['idemand','ioutreach','trades'],industry:['hire','isupply','partner']};
 const tab=el.dataset.tab;
 if(!pages[v.scope].includes(tab))return;
 opened.add(v.key);
 app.actions.tab({dataset:{tab}});
};
app.actions['af-save']=(el)=>{
 const v=valid(el);if(!v)return;
 if(saved.has(v.key))saved.delete(v.key);else saved.add(v.key);
 redraw(v.scope);
};
app.actions['af-hide']=(el)=>{
 const v=valid(el);if(!v)return;
 hidden.add(v.key);redraw(v.scope);
};
app.actions['af-restore']=(el)=>{
 const scope=safeScope(el.dataset.scope);
 for(const k of [...hidden])if(k.startsWith(scope+':'))hidden.delete(k);
 redraw(scope);
};
