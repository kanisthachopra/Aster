import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enabled=process.env.ASTER_RECOVERY_EVAL==='1';
const cases=enabled?['artifacts/cropped-evaluation/manifest.json','artifacts/cropped-evaluation/private-inputs.json'].filter(existsSync).flatMap(p=>JSON.parse(readFileSync(p,'utf8'))):[];
for(const fixture of cases)test(`IMAGE recovery comparison: ${fixture.id}`,async({page,context})=>{
 test.setTimeout(600000);
 const base=fixture.privacy==='private'?'artifacts/private-evaluation/partial-movement-rerun':'artifacts/cropped-evaluation/results';
 const baseline=JSON.parse(readFileSync(`${base}/${fixture.id}-raw.json`,'utf8')).report;
 const bytes=readFileSync(fixture.path),external:string[]=[];
 const hashes=Object.fromEntries(['tests/harnesses/pose-recovery-worker.js','public/models/pose_landmarker_full.task'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://127.0.0.1:5174'||u.pathname.startsWith('/api/')){external.push(u.origin);await route.abort();return;}if(u.pathname==='/recovery-input'){await route.fulfill({contentType:'video/mp4',body:bytes});return;}if(u.pathname==='/recovery-runner'){await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local tracking comparison</title>'});return;}await route.continue();});
 await page.goto('/recovery-runner');const start=Date.now();
 const result=await page.evaluate(async({baseline,exercise})=>{
  const {measure,summarize}=await import('/src/analysis/measurements.ts');
  const video=document.createElement('video');video.muted=true;video.preload='auto';
  const event=(name:string)=>new Promise<void>((resolve,reject)=>{video.addEventListener(name,()=>resolve(),{once:true});video.addEventListener('error',()=>reject(new Error('Decode failed')),{once:true});});
  const url=URL.createObjectURL(await(await fetch('/recovery-input')).blob());
  const loaded=event('loadeddata');video.src=url;video.load();await loaded;
  const worker=new Worker('/tests/harnesses/pose-recovery-worker.js');
  const response=()=>new Promise<any>((resolve,reject)=>{worker.onmessage=e=>e.data.type==='error'?reject(new Error(e.data.message)):resolve(e.data);worker.onerror=e=>reject(new Error(e.message));});
  const ready=response();worker.postMessage({type:'init'});await ready;
  const frames:{image:any[];padded:any[]}={image:[],padded:[]};const diagnostics:any[]=[];
  try { for(const f of baseline.frames){
   const sought=event('seeked');video.currentTime=f.timestamp;await sought;
   const bitmap=await createImageBitmap(video,{resizeWidth:Math.min(video.videoWidth,960),resizeHeight:Math.round(video.videoHeight*Math.min(video.videoWidth,960)/video.videoWidth)});
   const pending=response();worker.postMessage({type:'frame',bitmap},[bitmap]);const r=await pending;
   diagnostics.push({timestamp:f.timestamp,ambiguous:r.ambiguous,counts:r.counts});
   for(const variant of ['image','padded'] as const)frames[variant].push({timestamp:f.timestamp,landmarks:r[variant],metrics:measure(r[variant],exercise,video.videoWidth,video.videoHeight)});
  }}finally{worker.terminate();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
  const visible=(p:any)=>p&&p.visibility>=.65&&p.x>.005&&p.x<.995&&p.y>.005&&p.y<.995;
  const ids=exercise==='squat'?[23,25,27]:[11,13,15];
  const quality=(fs:any[])=>[0,1].map(side=>{
   let chain=0,pair=0,longest=0,run=0,jumps=0;let previous:any=null;
   for(const f of fs){const p=f.landmarks,valid=ids.slice(1).every(id=>visible(p[id+side]));if(ids.every(id=>visible(p[id+side])))chain++;
    if(valid){pair++;const discontinuity=previous&&ids.slice(1).some(id=>Math.hypot((p[id+side].x-previous[id+side].x)*baseline.width/baseline.height,p[id+side].y-previous[id+side].y)>.15);if(discontinuity){jumps++;run=0;}run++;longest=Math.max(longest,run);previous=p;}else{run=0;previous=null;}}
   return {chain,pair,longest,jumps};
  });
  const reports={baseline,image:summarize(frames.image,exercise,baseline.duration,baseline.width,baseline.height),padded:summarize(frames.padded,exercise,baseline.duration,baseline.width,baseline.height)};
  return {reports,diagnostics,quality:Object.fromEntries(Object.entries(reports).map(([key,r])=>[key,quality(r.frames)]))};
 },{baseline,exercise:fixture.exercise});
 const summary={id:fixture.id,privacy:fixture.privacy,samples:baseline.frames.length,seconds:(Date.now()-start)/1000,quality:result.quality,ambiguous:result.diagnostics.filter((v:any)=>v.ambiguous).length,hashes,externalRequests:external.length};
 mkdirSync(`${base}/recovery-v2`,{recursive:true});writeFileSync(`${base}/recovery-v2/${fixture.id}-image-raw.json`,JSON.stringify(result));writeFileSync(`${base}/recovery-v2/${fixture.id}-image-summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
 expect(external).toEqual([]);
 if(!fixture.syntheticNegative)expect(new Set(result.reports.image.frames.map((f:any)=>JSON.stringify(f.landmarks))).size,'Changing video must not repeat the same cached result').toBeGreaterThan(2);
 if(fixture.gap)for(const variant of ['image','padded'] as const)expect(result.reports[variant].frames.filter((f:any)=>f.timestamp>fixture.gap[0]+.2&&f.timestamp<fixture.gap[1]-.2).every((f:any)=>f.landmarks.length===0),'Blackout must remove pose evidence').toBe(true);
 for(const f of result.reports.padded.frames)for(const p of f.landmarks)if(p.x<=.005||p.x>=.995||p.y<=.005||p.y>=.995)expect(p.visibility).toBe(0);
 if(fixture.syntheticNegative){expect(result.reports.image.poseFrames).toBe(0);expect(result.reports.padded.poseFrames).toBe(0);}
});
