import { test, expect } from '@playwright/test';
import { getTwoPointMovementReview } from '../src/analysis/twoPointMovementReview';
import { getMovementReview } from '../src/analysis/movementReview';
import type { AnalysisReport, Landmark } from '../src/analysis/types';

// Independent rotating-segment fixtures, not actual pose detections or form labels.
function fixture(exercise:AnalysisReport['exercise']='pushup',repeats=1,turn=24,dt=.25):AnalysisReport {
  const frames=Array.from({length:32*repeats+1},(_,n)=>{
    const i=n===32*repeats?32:n%32, phase=i<=turn?i/turn:(32-i)/(32-turn);
    const theta=.2+.8*phase, direction=exercise==='pullup'?1:-1, anchor=exercise==='pullup'?.2:.75;
    const p:Landmark[]=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
    const [moving,fixed]=exercise==='squat'?[25,27]:[13,15];
    p[moving]={x:.4+.2*Math.sin(theta),y:anchor+direction*.2*Math.cos(theta),z:0,visibility:1};
    p[fixed]={x:.4,y:anchor,z:0,visibility:1};
    return {timestamp:n*dt,landmarks:p,metrics:null};
  });
  return {id:'synthetic-two-points',exercise,status:'partial',duration:32*repeats*dt,width:640,height:640,
    sampledFrames:frames.length,usableFrames:0,coverage:0,frames,findings:[],summary:'Only a small part of the body is visible.',
    limitations:[],sources:[],estimatedRepetitions:0,captureNotes:[]};
}
const ids=(r:AnalysisReport)=>getMovementReview(r).observations.map(x=>x.id);

test('two visible endpoints give bounded return timing without an unseen shoulder or hip',()=>{
  for(const exercise of ['pushup','pullup','squat'] as const) {
    const r=fixture(exercise),result=getMovementReview(r),segment=exercise==='squat'?'shin':'forearm';
    expect(result.observations.map(x=>x.id)).toContain(`${exercise}-${segment}-tempo`);
    expect(result.observations[0].observation).toMatch(/returns noticeably faster/);
    expect(result.observations[0].observation).not.toMatch(/lowering|shoulder|hip|elbow angle|knee angle/);
    expect(result.limits.join(' ')).toMatch(/does not measure.*angle/);
    expect(r.status).toBe('partial');expect(r.estimatedRepetitions).toBe(0);
  }
});

test('two repeated paths can receive a narrow strength even when fast phase sampling cannot support tempo',()=>{
  const r=fixture('pullup',2,30,.125),result=getTwoPointMovementReview(r);
  expect(result.observations).toHaveLength(0);expect(result.strengths[0]?.id).toBe('pullup-forearm-rhythm');
  expect(result.strengths[0].timestamp).toBe(0);expect(result.strengths[0].endTimestamp).toBe(8);
  expect(result.strengths[0].observation).toMatch(/similar position/);
  expect(result.strengths[0].why).toMatch(/does not require equal speeds/);
});

test('one path or incomplete return cannot establish repeated movement',()=>{
  expect(getTwoPointMovementReview(fixture()).strengths).toHaveLength(0);
  const r=fixture();r.frames=r.frames.slice(0,27);
  const result=getTwoPointMovementReview(r);expect(result.observations).toHaveLength(0);
  expect(result.strengths.every(e=>e.id.endsWith('-support'))).toBe(true);
});

test('pure translation and camera pan do not become forearm motion feedback',()=>{
  const translation=fixture();const initial=structuredClone(translation.frames[0].landmarks);
  translation.frames.forEach((f,i)=>{f.landmarks=structuredClone(initial);[13,15].forEach(id=>{f.landmarks[id].x+=.1*Math.sin(i*Math.PI/32);});});
  expect(ids(translation)).toHaveLength(0);
  const pan=fixture();pan.frames.forEach((f,i)=>[13,15].forEach(id=>{f.landmarks[id].x+=i*.002;}));
  expect(ids(pan)).toHaveLength(0);
});

test('view-depth length change, missing point and identity jump abstain',()=>{
  const view=fixture();view.frames.forEach((f,i)=>{
    const scale=1+.5*Math.sin(i*Math.PI/32);
    f.landmarks[13].x=.4+(f.landmarks[13].x-.4)*scale;
    f.landmarks[13].y=.75+(f.landmarks[13].y-.75)*scale;
  });expect(ids(view)).toHaveLength(0);
  const hidden=fixture();hidden.frames.forEach(f=>{f.landmarks[13].visibility=.6;});expect(ids(hidden)).toHaveLength(0);
  const gap=fixture();gap.frames[24].landmarks=[];expect(ids(gap)).toHaveLength(0);
  const identity=fixture();identity.captureNotes=['Change of tracked person.'];expect(ids(identity)).toHaveLength(0);
});

test('tiny motion, noise and an isolated tracking spike do not form a return sequence',()=>{
  const r=fixture();const first=structuredClone(r.frames[0].landmarks);
  r.frames.forEach((f,i)=>{f.landmarks=structuredClone(first);f.landmarks[13].x+=(i%2?1:-1)*.002;});
  expect(ids(r)).toHaveLength(0);
  r.frames[24].landmarks[13].x+=.15;expect(ids(r)).toHaveLength(0);
});

test('mirror, resolution and aspect preserve two-point timing',()=>{
  const r=fixture(),expected=ids(r);
  const mirror=structuredClone(r);mirror.frames.forEach(f=>f.landmarks.forEach(p=>{p.x=1-p.x;}));expect(ids(mirror)).toEqual(expected);
  const wide=structuredClone(r);wide.width=1280;wide.frames.forEach(f=>f.landmarks.forEach(p=>{p.x/=2;}));expect(ids(wide)).toEqual(expected);
  const big=structuredClone(r);big.width=big.height=1920;expect(ids(big)).toEqual(expected);
});

