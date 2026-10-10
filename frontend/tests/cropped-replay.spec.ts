import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enabled=process.env.ASTER_CROPPED_EVAL==='1';
const inputs=enabled?['artifacts/cropped-evaluation/manifest.json','artifacts/cropped-evaluation/private-inputs.json'].filter(existsSync).flatMap(p=>JSON.parse(readFileSync(p,'utf8'))):[];
test('replay saved model observations with current local coaching',async({page,context})=>{
 test.skip(!enabled); const external:string[]=[];
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://127.0.0.1:5174'||u.pathname.startsWith('/api/')){external.push(u.origin);await route.abort();return;}if(u.pathname==='/recovery-replay'){await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local replay</title>'});return;}await route.continue();});
 await page.goto('/recovery-replay');
 const hashes=Object.fromEntries(['movementReview','partialMovementReview','twoPointMovementReview','coaching'].map(n=>[n,createHash('sha256').update(readFileSync(`src/analysis/${n}.ts`)).digest('hex')]));
 const summaries=[];
 for(const fixture of inputs){
  const base=fixture.privacy==='private'?'artifacts/private-evaluation/partial-movement-rerun':'artifacts/cropped-evaluation/results';
  const {report:baseline}=JSON.parse(readFileSync(`${base}/${fixture.id}-raw.json`,'utf8'));
  const recoveryPath=`${base}/recovery-v2/${fixture.id}-image-raw.json`;
  const reports=process.env.ASTER_REPLAY_RECOVERY==='1'&&existsSync(recoveryPath)?JSON.parse(readFileSync(recoveryPath,'utf8')).reports:{baseline};
  const heavyPath=`${base}/heavy-v1/${fixture.id}-raw.json`;
  if(process.env.ASTER_REPLAY_RECOVERY==='1'&&existsSync(heavyPath))reports.heavy=JSON.parse(readFileSync(heavyPath,'utf8')).report;
  for(const [variant,report] of Object.entries(reports) as [string,any][]){
  const result=await page.evaluate(async report=>{const {getMovementReview}=await import('/src/analysis/movementReview.ts');const {getCoachingReview}=await import('/src/analysis/coaching.ts');return {review:getMovementReview(report),coaching:getCoachingReview(report)};},report);
  const summary={id:fixture.id,variant,privacy:fixture.privacy,status:report.status,samples:report.sampledFrames,observationIds:result.review.observations.map((v:any)=>v.id),strengthIds:result.review.strengths.map((v:any)=>v.id),focus:result.coaching.focus.kind,focusId:result.coaching.focus.id,momentIds:result.coaching.moments.map((v:any)=>v.id),freshInference:false,hashes};
  mkdirSync(`${base}/recovery-v2`,{recursive:true});writeFileSync(`${base}/recovery-v2/${fixture.id}-${variant}-replay.json`,JSON.stringify({summary,...result},null,2));summaries.push(summary);console.log(JSON.stringify(summary));
  }
 }
 writeFileSync('artifacts/cropped-evaluation/results/recovery-v2/public-replay.json',JSON.stringify(summaries.filter(v=>v.privacy==='public'),null,2));expect(external).toEqual([]);
 expect(Object.fromEntries(Object.keys(hashes).map(n=>[n,createHash('sha256').update(readFileSync(`src/analysis/${n}.ts`)).digest('hex')]))).toEqual(hashes);
});
