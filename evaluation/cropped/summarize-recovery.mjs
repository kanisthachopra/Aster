import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {ROOT} from '../lib.mjs';
const manifest=JSON.parse(readFileSync(resolve(ROOT,'frontend/artifacts/cropped-evaluation/manifest.json'),'utf8'));
const cases=[];
for(const fixture of manifest){
 if(fixture.privacy!=='public')throw Error('Only public inputs may be exported.');
 const base=resolve(ROOT,'frontend/artifacts/cropped-evaluation/results/recovery-v2');
 const summaryPath=resolve(base,fixture.id+'-image-summary.json');if(!existsSync(summaryPath))continue;
 const summary=JSON.parse(readFileSync(summaryPath,'utf8'));if(summary.privacy!=='public'||summary.externalRequests!==0)throw Error('Expected local public-only run.');
 const variants=['baseline','image','padded'].map(variant=>{
  const result=JSON.parse(readFileSync(resolve(base,`${fixture.id}-${variant}-replay.json`),'utf8'));
  return {variant,quality:summary.quality[variant],status:result.summary.status,focus:result.summary.focus,
   observationIds:result.summary.observationIds,strengthIds:result.summary.strengthIds,
   evidenceWindows:[...result.review.observations,...result.review.strengths].map(v=>({id:v.id,start:v.timestamp,end:v.endTimestamp})),
   ruleFingerprints:result.summary.hashes};
 });
 cases.push({id:fixture.id,sourceGroup:fixture.sourceGroup??null,transformation:fixture.transformation,samples:summary.samples,seconds:summary.seconds,ambiguousFrames:summary.ambiguous,modelFingerprints:summary.hashes,variants});
}
writeFileSync(resolve(ROOT,'evaluation/cropped/public-recovery-results.json'),JSON.stringify({evaluatedAt:new Date().toISOString(),experimentalOnly:true,productionIntegrated:false,privateDataIncluded:false,independentFormLabels:0,conclusion:'No additional measured movement cue was recovered. Coverage changes are mixed; recovery is not integrated.',cases},null,2)+'\n');
console.log(`Exported ${cases.length} public-only recovery comparisons; no private files read.`);
