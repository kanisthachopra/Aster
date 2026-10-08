import{resolve}from'node:path';import{writeFileSync}from'node:fs';
import{ROOT,readManifest,validateRecords,assignSplits,summarizeManifest,argumentsMap,atomicJson}from'./lib.mjs';
const args=argumentsMap(),path=resolve(ROOT,args.manifest||'evaluation/manifests/dataset.jsonl');
let records=readManifest(path),validation=validateRecords(records,{checkFiles:!!args.files,requireTarget:!!args.target});
if(!validation.valid){console.error(JSON.stringify(validation,null,2));process.exit(1);}
if(args.split){if(records.some(r=>r.split))throw Error('Manifest already has splits; never silently reshuffle a locked evaluation.');records=assignSplits(records,args.seed||'aster-600-v1');writeFileSync(path,records.map(r=>JSON.stringify(r)).join('\n')+'\n');atomicJson(path+'.lock.json',{createdAt:new Date().toISOString(),seed:args.seed||'aster-600-v1',summary:summarizeManifest(records),policy:'Source groups never cross splits. Test outcomes must remain unseen until protocol and calibration are frozen.'});}
console.log(JSON.stringify({...validation,...summarizeManifest(records)},null,2));
