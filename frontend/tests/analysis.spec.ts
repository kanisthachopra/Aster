import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { angle, measure, summarize, countCycles, stabilizeFrames } from '../src/analysis/measurements';
import type { EvidenceFrame, Landmark } from '../src/analysis/types';

const p = (x: number,y: number): Landmark => ({ x,y,z:0,visibility:1 });
function syntheticFrames(values: number[]): EvidenceFrame[] {
  return values.map((value,i) => ({ timestamp:i*.25,landmarks:[],metrics:{ knee:value,elbow:value,hip:175,bodyTilt:10,side:'left',orientationMatches:true } }));
}

test('projected angles respect aspect ratio; missing, clipped and degenerate joints are rejected', () => {
  expect(angle(p(.1,.5),p(.5,.5),p(.5,.1),2)).toBeCloseTo(90);
  expect(angle(p(.1,.1),p(.5,.5),p(.9,.1),2)).toBeCloseTo(126.87,1);
  expect(Number.isNaN(angle(p(.1,.1),p(.1,.1),p(.9,.1),2))).toBe(true);
  expect(measure([], 'squat',1920,1080)).toBe(null);
  const clipped = Array.from({length:33},()=>p(0,0));
  expect(measure(clipped,'squat',1920,1080)).toBe(null);
});

test('synthetic rule tests reject stillness, incomplete cycles, tracking gaps and wrong orientation', () => {
  for (const values of [Array(16).fill(170),[170,160,150,140,120,100,90,80]]) {
    expect(summarize(syntheticFrames(values),'squat',4,1280,720).status).toBe('partial');
  }
  const frames = syntheticFrames([170,165,140,110,80,100,130,165,170,165,140,110,80,100,130,165,170]);
  expect(countCycles(frames,'knee')).toBe(2);
  expect(summarize(frames,'squat',4.25,1280,720).status).toBe('usable');
  const wrong = frames.map(f=>({...f,metrics:{...f.metrics!,orientationMatches:false}}));
  expect(summarize(wrong,'squat',4.25,1280,720).status).not.toBe('usable');
  const broken = syntheticFrames([170,165,140,110,80,100,130,165,170]);
  broken[4].metrics=null;
  expect(countCycles(broken,'knee')).toBe(1);
  broken[3].metrics=null;broken[5].metrics=null;broken[6].metrics=null;
  expect(countCycles(broken,'knee')).toBe(0);
  const spike=syntheticFrames(Array.from({length:24},(_,i)=>i===12?80:170));
  expect(countCycles(spike,'knee')).toBe(0);
  // These fixtures test our deterministic rules; they do not validate pose-model accuracy.
});

test('cropped head and feet preserve an observable arm; hidden shoulder never gets an angle',()=>{
  const joints=Array.from({length:33},()=>({...p(.5,.5),visibility:.1}));
  for(const[i,x,y]of[[11,.2,.3],[13,.3,.55],[15,.45,.7],[23,.65,.4]])joints[i]=p(x,y);
  const result=measure(joints,'pushup',1280,720);
  expect(result?.elbow).not.toBeNull();expect(result?.knee).toBeNull();expect(result?.hip).toBeNull();
  joints[11]=p(.2,-.1);
  expect(measure(joints,'pushup',1280,720)?.elbow).toBeNull();
});

test('dominant side is stable and generic partial observations do not need a completed cycle',()=>{
  const frames=syntheticFrames(Array(12).fill(140)).map((f,i)=>({...f,metrics:{...f.metrics!,side:(i%2?'right':'left') as 'left'|'right',sides:{left:{elbow:140,knee:170,hip:null},right:{elbow:i%2?90:null,knee:null,hip:null}}}}));
  expect(stabilizeFrames(frames,'pushup').every(f=>f.metrics?.side==='left')).toBe(true);
  const report=summarize(frames,'pushup',3,1280,720);
  expect(report.status).toBe('partial');expect(report.estimatedRepetitions).toBe(0);expect(report.findings.some(f=>f.id==='range')).toBe(true);
});

