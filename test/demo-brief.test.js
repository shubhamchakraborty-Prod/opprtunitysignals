import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoBrief,DEMO_PEOPLE} from '../src/core/demo-brief.js';

const ads=[
 {id:'a',kind:'job_ad',cluster:'same',title:'QC engineer'},
 {id:'b',kind:'job_ad',cluster:'same',title:'Mirror of QC engineer'},
 {id:'c',kind:'employer_confirmation',cluster:'verified',title:'Confirmed illustrative example'},
 {id:'d',kind:'training_supply',cluster:'institute',title:'Training provider'},
 {id:'e',kind:'social_signal',cluster:'social',title:'Unconfirmed social mention'},
 {id:'f',kind:'project_announcement',cluster:'project',title:'Industrial project'},
];
test('finite learner briefing ranks relevant actions without showing portal mirrors twice',()=>{
 const x=demoBrief(ads,'learner');
 assert.equal(x.length,3);
 assert.equal(x[0].id,'c');
 assert.deepEqual(x.map(a=>a.id),['c','a','d']);
 assert.ok(x.every(item=>/because you chose/.test(item.because)));
 assert.match(x[1].next,/not a verified opening/);
});
test('briefings change with explicit persona, not hidden profiles',()=>{
 assert.deepEqual(demoBrief(ads,'industry').map(x=>x.id),['d','c','a']);
 assert.deepEqual(demoBrief(ads,'research').map(x=>x.id),['e','a','f']);
 assert.deepEqual(demoBrief(ads,'institution').map(x=>x.id),['c','a','d']);
 assert.equal(DEMO_PEOPLE.length,4);
});
test('briefings have intentional finite limits and safe unknown persona fallback',()=>{
 assert.equal(demoBrief(ads,'learner',1).length,1);
 assert.equal(demoBrief(ads,'learner',0).length,0);
 assert.ok(demoBrief(ads,'unknown',999).length<=5);
});
