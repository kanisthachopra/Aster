import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enabled=process.env.ASTER_MOVENET_EVAL==='1';
const all=enabled?['artifacts/cropped-evaluation/manifest.json','artifacts/cropped-evaluation/private-inputs.json'].filter(existsSync).flatMap(p=>JSON.parse(readFileSync(p,'utf8'))):[];
const cases=all.filter(f=>['navy-original','empty-scene','private-pushup'].includes(f.id));
for(const fixture of cases)test(`independent MoveNet Thunder: ${fixture.id}`,async({page,context})=>{
 test.setTimeout(600000);
 const base=fixture.privacy==='private'?'artifacts/private-evaluation/partial-movement-rerun':'artifacts/cropped-evaluation/results';
 const baseline=JSON.parse(readFileSync(`${base}/${fixture.id}-raw.json`,'utf8')).report;
 const source=readFileSync(fixture.path),external:string[]=[];
 const paths=['src/analysis/measurements.ts','src/analysis/movementReview.ts','src/analysis/partialMovementReview.ts','src/analysis/twoPointMovementReview.ts','src/analysis/coaching.ts',...['model.json','group1-shard1of3.bin','group1-shard2of3.bin','group1-shard3of3.bin'].map(n=>'artifacts/recovery-models/movenet-thunder/'+n)];
 const fingerprint=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const hashes=fingerprint();
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://127.0.0.1:5174'||u.pathname.startsWith('/api/')){external.push(u.origin);await route.abort();return;}
  if(u.pathname==='/movenet-runner'){await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local independent tracker</title>'});return;}
  if(u.pathname==='/movenet-input'){await route.fulfill({contentType:'video/mp4',body:source});return;}
  const js=u.pathname==='/movenet-tf.js'?'../.tools/movenet-evaluation/node_modules/@tensorflow/tfjs/dist/tf.min.js':u.pathname==='/movenet-pose.js'?'../.tools/movenet-evaluation/node_modules/@tensorflow-models/pose-detection/dist/pose-detection.min.js':null;
  if(js){await route.fulfill({contentType:'text/javascript',body:readFileSync(js)});return;}
  if(u.pathname.startsWith('/movenet-model/')){const name=u.pathname.slice('/movenet-model/'.length);if(!/^(model\.json|group1-shard[123]of3\.bin)$/.test(name)){await route.abort();return;}await route.fulfill({contentType:name.endsWith('json')?'application/json':'application/octet-stream',body:readFileSync('artifacts/recovery-models/movenet-thunder/'+name)});return;}
  await route.continue();
 });
 await page.goto('/movenet-runner');await page.addScriptTag({url:'/movenet-tf.js'});await page.addScriptTag({url:'/movenet-pose.js'});const started=Date.now();
 const result=await page.evaluate(async({baseline,exercise})=>{
  const {measure,summarize}=await import('/src/analysis/measurements.ts');const {getMovementReview}=await import('/src/analysis/movementReview.ts');const {getCoachingReview}=await import('/src/analysis/coaching.ts');
  const tf=(window as any).tf,pose=(window as any).poseDetection;await tf.setBackend('webgl');await tf.ready();
  const detector=await pose.createDetector(pose.SupportedModels.MoveNet,{modelType:pose.movenet.modelType.SINGLEPOSE_THUNDER,modelUrl:'/movenet-model/model.json',enableSmoothing:true});
  const video=document.createElement('video');video.muted=true;const url=URL.createObjectURL(await(await fetch('/movenet-input')).blob());
  const event=(name:string)=>new Promise<void>((resolve,reject)=>{video.addEventListener(name,()=>resolve(),{once:true});video.addEventListener('error',()=>reject(new Error('decode failed')),{once:true});});const loaded=event('loadeddata');video.src=url;video.load();await loaded;
  const canvas=document.createElement('canvas');canvas.width=Math.min(video.videoWidth,960);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);const ctx=canvas.getContext('2d')!;
  const map:Record<string,number>={left_shoulder:11,right_shoulder:12,left_elbow:13,right_elbow:14,left_wrist:15,right_wrist:16,left_hip:23,right_hip:24,left_knee:25,right_knee:26,left_ankle:27,right_ankle:28};
  const auditIndices=new Set([0,Math.floor(baseline.frames.length*.25),Math.floor(baseline.frames.length*.5),Math.floor(baseline.frames.length*.75),baseline.frames.length-1]);const frames:any[]=[],audits:any[]=[],detections:any[]=[];
  try{for(let i=0;i<baseline.frames.length;i++){
   const timestamp=baseline.frames[i].timestamp;const sought=event('seeked');video.currentTime=timestamp;await sought;ctx.drawImage(video,0,0,canvas.width,canvas.height);
   const poses=await detector.estimatePoses(canvas,{flipHorizontal:false},timestamp*1000);
   const points=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
   if(poses.length===1)for(const p of poses[0].keypoints){const id=map[p.name];if(id===undefined)continue;const x=p.x/canvas.width,y=p.y/canvas.height;points[id]={x,y,z:0,visibility:x>.005&&x<.995&&y>.005&&y<.995?(p.score??0):0};}
   const visiblePointCount=points.filter(p=>p.visibility>=.65).length;
   detections.push({timestamp,detectorPoseCount:poses.length,visiblePointCount});
   // A low-confidence single-pose output is not evidence of a detected person.
   const landmarks=poses.length===1&&visiblePointCount>0?points:[];frames.push({timestamp,landmarks,metrics:measure(landmarks,exercise,video.videoWidth,video.videoHeight)});
   if(auditIndices.has(i)){
    const raw=canvas.toDataURL('image/jpeg',.85);ctx.lineWidth=3;
    for(const [a,b] of [[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28]]){if(points[a].visibility<.65||points[b].visibility<.65)continue;ctx.strokeStyle='#00ff88';ctx.beginPath();ctx.moveTo(points[a].x*canvas.width,points[a].y*canvas.height);ctx.lineTo(points[b].x*canvas.width,points[b].y*canvas.height);ctx.stroke();}
    for(const [id,p]of points.entries()){if(p.visibility<.65)continue;ctx.fillStyle='#00ff88';ctx.beginPath();ctx.arc(p.x*canvas.width,p.y*canvas.height,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='white';ctx.fillText(`${id}:${p.visibility.toFixed(2)}`,p.x*canvas.width+6,p.y*canvas.height);}
    audits.push({timestamp,raw,overlay:canvas.toDataURL('image/jpeg',.85)});
   }
  }}finally{detector.dispose();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
  const report=summarize(frames,exercise,baseline.duration,baseline.width,baseline.height);const ids=exercise==='squat'?[23,25,27]:[11,13,15];
  const visible=(p:any)=>p&&p.visibility>=.65&&p.x>.005&&p.x<.995&&p.y>.005&&p.y<.995;
  const chain=[0,1].map(side=>frames.filter(f=>ids.every(id=>visible(f.landmarks[id+side]))).length),pair=[0,1].map(side=>frames.filter(f=>ids.slice(1).every(id=>visible(f.landmarks[id+side]))).length);
  return {report,review:getMovementReview(report),coaching:getCoachingReview(report),chain,pair,audits,detections};
 },{baseline,exercise:fixture.exercise});
 const folder=`${base}/movenet-v1`;mkdirSync(folder,{recursive:true});const {audits,...raw}=result;writeFileSync(`${folder}/${fixture.id}-raw.json`,JSON.stringify(raw));
 for(const [i,a]of audits.entries())for(const kind of ['raw','overlay'] as const)writeFileSync(`${folder}/${fixture.id}-${i}-${kind}.jpg`,Buffer.from(a[kind].split(',')[1],'base64'));
 const summary={id:fixture.id,privacy:fixture.privacy,samples:baseline.frames.length,seconds:(Date.now()-started)/1000,status:result.report.status,chain:result.chain,pair:result.pair,observationIds:result.review.observations.map((v:any)=>v.id),strengthIds:result.review.strengths.map((v:any)=>v.id),evidence:[...result.review.observations,...result.review.strengths].map((v:any)=>({id:v.id,start:v.timestamp,end:v.endTimestamp})),hashes,externalRequests:external.length,engineStable:JSON.stringify(hashes)===JSON.stringify(fingerprint()),confidenceCaveat:'MoveNet keypoint score is not calibrated as MediaPipe visibility',identityCaveat:'Single-pose Thunder cannot detect multi-person ambiguity'};
 writeFileSync(`${folder}/${fixture.id}-summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));expect(external).toEqual([]);expect(summary.engineStable).toBe(true);
 for(const f of result.report.frames)for(const id of [0,1,2,3,4,5,6,7,8,9,10,17,18,19,20,21,22,29,30,31,32])if(f.landmarks.length)expect(f.landmarks[id].visibility).toBe(0);
 if(fixture.syntheticNegative){expect(result.review.observations).toEqual([]);expect(result.review.strengths).toEqual([]);}
});
