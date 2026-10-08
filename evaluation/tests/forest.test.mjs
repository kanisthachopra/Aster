import {test} from 'node:test';import assert from 'node:assert/strict';import {fitForest,forestScores} from '../forest.mjs';
test('nonlinear candidate learns a held-out interaction rather than using input labels at prediction time',()=>{
 const rows=[];for(let i=0;i<20;i++)for(const [x,y,label] of [[.1,.1,0],[.8,.8,0],[.1,.8,1],[.8,.1,1],[1.5,.1,2],[1.5,.8,2]])rows.push({x:[x+i*.004,y+i*.003],y:label});
 const model=fitForest(rows,{trees:48,maxDepth:5,minLeaf:4,featureCount:2});
 assert.deepEqual(model,fitForest(rows,{trees:48,maxDepth:5,minLeaf:4,featureCount:2}));
 for(const [x,y,expected] of [[.13,.14,0],[.84,.83,0],[.14,.83,1],[.83,.13,1],[1.54,.14,2],[1.53,.84,2]]){
   const scores=forestScores([x,y],model);assert.equal(scores.indexOf(Math.max(...scores)),expected);assert.ok(Math.abs(scores.reduce((a,b)=>a+b,0)-1)<1e-9);
 }
});
