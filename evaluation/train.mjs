import{resolve}from'node:path';import{readFileSync,existsSync}from'node:fs';import{argumentsMap,ROOT,readJson,atomicJson,sha}from'./lib.mjs';import{fitAndCalibrate,linearAggregate}from'./classifier.mjs';
const args=argumentsMap(),input=resolve(ROOT,args.input||'evaluation/results/baseline-v1-predictions-development.json'),rows=readJson(input),name=args.name||'linear-v1',output=resolve(ROOT,'evaluation/results',name);
const implementationHash=sha(['classifier.mjs','forest.mjs','metrics.mjs'].map(path=>readFileSync(resolve(ROOT,'evaluation',path),'utf8')).join('\n'));
const developmentPath=input.replace('-predictions-development.json','-development.json').replace('-predictions-test.json','-test.json');
if(developmentPath===input||!existsSync(developmentPath))throw Error('Prediction artifact requires its paired versioned score metadata.');
const metadata=readJson(developmentPath);
if(metadata.incomplete)throw Error('Final model fitting/testing requires complete inference coverage.');
if(args.test){
  const frozen=readJson(output+'-model.json'),test=rows.filter(r=>r.split==='test');
  if(!test.length)throw Error('No held-out test rows');
  if(implementationHash!==frozen.implementationHash)throw Error('Classifier changed after fitting; freeze a new version before testing');
  if(metadata.manifest.sha256!==frozen.manifestHash||metadata.sourceHash!==frozen.featureSourceHash||metadata.poseFeatureHash!==frozen.poseFeatureHash||metadata.engineKey!==frozen.engineKey)throw Error('Test data, feature rules or inference engine differ from the frozen model.');
  const seen=new Set(frozen.developmentGroups);if(test.some(r=>seen.has(r.sourceGroup)))throw Error('Test source group leaked into training or validation.');
  const result=linearAggregate(test,frozen.calibration.model,frozen.calibration.gate);
  atomicJson(output+'-test.json',{createdAt:new Date().toISOString(),modelArtifact:name+'-model.json',manifestHash:frozen.manifestHash,test:result,claimBoundary:'Exercise recognition only; no correct/incorrect-form accuracy or safety claim.'});console.log(JSON.stringify(result,null,2));
}else{
  if(rows.some(r=>r.split==='test'))throw Error('Do not expose test rows to training');
  if(existsSync(output+'-model.json'))throw Error('Model artifact exists: use a new development version, never silently refit after seeing test');
  const train=rows.filter(r=>r.split==='train'),validation=rows.filter(r=>r.split==='validation');
  const trainGroups=new Set(train.map(r=>r.sourceGroup));if(validation.some(r=>trainGroups.has(r.sourceGroup)))throw Error('Training/validation source-group leakage');
  const calibration=fitAndCalibrate(train,validation,Number(args.precision||.8),args.family||'linear');
  const artifact={createdAt:new Date().toISOString(),inputHash:sha(readFileSync(input)),implementationHash,manifestHash:metadata.manifest.sha256,featureSourceHash:metadata.sourceHash,poseFeatureHash:metadata.poseFeatureHash,engineKey:metadata.engineKey,developmentGroups:[...new Set(rows.map(r=>r.sourceGroup))].sort(),calibration,claimBoundary:'Exercise recognition only. Softmax scores are not form-correctness probabilities. Calibration is not a guarantee for new users.'};
  atomicJson(output+'-model.json',artifact);console.log(JSON.stringify({training:calibration.training,validation:calibration.validation,validationGatePassed:calibration.validationGatePassed},null,2));
}
