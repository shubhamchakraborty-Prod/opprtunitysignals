// A guided, finite leadership walkthrough on top of the existing simulated intelligence screen.
// No backend writes, external feeds, timers or automated navigation.
import { app } from '../app.js';
import { esc, icon } from '../ui.js';

const STORIES=[
  {id:'promise',eyebrow:'01 / The opportunity',title:'From scattered information to a usable decision',body:'A learner, an institution and an employer should not need to search ten separate sites. Opportunity Explorer brings permitted information together and makes its limits understandable.',target:'vision-promise'},
  {id:'sources',eyebrow:'02 / Information sources',title:'Imagine approved data sources working together',body:'Government statistics, licensed job listings, permitted company and social signals, employer verification and institution records each contribute a different kind of evidence. None of the demo connectors is actually connected.',target:'vision-sources'},
  {id:'signals',eyebrow:'03 / One intelligence layer',title:'Collect, standardise and avoid double-counting',body:'Different sources may describe the same advertisement. The platform groups mirrors into one observed cluster and separates ads, announcements, institute supply and directly confirmed openings.',target:'vision-signals'},
  {id:'trust',eyebrow:'04 / Trust and confidence',title:'Explain why one claim is more reliable than another',body:'Source provenance, corroboration, freshness and location certainty are shown openly. Confidence is not a vacancy verification or a prediction of employment.',target:'vision-evidence'},
  {id:'map',eyebrow:'05 / Geographic insight',title:'Turn intelligence into an explorable geographic story',body:'Map pins show what kind of signal appeared and where it might relate. These demo pins use an illustrative map; a production map must use licensed geometry and verified location precision.',target:'vision-map'},
  {id:'audience',eyebrow:'06 / Four user journeys',title:'The same evidence, four useful experiences',body:'Learners explore potential roles and skills; institutions examine curriculum and employer linkages; employers explore training supply; research teams verify quality and provenance.',target:'vision-people'},
  {id:'outcome',eyebrow:'07 / What changes',title:'From collecting signals to taking accountable action',body:'The end state is better decisions and traceable next steps, not more dashboards or ungrounded placement promises. The mock illustrates that ambition; real operation needs approved integrations and institutional participation.',target:'vision-pipeline'},
];
let step=0;
const stepBtn=(n,label,ic,kind='outlined')=>`<button type="button" class="btn ${kind} small" data-action="vision-step" data-step="${n}">${icon(ic)}${esc(label)}</button>`;
export function visionTourHtml(){
  const s=STORIES[step];
  return `<section class="vision-tour" aria-label="Guided leadership presentation" id="vision-tour">
    <div class="vision-tour-top">
      <div><span class="vision-tour-kicker">${icon('slideshow')} PRESENTER GUIDE · 7 CHAPTERS · SIMULATED</span>
      <h2>Walk through the complete product vision</h2>
      <p>This is one unified demonstration of the planned experience. Start here, move through the story, or explore independently below.</p></div>
      <span class="vision-tour-count" aria-label="Chapter ${step+1} of ${STORIES.length}">${step+1} / ${STORIES.length}</span>
    </div>
    <div class="vision-tour-track" role="group" aria-label="Presentation chapters">${STORIES.map((x,i)=>`<button type="button" class="${step===i?'active':''}" data-action="vision-step" data-step="${i}" aria-pressed="${step===i}"><span>${i+1}</span><small>${esc(x.eyebrow.split(' / ')[1])}</small></button>`).join('')}</div>
    <div class="vision-tour-current" aria-live="polite">
      <div><span>${esc(s.eyebrow)}</span><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>
      <div class="vision-tour-buttons">
        ${step>0?stepBtn(step-1,'Previous','arrow_back'):'<span class="vision-tour-hint">Seven short chapters; no auto-advance.</span>'}
        ${step<STORIES.length-1?stepBtn(step+1,step===0?'Start the tour':'Next chapter','arrow_forward','primary'):stepBtn(0,'Restart tour','replay','primary')}
      </div>
    </div>
    <div class="vision-tour-disclaimer"><strong>Presentation mode</strong> · All connected-source statuses, map pins, events and counts are illustrative. Other application sections contain a separate Noida research sample; the two datasets are never combined.</div>
  </section>`;
}
app.actions['vision-step']=(el)=>{
  const n=Number(el.dataset.step);
  if(!Number.isInteger(n)||n<0||n>=STORIES.length)return;
  step=n;
  // Set a grounded example in the confidence/map/audience chapters before scrolling.
  if(n===2) app.actions['fd-select']?.({dataset:{id:'DM-001'}});
  else if(n===3) app.actions['fd-select']?.({dataset:{id:'DM-006'}});
  else if(n===4) app.actions['fd-select']?.({dataset:{id:'DM-002'}});
  else if(n===5) app.actions['fd-persona']?.({dataset:{persona:'learner'}});
  else app.views.idemo?.();
  requestAnimationFrame(()=>{
    const target=document.getElementById(STORIES[n].target);
    target?.scrollIntoView({block:'start',behavior:'auto'});
  });
};
