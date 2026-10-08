import {test} from 'node:test';import assert from 'node:assert/strict';
import {completeCountIntervals,intervalCountPredictions,countMetrics} from '../counting.mjs';
test('Countix labels outside actual decoded duration are not treated as full-clip counts',()=>{
 const r={countixIntervals:[{start:1,end:4,count:2},{start:2,end:10,count:6},{start:-1,end:2,count:1},{start:3,end:2,count:1}]};
 assert.deepEqual(completeCountIntervals(r,5),[r.countixIntervals[0]]);
});
test('counting evaluates only exact annotated time windows and reports counting rather than form metrics',()=>{
 const record={exercise:'squat',countixIntervals:[{start:1,end:2,count:2}]},data={duration:4,width:320,height:240,frames:[0,.5,1,1.5,2,2.5].map(timestamp=>({timestamp,landmarks:[]}))};
 let observed=[];const results=intervalCountPredictions(record,data,{measure:()=>null,summarize:f=>{observed=f.map(x=>x.timestamp);return {estimatedRepetitions:1,status:'usable'};}});
 assert.deepEqual(observed,[1,1.5,2]);const metrics=countMetrics([{id:'synthetic',label:{exercise:'squat'},countIntervals:results}]);assert.equal(metrics.mae,1);assert.equal(metrics.intervals,1);assert.equal(metrics.exactAccuracy,0);assert.equal(metrics.perClass.pushup.mae,null);
});