test('cycles can start bent, and a reaching hand is not counted as a pull-up',()=>{
  expect(countCycles(syntheticFrames([80,90,120,160,170,160,120,90,80]),'knee')).toBe(1);
  const values=[170,160,140,110,80,110,140,160,170];
  const frames=syntheticFrames(values).map((frame,i)=>{
    const landmarks=Array.from({length:33},()=>({...p(.5,.5),visibility:.1}));
    landmarks[11]=p(.5,.5-(170-values[i])/450);landmarks[15]=p(.5,.1);
    return {...frame,landmarks};
  });
  expect(countCycles(frames,'elbow','pullup')).toBe(1);
  frames.forEach((frame,i)=>{frame.landmarks[15]=p(.5,.1+(170-values[i])/400);});
  expect(countCycles(frames,'elbow','pullup')).toBe(0);
});

test('synthetic landmarks distinguish horizontal support from standing and overhead support',()=>{
  const joints=Array.from({length:33},()=>({...p(.5,.5),visibility:.1}));
  const set=(i:number,x:number,y:number)=>{joints[i]=p(x,y);};
  set(0,.15,.4);set(11,.2,.5);set(13,.2,.65);set(15,.3,.75);set(23,.5,.5);set(25,.7,.55);set(27,.85,.55);
  expect(measure(joints,'pushup',1280,720)?.orientationMatches).toBe(true);
  expect(measure(joints,'pullup',1280,720)?.orientationMatches).toBe(false);
  expect(measure(joints,'squat',1280,720)?.orientationMatches).toBe(false);
  set(0,.5,.1);set(11,.5,.2);set(13,.6,.35);set(15,.7,.4);set(23,.5,.45);set(25,.6,.65);set(27,.5,.9);
  expect(measure(joints,'squat',1280,720)?.orientationMatches).toBe(true);
  expect(measure(joints,'pushup',1280,720)?.orientationMatches).toBe(false);
  set(0,.5,.15);set(11,.5,.3);set(13,.65,.15);set(15,.5,.03);set(23,.5,.55);set(25,.5,.75);
  expect(measure(joints,'pullup',1280,720)?.orientationMatches).toBe(true);
  expect(measure(joints,'squat',1280,720)?.orientationMatches).toBe(false);
});

test('real local model runs off-thread and finds 33 landmarks on Google official pose fixture', async ({page}) => {
  const fixture = 'artifacts/analysis/pose.jpg';
  test.skip(!existsSync(fixture),'Optional official fixture: see public/models/README.md.');
  const base64 = readFileSync(fixture).toString('base64');
  await page.route('**/analysis-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local inference test</title>'}));
  await page.goto('/analysis-test');
  const landmarks = await page.evaluate(async encoded => {
    const blob = await (await fetch(`data:image/jpeg;base64,${encoded}`)).blob();
    const bitmap = await createImageBitmap(blob), worker = new Worker('/mediapipe/pose-worker.js');
    try {
      const receive = () => new Promise<any>((resolve,reject)=>{worker.onmessage=e=>e.data.type==='error'?reject(new Error(e.data.message)):resolve(e.data);worker.onerror=e=>reject(new Error(e.message));});
      let wait = receive(); worker.postMessage({type:'init'}); await wait;
      wait = receive(); worker.postMessage({type:'frame',timestamp:.1,bitmap},[bitmap]);
      return (await wait).landmarks;
    } finally {worker.terminate();}
  },base64);
  expect(landmarks).toHaveLength(1);
  expect(landmarks[0]).toHaveLength(33);
  expect(landmarks[0][11].visibility).toBeGreaterThan(.65);
  await test.info().attach('actual-pose-landmarks',{body:JSON.stringify(landmarks),contentType:'application/json'});
});

