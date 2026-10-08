import{test}from'node:test';import assert from'node:assert/strict';import{fitLinear,linearPredict,linearAggregate,vector,fitAndCalibrate}from'../classifier.mjs';
const classes=['pullup','pushup','squat'];
function row(i){const truth=classes[i%3];return{id:'synthetic-'+i,sourceGroup:'group-'+i,label:{exercise:truth},predictions:Object.fromEntries(classes.map(c=>[c,{compatibleFraction:c===truth?.9:.1,incompatibleFraction:c===truth?.05:.8,measurementCoverage:.8,poseCoverage:1,range:c===truth?75:5,cycles:c===truth?3:0,status:c===truth?'usable':'partial'}]))};}
test('supervised classifier learns from labels; prediction input contains no true label',()=>{
  const train=Array.from({length:30},(_,i)=>row(i)),model=fitLinear(train,{epochs:300});
  const holdout=Array.from({length:12},(_,i)=>row(i+100));
  assert.equal(linearAggregate(holdout,model,{threshold:.5,margin:.1}).correct,12);
  assert.ok(model.weights.flat().every(Number.isFinite));assert.equal(vector(holdout[0].predictions).length,46);
  assert.equal(linearPredict(holdout[0].predictions,model,{threshold:.999999,margin:0}).prediction,null);
});
test('classifier abstains on absent motion despite its learned intercept',()=>{
  const model=fitLinear(Array.from({length:9},(_,i)=>row(i)),{epochs:10});
  const missing=Object.fromEntries(classes.map(c=>[c,{compatibleFraction:0,incompatibleFraction:0,measurementCoverage:0,poseCoverage:0,range:0,cycles:0,status:'insufficient'}]));
  assert.equal(linearPredict(missing,model,{threshold:0,margin:0}).prediction,null);
});
test('visible but unanchored or discontinuously tracked motion cannot bypass the abstention gate',()=>{
 const model=fitLinear(Array.from({length:30},(_,i)=>row(i)),{epochs:100}),example=row(0).predictions;
 example.poseFeatures=Array(25).fill(0);assert.equal(linearPredict(example,model).prediction,null);
 example.poseFeatures[23]=.2;example.poseFeatures[22]=1;assert.equal(linearPredict(example,model).prediction,null);
});
test('an unsupported predicted class abstains even if other classes pass their gates',()=>{
 const model=fitLinear(Array.from({length:30},(_,i)=>row(i)),{epochs:300});
 const gate={perClass:{pullup:{threshold:0,margin:0,enabled:false},pushup:{threshold:0,margin:0,enabled:true},squat:{threshold:0,margin:0,enabled:true}}};
 assert.equal(linearPredict(row(0).predictions,model,gate).prediction,null);
 assert.equal(linearPredict(row(1).predictions,model,gate).prediction,'pushup');
 const result=linearAggregate([row(0),row(1),row(2)],model,gate);
 assert.equal(result.perClass.pullup.acceptedAsClass,0);assert.equal(result.perClass.pullup.acceptedPrecision,null);assert.equal(result.perClass.pushup.coverage,1);
});
test('a tiny perfect validation sample cannot establish any 80% class precision gate',()=>{
 const fitted=fitAndCalibrate(Array.from({length:30},(_,i)=>row(i)),Array.from({length:9},(_,i)=>row(i+100)));
 assert.equal(fitted.validationGatePassed,false);assert.equal(fitted.anyClassGatePassed,false);assert.equal(fitted.validation.accepted,0);
 assert.ok(classes.every(c=>fitted.gate.perClass[c].enabled===false));
});
