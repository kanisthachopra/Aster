import {test} from 'node:test';import assert from 'node:assert/strict';
import * as baseline from '../versions/baseline/measurements.ts';
import * as revised from '../versions/revised3/measurements.ts';
function geometry(hanging=false){return Array.from({length:33},(_,i)=>{
 const d=(1-Math.cos(i*Math.PI/8))/2,p=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
 const joints=hanging?[[11,.4,.3-.12*d],[13,.5,.23-.06*d],[15,.4,.06],[23,.4,.55-.12*d],[25,.5+.06*d,.7-.18*d],[27,.4,.88-.25*d]]:[[11,.4-.1*d,.17+.28*d],[13,.45-.1*d,.1+.28*d],[15,.4-.1*d,.06+.28*d],[23,.4-.1*d,.4+.28*d],[25,.4+.15*d,.65+.05*d],[27,.4,.9]];
 for(const [id,x,y]of joints)for(const offset of [0,1])p[id+offset]={x:x+offset*.02,y,z:0,visibility:1};
 return{timestamp:i*.25,landmarks:p,metrics:null};
});}
const review=(core,frames)=>core.summarize(frames.map(f=>({...f,metrics:core.measure(f.landmarks,'squat',640,480)})),'squat',8.25,640,480);
test('independent synthetic overhead-arm squats use grounded motion instead of rejecting raised hands',()=>{
 const frames=geometry();assert.notEqual(review(baseline,frames).status,'usable');const report=review(revised,frames);assert.equal(report.status,'usable');assert.ok(report.estimatedRepetitions>=1);
});
test('independent synthetic hanging knee tucks do not become squat completion',()=>{
 const report=review(revised,geometry(true));assert.equal(report.status,'partial');assert.equal(report.estimatedRepetitions,0);
 assert.ok(report.captureNotes.some(note=>note.includes('selected exercise')));
 assert.equal(report.findings.some(f=>['range','return'].includes(f.id)),false);
});
