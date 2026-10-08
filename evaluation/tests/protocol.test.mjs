import{test}from'node:test';import assert from'node:assert/strict';
import{assignSplits,validateRecords,sha}from'../lib.mjs';import{aggregate,wilson,calibrate,predict}from'../metrics.mjs';
const classes=['pullup','pushup','squat'];
const record=(id,exercise,group=id)=>({id,exercise,sourceDataset:'independent-fixture',sourceGroup:group,sourceUrl:'https://example.test/'+id,license:'Synthetic metadata fixture only',relativePath:'evaluation/data/'+id+'.mp4',sha256:sha(id),duration:10,width:320,height:240,label:{exercise,form:null}});
test('deterministic grouped splits never leak a source across train/validation/test',()=>{
  const records=Array.from({length:90},(_,i)=>record('id'+i,classes[i%3],'source'+Math.floor(i/2)));
  const split=assignSplits(records);assert.deepEqual(split,assignSplits([...records].reverse()).reverse());
  const groups=new Map();for(const r of split){assert.ok(!groups.has(r.sourceGroup)||groups.get(r.sourceGroup)===r.split);groups.set(r.sourceGroup,r.split);}
  assert.equal(validateRecords(split).valid,true);assert.deepEqual(new Set(split.map(r=>r.split)),new Set(['train','validation','test']));
});
test('source leakage, duplicates, private media paths and unlabeled form claims fail validation',()=>{
  const a=record('a','pushup','same'),b=record('b','pushup','same');a.split='train';b.split='test';assert.equal(validateRecords([a,b]).valid,false);
  b.split='train';b.sha256=a.sha256;assert.equal(validateRecords([a,b]).valid,false);
  a.relativePath='frontend/artifacts/private-evaluation/clip1.mp4';assert.equal(validateRecords([a]).valid,false);
  a.relativePath='evaluation/data/a.mp4';a.label.form='good';assert.equal(validateRecords([a]).valid,false);
  a.label.formProtocol='rubric';assert.equal(validateRecords([a]).valid,false);
  a.label.annotationSource='Independent expert labels';assert.equal(validateRecords([a]).valid,true);
  a.label.form=false;assert.equal(validateRecords([a]).valid,false);
});
test('pilot source groups are development-only',()=>{const a=record('a','squat','pilot'),b=record('b','squat','pilot');a.developmentOnly=true;assert.ok(assignSplits([a,b]).every(r=>r.split==='train'));});
const features=(correct=true)=>({status:correct?'usable':'partial',cycles:correct?3:0,poseCoverage:1,measurementCoverage:1,compatibleFraction:correct?1:0,incompatibleFraction:correct?0:1,range:60});
test('activity metrics never become good/bad form accuracy or repetition accuracy without labels',()=>{
  const rows=classes.map((exercise,i)=>({id:'x'+i,label:{exercise,form:null},predictions:Object.fromEntries(classes.map(c=>[c,features(c===exercise)]))}));
  const result=aggregate(rows,{threshold:.5,margin:.1,coverageWeight:.5,motionWeight:.25});assert.equal(result.acceptedPrecision,1);assert.equal(result.formQuality.accuracy,null);assert.equal(result.repetitionCounting.mae,null);
  rows[0].label.repCount=4;assert.equal(aggregate(rows).repetitionCounting.mae,1);
  assert.equal(predict(Object.fromEntries(classes.map(c=>[c,features(false)]))).prediction,null);
});
test('confidence intervals do not equate a small perfect sample with established 80% precision',()=>{assert.ok(wilson(3,3).low<.8);assert.ok(wilson(100,100).low>.8);assert.equal(wilson(0,0).low,null);});
test('calibration uses training and validation only and supports abstention',()=>{
  const rows=Array.from({length:60},(_,i)=>({id:'x'+i,label:{exercise:classes[i%3],form:null},predictions:Object.fromEntries(classes.map(c=>[c,features(c===classes[i%3])]))}));
  const fitted=calibrate(rows,rows);assert.equal(fitted.validationGatePassed,true);assert.ok(fitted.validation.acceptedPrecision95CI.low>=.8);assert.throws(()=>calibrate(rows,[]));
});