test('actual video decoding + model inference rejects a clip containing no person',async ({page})=>{
  const remoteRequests: string[] = [];
  page.on('request',request=>{if(request.url().startsWith('http') && new URL(request.url()).hostname !== '127.0.0.1')remoteRequests.push(request.url());});
  const base64 = readFileSync('tests/fixtures/playback.mp4').toString('base64');
  await page.route('**/analysis-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local inference test</title>'}));
  await page.goto('/analysis-test');
  const report = await page.evaluate(async encoded=>{
    const blob = await(await fetch(`data:video/mp4;base64,${encoded}`)).blob();
    const {analyzeVideo} = await import('/src/analysis/analyzeVideo.ts');
    return analyzeVideo(new File([blob],'test.mp4',{type:'video/mp4'}),'squat',()=>{},new AbortController().signal);
  },base64);
  expect(report.status).toBe('insufficient');
  expect(report.estimatedRepetitions).toBe(0);
  expect(report.sampledFrames).toBeGreaterThan(7);
  expect(remoteRequests).toEqual([]);
});

test('cancelling during actual frame sampling aborts the worker and produces no report',async ({page})=>{
  const base64=readFileSync('tests/fixtures/playback.mp4').toString('base64');
  await page.route('**/analysis-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Cancellation test</title>'}));
  await page.goto('/analysis-test');
  const result=await page.evaluate(async encoded=>{
    const blob=await(await fetch(`data:video/mp4;base64,${encoded}`)).blob();
    const {analyzeVideo}=await import('/src/analysis/analyzeVideo.ts');
    const controller=new AbortController();
    try {
      await analyzeVideo(new File([blob],'test.mp4',{type:'video/mp4'}),'squat',progress=>{if(progress.stage==='sampling')controller.abort();},controller.signal);
      return 'unexpected report';
    } catch(error) {return (error as Error).name;}
  },base64);
  expect(result).toBe('AbortError');
});

test('real public-domain Navy push-up clip produces an evidence-based movement review',async({page})=>{
  test.skip(!existsSync('artifacts/real-exercise.mp4'),'Optional public-domain fixture; see artifacts/real-exercise-provenance.md');
  const base64=readFileSync('artifacts/real-exercise.mp4').toString('base64');
  await page.route('**/analysis-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Real exercise test</title>'}));
  await page.goto('/analysis-test');
  const report=await page.evaluate(async encoded=>{
    const blob=await(await fetch(`data:video/mp4;base64,${encoded}`)).blob();
    const {analyzeVideo}=await import('/src/analysis/analyzeVideo.ts');
    return analyzeVideo(new File([blob],'navy-pushup.mp4',{type:'video/mp4'}),'pushup',()=>{},new AbortController().signal);
  },base64);
  writeFileSync('artifacts/analysis/real-pushup-report.json',JSON.stringify(report,null,2));
  expect(report.status).toBe('usable');
  expect(report.estimatedRepetitions).toBeGreaterThan(0);
  expect(report.coverage).toBeGreaterThanOrEqual(.6);
  expect(report.findings.every(f=>report.frames.some(frame=>frame.timestamp===f.timestamp && frame.metrics!==null))).toBe(true);
});

for (const exercise of ['squat','pullup'] as const) test(`real push-up clip does not qualify at the ${exercise} station`,async({page})=>{
  test.skip(!existsSync('artifacts/real-exercise.mp4'),'Optional public-domain fixture');
  const base64=readFileSync('artifacts/real-exercise.mp4').toString('base64');
  await page.route('**/analysis-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Exercise mismatch test</title>'}));
  await page.goto('/analysis-test');
  const report=await page.evaluate(async({encoded,exercise})=>{
    const blob=await(await fetch(`data:video/mp4;base64,${encoded}`)).blob();
    const {analyzeVideo}=await import('/src/analysis/analyzeVideo.ts');
    return analyzeVideo(new File([blob],'navy-pushup.mp4',{type:'video/mp4'}),exercise,()=>{},new AbortController().signal);
  },{encoded:base64,exercise});
  expect(report.status).not.toBe('usable');
  expect(report.estimatedRepetitions).toBe(0);
});
