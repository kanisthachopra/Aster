import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {ROOT} from '../lib.mjs';
const manifest=JSON.parse(readFileSync(resolve(ROOT,'frontend/artifacts/cropped-evaluation/manifest.json'),'utf8'));
const cases=[];
for(const fixture of manifest){
 if(fixture.privacy!=='public')throw Error('Only public inputs may be exported.');
 const base=resolve(ROOT,'frontend/artifacts/cropped-evaluation/results');
 const path=resolve(base,'heavy-v1',fixture.id+'-summary.json');if(!existsSync(path))continue;
 const heavy=JSON.parse(readFileSync(path,'utf8')),full=JSON.parse(readFileSync(resolve(base,fixture.id+'-summary.json'),'utf8'));
 if(heavy.privacy!=='public'||!heavy.engineStable||heavy.externalRequests!==0)throw Error('Expected stable public-only local inference.');
 const metrics=r=>({status:r.status,visibleChainFrames:r.visibleChainFrames,observationIds:r.observationIds,strengthIds:r.strengthIds,evidenceWindows:r.evidenceWindows,seconds:r.seconds});
 const replayPath=resolve(base,'recovery-v2',fixture.id+'-heavy-replay.json');
 const replay=existsSync(replayPath)?JSON.parse(readFileSync(replayPath,'utf8')):null;
 cases.push({id:fixture.id,sourceGroup:fixture.sourceGroup??null,transformation:fixture.transformation,samples:heavy.samples,full:metrics(full),heavy:metrics(heavy),fingerprints:heavy.fingerprints,
 ...(replay?{latestRuleReplay:{freshInference:false,observationIds:replay.summary.observationIds,strengthIds:replay.summary.strengthIds,focus:replay.summary.focus,fingerprints:replay.summary.hashes,evidenceWindows:[...replay.review.observations,...replay.review.strengths].map(v=>({id:v.id,start:v.timestamp,end:v.endTimestamp}))}}:{})});
}
writeFileSync(resolve(ROOT,'evaluation/cropped/public-heavy-results.json'),JSON.stringify({evaluatedAt:new Date().toISOString(),experimentalOnly:true,productionIntegrated:false,privateDataIncluded:false,independentFormLabels:0,modelSource:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',cases},null,2)+'\n');
console.log(`Exported ${cases.length} public-only Heavy model comparisons; no private files read.`);
