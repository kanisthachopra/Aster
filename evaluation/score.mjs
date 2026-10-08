import{resolve}from'node:path';import{readFileSync,existsSync}from'node:fs';import{gunzipSync}from'node:zlib';import{pathToFileURL}from'node:url';
import{ROOT,readManifest,argumentsMap,atomicJson,sha,summarizeManifest,validateRecords}from'./lib.mjs';import{evidenceFeatures,aggregate,calibrate}from'./metrics.mjs';
import{intervalCountPredictions,countMetrics}from'./counting.mjs';
import{extractActivityPoseFeatures}from'../frontend/src/analysis/activityFeatures.ts';
const args=argumentsMap();if(!args.engine)throw Error('Provide --engine with the inference cache key printed by run.mjs.');
const records=readManifest(resolve(ROOT,args.manifest||'evaluation/manifests/dataset.jsonl'));const valid=validateRecords(records);if(!valid.valid)throw Error(JSON.stringify(valid.errors));
const version=args.version||'baseline',source=resolve(ROOT,args.source||`evaluation/versions/${version}/measurements.ts`),sourceHash=sha(readFileSync(source));
const poseFeatureHash=sha(readFileSync(resolve(ROOT,'frontend/src/analysis/activityFeatures.ts')));
const implementation=await import(pathToFileURL(source).href+'?v='+sourceHash),{measure,summarize}=implementation;
const output=resolve(ROOT,'evaluation/results',args.name||version),calibrationFile=output+'-calibration.json';
const includeTest=!!args.test;if(includeTest&&!existsSync(calibrationFile))throw Error('Freeze training/validation calibration before evaluating the untouched test set.');
let frozen;if(includeTest){frozen=JSON.parse(readFileSync(calibrationFile));if(frozen.sourceHash!==sourceHash||frozen.poseFeatureHash!==poseFeatureHash||frozen.manifest.sha256!==summarizeManifest(records).sha256)throw Error('Source or manifest changed after calibration; do not reinterpret the frozen test run.');}
const rows=[],missing=[];for(const record of records){if(record.split==='test'&&!includeTest)continue;
  const path=resolve(ROOT,'evaluation/cache',args.engine,record.sha256+'.json.gz');if(!existsSync(path)){missing.push(record.id);continue;}
  const data=JSON.parse(gunzipSync(readFileSync(path)));if(data.sha256!==record.sha256||data.engineKey!==args.engine)throw Error(`Inference cache provenance mismatch: ${record.id}`);const predictions={};
  for(const exercise of['pullup','pushup','squat']){const frames=data.frames.map(f=>({...f,metrics:measure(f.landmarks,exercise,data.width,data.height)})),report=summarize(frames,exercise,data.duration,data.width,data.height);predictions[exercise]=evidenceFeatures(frames,report,exercise);}
  predictions.poseFeatures=extractActivityPoseFeatures(data.frames,data.width,data.height);
  rows.push({id:record.id,sourceGroup:record.sourceGroup,split:record.split,label:record.label,predictions,countIntervals:intervalCountPredictions(record,data,implementation)});
}
if(missing.length&&!args.partial)throw Error(`${missing.length} inference caches missing. Use --partial only for explicitly incomplete development diagnostics.`);
const train=rows.filter(r=>r.split==='train'),validation=rows.filter(r=>r.split==='validation'),test=rows.filter(r=>r.split==='test');
const calibration=frozen?.calibration??calibrate(train,validation,Number(args.precision||.8));
const artifact={createdAt:new Date().toISOString(),version,sourceHash,poseFeatureHash,engineKey:args.engine,manifest:summarizeManifest(records),incomplete:missing.length>0,missing,calibration,
  splits:{train:aggregate(train,calibration.parameters),validation:aggregate(validation,calibration.parameters),...(includeTest?{test:aggregate(test,calibration.parameters)}:{})},
  annotatedIntervalCounting:{train:countMetrics(train),validation:countMetrics(validation),...(includeTest?{test:countMetrics(test)}:{})},
  claimBoundary:'Only activity labels support recognition metrics. Motion-cycle counts require independent count labels. No good/bad-form accuracy, clinical safety score or reinforcement-learning claim is established.'};
if(!includeTest){if(existsSync(calibrationFile)&&!args.replaceDevelopment)throw Error('Calibration already frozen. Use a new --name for a new development iteration.');atomicJson(calibrationFile,artifact);}
atomicJson(output+(includeTest?'-test.json':'-development.json'),artifact);atomicJson(output+(includeTest?'-predictions-test.json':'-predictions-development.json'),rows);
console.log(JSON.stringify(artifact,null,2));
