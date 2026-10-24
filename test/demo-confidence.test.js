import {test} from 'node:test';
import assert from 'node:assert/strict';
import { demoConfidence, demoSignalCounts, FACTORS } from '../src/core/demo-confidence.js';

const maxFactors={provenance:25,directness:25,corroboration:15,location:15,freshness:10,completeness:10};
const example=(extra={})=>({kind:'job_ad',sourceKind:'portal',geoPrecision:'sector_only',status:'active',
 factors:maxFactors,...extra});
test('demo score has explicit components but never changes verification status',()=>{
 const s=example({mockVerification:'observed'});
 const c=demoConfidence(s);
 assert.equal(c.score,100);
 assert.equal(c.band,'Very high');
 assert.equal(c.components.length,FACTORS.length);
 assert.equal(s.mockVerification,'observed');
 assert.match(c.meaning,/not job verification/);
});
test('social-only, project, region and stale claims are conservatively capped',()=>{
 assert.equal(demoConfidence(example({sourceKind:'social_unconfirmed'})).score,54);
 assert.equal(demoConfidence(example({kind:'project_announcement',hiringPlanConfirmed:false})).score,68);
 assert.equal(demoConfidence(example({geoPrecision:'region_only'})).score,69);
 assert.equal(demoConfidence(example({status:'stale'})).score,49);
 assert.equal(demoConfidence(example({kind:'trend',sampleSize:6})).score,54);
});
test('incomplete factors never make confidence negative or exceed 100',()=>{
 const low=demoConfidence(example({factors:{provenance:-999,freshness:9999}}));
 assert.equal(low.score,10);
 assert.equal(low.band,'Needs review');
});
test('demo sample counts distinct observations and dedupe clusters separately',()=>{
 const signals=[
 {area:'noida',cluster:'a',kind:'job_ad',factors:maxFactors},
 {area:'noida',cluster:'a',kind:'job_ad',factors:maxFactors},
 {area:'noida',cluster:'b',kind:'employer_confirmation',mockVerification:'approved',illustrativeOpenings:4,factors:maxFactors},
 {area:'kalyani',cluster:'c',kind:'job_ad',factors:maxFactors},
 ];
 const q=demoSignalCounts(signals,'noida');
 assert.equal(q.observations,3);assert.equal(q.groups,2);assert.equal(q.simulatedVerified,4);
 assert.equal(demoSignalCounts(signals,'kalyani').observations,1);
});
