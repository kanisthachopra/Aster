import{resolve,dirname}from'node:path';import{readFileSync,writeFileSync,existsSync,mkdirSync,appendFileSync,renameSync}from'node:fs';
import{gzipSync,gunzipSync}from'node:zlib';import{createRequire}from'node:module';
import{ROOT,sha,readManifest,validateRecords,safeDataPath,argumentsMap,atomicJson,summarizeManifest}from'./lib.mjs';
const require=createRequire(resolve(ROOT,'frontend/package.json'));const{chromium}=require('@playwright/test');
const args=argumentsMap(),manifestPath=resolve(ROOT,args.manifest||'evaluation/manifests/dataset.jsonl'),records=readManifest(manifestPath);
const validation=validateRecords(records,{checkFiles:true,requireTarget:!!args.target});if(!validation.valid)throw Error(JSON.stringify(validation.errors));
if(records.some(r=>!r.split))throw Error('Lock source-group train/validation/test splits before inference.');
const fingerprintFiles=['frontend/public/models/pose_landmarker_full.task','frontend/public/mediapipe/pose-worker.js','frontend/src/analysis/analyzeVideo.ts'];
const fingerprints=Object.fromEntries(fingerprintFiles.map(path=>[path,sha(readFileSync(resolve(ROOT,path)))]));
const engineKey=sha(JSON.stringify(fingerprints)).slice(0,20),cacheDirectory=resolve(ROOT,'evaluation/cache',engineKey);mkdirSync(cacheDirectory,{recursive:true});
const selected=records.filter(r=>(!args.split||args.split==='all'||r.split===args.split)&&(!args.exercise||r.exercise===args.exercise)).slice(0,args.limit?Number(args.limit):undefined);
const runId=args.name||`inference-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`,resultPath=resolve(ROOT,'evaluation/results',runId+'.json');
const baseURL=args.url||'http://127.0.0.1:5174',concurrency=Math.max(1,Math.min(6,Number(args.workers||1)));
const state={runId,createdAt:new Date().toISOString(),engineKey,fingerprints,manifest:summarizeManifest(records),requested:selected.length,concurrency,processed:0,cached:0,failed:0,retried:0,clips:[]};
const logPath=resolve(ROOT,'evaluation/logs',runId+'.jsonl');mkdirSync(dirname(logPath),{recursive:true});
let stopping=false,cursor=0;process.on('SIGINT',()=>{stopping=true;console.log('Stopping after active local inference jobs; completed caches are retained.');});
const launch=()=>chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling']});
let browser=await launch(),restarting=null;
async function createSlot(){
  if(!browser.isConnected()){restarting??=launch().then(next=>{browser=next;restarting=null;});await restarting;}
  const page=await browser.newPage(),slot={page,file:null,externalRequests:0};
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==new URL(baseURL).origin){slot.externalRequests++;await route.abort();return;}
    if(url.pathname==='/evaluation-runner'){await route.fulfill({contentType:'text/html',body:'<!doctype html><title>ASTER local evaluation</title>'});return;}
    if(url.pathname==='/evaluation-media'){if(!slot.file){await route.abort();return;}await route.fulfill({contentType:'video/mp4',body:readFileSync(slot.file)});return;}
    await route.continue();
  });
  await page.goto(baseURL+'/evaluation-runner');return slot;
}
async function one(record,slot){
  const cachedPath=resolve(cacheDirectory,record.sha256+'.json.gz');
  if(existsSync(cachedPath)&&!args.force){const cached=JSON.parse(gunzipSync(readFileSync(cachedPath)));if(cached.sha256===record.sha256&&cached.engineKey===engineKey){state.cached++;return{id:record.id,split:record.split,outcome:'cached',samples:cached.frames.length,seconds:0};}}
  const began=Date.now(),page=slot.page;slot.file=safeDataPath(record);slot.externalRequests=0;let timeout;
  try{
    const data=await Promise.race([page.evaluate(async ({exercise,profile})=>{
      const{analyzeVideo}=await import('/src/analysis/analyzeVideo.ts');
      const blob=await(await fetch('/evaluation-media')).blob(),started=performance.now(),timings=[];
      const report=await analyzeVideo(new File([blob],'evaluation.mp4',{type:'video/mp4'}),exercise,p=>{if(profile)timings.push({stage:p.stage,frame:p.completed,elapsedMs:performance.now()-started});},new AbortController().signal);
      return{duration:report.duration,width:report.width,height:report.height,frames:report.frames.map(frame=>({timestamp:frame.timestamp,landmarks:frame.landmarks})),...(profile?{timings}: {})};
    },{exercise:record.exercise,profile:!!args.profile}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Clip inference timed out')),Number(args.timeout||180000));timeout.unref();})]);
    if(slot.externalRequests)throw Error('External request attempted; all evaluation processing must remain local.');
    const cache={schemaVersion:1,engineKey,sha256:record.sha256,id:record.id,...data};const temporary=cachedPath+`.tmp-${process.pid}`;writeFileSync(temporary,gzipSync(JSON.stringify(cache)));renameSync(temporary,cachedPath);
    state.processed++;return{id:record.id,split:record.split,outcome:'processed',samples:data.frames.length,seconds:(Date.now()-began)/1000,...(data.timings?{timings:data.timings}:{})};
  }catch(error){state.failed++;await page.close().catch(()=>{});return{id:record.id,split:record.split,outcome:'failed',seconds:(Date.now()-began)/1000,error:error.message};}
  finally{clearTimeout(timeout);slot.file=null;}
}
async function worker(){let slot=await createSlot();try{while(!stopping){const index=cursor++;if(index>=selected.length)break;if(slot.page.isClosed())slot=await createSlot();let entry=await one(selected[index],slot);const attemptErrors=[];
  for(let retry=0;entry.outcome==='failed'&&retry<2;retry++){attemptErrors.push(entry.error);appendFileSync(logPath,JSON.stringify({...entry,event:'retryable-attempt'})+'\n');state.retried++;state.failed--;slot=await createSlot();entry=await one(selected[index],slot);}
  if(attemptErrors.length)entry={...entry,attemptErrors};state.clips.push(entry);appendFileSync(logPath,JSON.stringify(entry)+'\n');if(entry.outcome!=='cached'||state.clips.length%25===0)atomicJson(resultPath,state);if(entry.outcome!=='cached'||state.clips.length%25===0)console.log(`${state.clips.length}/${selected.length} ${entry.outcome} ${entry.id} ${entry.seconds.toFixed(1)}s`);}}finally{await slot.page.close().catch(()=>{});}}
try{await Promise.all(Array.from({length:concurrency},worker));}finally{await browser.close().catch(()=>{});state.finishedAt=new Date().toISOString();state.stopped=stopping;atomicJson(resultPath,state);}
console.log(JSON.stringify({runId,engineKey,processed:state.processed,cached:state.cached,failed:state.failed,requested:state.requested}));
if(state.failed)process.exitCode=1;
