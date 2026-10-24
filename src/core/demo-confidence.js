// @ts-check
// Illustrative confidence explainer for FUTURE-STATE SIMULATION ONLY.
// Do not feed these numbers to production verification/KPIs or employment eligibility.
/** @type {ReadonlyArray<readonly [string, number, string]>} */
export const FACTORS = Object.freeze([
  ['provenance',25,'Source and provenance'],
  ['directness',25,'Claim directness'],
  ['corroboration',15,'Independent corroboration'],
  ['location',15,'Location precision'],
  ['freshness',10,'Freshness'],
  ['completeness',10,'Field completeness'],
]);
/** @param {Record<string,any>} signal */
export function demoConfidence(signal) {
  let score=0;
  const components=FACTORS.map(([key,max,label])=>{
    const value=Math.max(0,Math.min(max,Number(signal.factors?.[key]||0)));
    score+=value;
    return {key,label,max,value};
  });
  const limits=[];
  const cap=(limit,reason)=>{if(score>limit){score=limit;limits.push(reason)}};
  if(signal.sourceKind==='social_unconfirmed')cap(54,'Unconfirmed social-only claim');
  if(signal.kind==='project_announcement'&&!signal.hiringPlanConfirmed)cap(68,'Announcement is not a hiring plan');
  if(signal.status==='stale')cap(49,'Source needs recapture');
  if(signal.geoPrecision==='region_only')cap(69,'Location is only region-level');
  if(signal.kind==='trend'&&Number(signal.sampleSize||0)<10)cap(54,'Sample too small for a trend');
  const band=score>=85?'Very high':score>=70?'High':score>=50?'Medium':score>=30?'Low':'Needs review';
  return {score,band,components,limits,meaning:'Illustrative confidence in this particular claim, not job verification, hiring eligibility or probability of employment.'};
}
export function demoSignalCounts(signals,area='noida',confidence='all') {
  const filtered=signals.filter(s=>s.area===area&&(confidence==='all'||demoConfidence(s).band===confidence));
  return {items:filtered,observations:filtered.length,
    groups:new Set(filtered.map(s=>s.cluster)).size,
    adverts:filtered.filter(s=>s.kind==='job_ad').length,
    simulatedVerified:filtered.filter(s=>s.mockVerification==='approved').reduce((n,s)=>n+Number(s.illustrativeOpenings||0),0)};
}