test('explicit incompatible station rejects, while uncertain station stays conditional',()=>{
  const wrong=fixture();wrong.frames.forEach(f=>{f.metrics={side:'left',elbow:null,knee:null,hip:null,bodyTilt:null,orientationMatches:false,orientation:'incompatible'} as never;});
  expect(ids(wrong)).toHaveLength(0);
  const upside=fixture('pushup');upside.exercise='pullup';expect(ids(upside)).toHaveLength(0);
  const result=getTwoPointMovementReview(fixture());
  expect(result.observations[0].cue).toMatch(/^If/);expect(result.limits.join(' ')).toMatch(/do not confirm which exercise/);
});

test('a rigid 3-D segment can foreshorten repeatedly while retaining a supported image-path strength',()=>{
  const r=fixture('pushup',2,24);
  const lengths:number[]=[];
  r.frames.forEach((f,n)=>{
    const i=n===64?32:n%32,phase=i<=24?i/24:(32-i)/8;
    const x=.2*(.1+.55*phase),y=-.1,z=Math.sqrt(.2**2-x*x-y*y);
    // Orthographic projection discards z. The real segment stays exactly .2
    // long, while the apparent length changes by more than the old 25% gate.
    expect(Math.hypot(x,y,z)).toBeCloseTo(.2,10);
    f.landmarks[13]={x:.4+x,y:.75+y,z,visibility:1};lengths.push(Math.hypot(x,y));
  });
  expect(Math.max(...lengths)/Math.min(...lengths)).toBeGreaterThan(1.25);
  const result=getTwoPointMovementReview(r);
  expect(result.observations).toHaveLength(0); // Tempo remains stricter.
  expect(result.strengths[0]?.id).toBe('pushup-forearm-rhythm');
  expect(result.strengths[0].observation).toMatch(/path in the image/);
  expect(result.limits.join(' ')).toMatch(/not proof.*3-D/);
});

test('gradual zoom or changed length/path profiles across cycles do not receive repeatability strengths',()=>{
  const zoom=fixture('pushup',2,24);
  zoom.frames.forEach((f,i)=>{
    const scale=1+i*.012;
    f.landmarks[13].x=.4+(f.landmarks[13].x-.4)*scale;
    f.landmarks[13].y=.75+(f.landmarks[13].y-.75)*scale;
  });
  expect(getTwoPointMovementReview(zoom).strengths.some(e=>e.id.endsWith('-rhythm'))).toBe(false);
  const changed=fixture('pushup',2,24);
  changed.frames.forEach((f,i)=>{
    if(i<=32)return;
    const scale=1+.35*Math.sin((i-32)*Math.PI/32);
    f.landmarks[13].x=.4+(f.landmarks[13].x-.4)*scale;
    f.landmarks[13].y=.75+(f.landmarks[13].y-.75)*scale;
  });
  expect(getTwoPointMovementReview(changed).strengths.some(e=>e.id.endsWith('-rhythm'))).toBe(false);
});

test('continuous moving episode supports only the visible anchor without claiming a phase or complete return',()=>{
  for(const exercise of ['pushup','pullup','squat'] as const) {
    const r=fixture(exercise);r.frames=r.frames.slice(0,25);
    const result=getMovementReview(r),segment=exercise==='squat'?'shin':'forearm';
    expect(result.observations).toHaveLength(0);expect(result.strengths[0]?.id).toBe(`${exercise}-${segment}-support`);
    expect(result.strengths[0].observation).toMatch(/similar image position/);
    expect(result.strengths[0].cue).toMatch(/^If/);
    expect(result.limits.join(' ')).toMatch(/not evidence of a completed rep/);
    expect(result.strengths[0].observation).not.toMatch(/flat|pressure|grip|lowering|correct/);
  }
});

test('static holds, unavailable endpoints and translated images cannot claim steady moving support',()=>{
  const hold=fixture();const initial=structuredClone(hold.frames[0].landmarks);hold.frames.forEach(f=>{f.landmarks=structuredClone(initial);});
  expect(getMovementReview(hold).strengths).toHaveLength(0);
  const missing=fixture();missing.frames.forEach(f=>{f.landmarks[15].visibility=0;});expect(getMovementReview(missing).strengths).toHaveLength(0);
  const pan=fixture();pan.frames.forEach((f,i)=>[13,15].forEach(id=>{f.landmarks[id].x+=i*.002;}));
  expect(getMovementReview(pan).strengths).toHaveLength(0);
  const noise=fixture();noise.frames.forEach((f,i)=>{f.landmarks=structuredClone(initial);f.landmarks[13].x+=(i%2?1:-1)*.002;});
  expect(getMovementReview(noise).strengths).toHaveLength(0);
});

test('equal movement tempo plus a five-second hold does not become a quicker-return correction',()=>{
  for(const position of [0,8,16,24]) {
    const r=fixture('pushup',1,16),hold=Array.from({length:20},()=>structuredClone(r.frames[position]));
    r.frames.splice(position+1,0,...hold);r.frames.forEach((f,i)=>{f.timestamp=i*.25;});
    expect(getTwoPointMovementReview(r).observations.some(e=>e.id==='pushup-forearm-tempo')).toBe(false);
  }
  expect(getTwoPointMovementReview(fixture('pushup',1,24)).observations.some(e=>e.id==='pushup-forearm-tempo')).toBe(true);
});
