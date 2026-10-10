import { test, expect } from '@playwright/test';
import { getMovementReview } from '../src/analysis/movementReview';
import type { AnalysisReport, Landmark } from '../src/analysis/types';

// These independent synthetic image-plane sequences test detector mechanics.
// They are not clinical form labels or validation of the underlying pose model.
function fixture(exercise: AnalysisReport['exercise'], kind = 'together'): AnalysisReport {
  const frames = Array.from({ length: 33 }, (_, i) => {
    const t = i * .25, phase = Math.sin(t * Math.PI / 2), p: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
    let joints: number[][];
    if (exercise === 'pushup') joints = [[11,.2,.38 + .06 * phase],[13,.24,.51],[15,.2,.7],[23,.5,(kind === 'bend' ? .67 : .5) + (kind === 'wave' ? -.065 : .033) * phase],[25,.65,.57],[27,.8,.62]];
    else if (exercise === 'squat') joints = [[11,.45,.25+.06*phase],[13,.52,.4],[15,.55,.45],[23,.5,.55+(kind === 'wave'?-.06:.06)*phase],[25,.62,.72],[27,.53,.9]];
    else {
      const y = kind === 'fast-down' ? (i <= 25 ? .5 - .2 * i / 25 : .3 + .2 * (i - 25) / 7) : .4 + .1 * Math.cos(t * Math.PI / 4);
      const x = kind === 'swing' ? .11 * phase : 0;
      joints = [[11,.5+x,y],[13,.55+x,y-.08],[15,.5,.12],[23,.5+x,y+.28],[25,.5+x,y+.38],[27,.5+x,y+.45]];
    }
    for (const [id,x,y] of joints) p[id] = { x,y,z:0,visibility:1 };
    return { timestamp:t,landmarks:p,metrics:{elbow:100,knee:110,hip:170,bodyTilt:exercise==='pushup'?70:15,side:'left' as const,orientationMatches:true,orientation:'compatible' as const} };
  });
  return {id:'synthetic-only',exercise,status:'usable',duration:8,width:640,height:640,frames,sampledFrames:frames.length,usableFrames:frames.length,coverage:1,findings:[],summary:'Visible exercise sequence.',limitations:[],sources:[],estimatedRepetitions:1,captureNotes:[]};
}
const ids = (r: AnalysisReport) => getMovementReview(r).observations.map(e=>e.id);

test('sustained push-up wave and low hip position produce separate bounded observations',()=>{
  expect(ids(fixture('pushup','wave'))).toContain('pushup-timing');
  const r=getMovementReview(fixture('pushup','bend'));
  expect(r.observations.map(e=>e.id)).toContain('pushup-hip-position');
  const e=r.observations.find(e=>e.id==='pushup-hip-position')!;
  expect(e.support.frames).toBeGreaterThanOrEqual(6);expect(e.endTimestamp-e.timestamp).toBeGreaterThanOrEqual(.75);
  expect(e.why).toMatch(/body line steady/i);expect(r.limits.join(' ')).toMatch(/camera angle/i);expect(e.observation).not.toMatch(/weak|injur|unsafe|muscle/i);
});

test('coordinated visible movement can receive a narrow strength, never a full form verdict',()=>{
  const r=getMovementReview(fixture('pushup'));
  expect(r.observations).toHaveLength(0);expect(r.strengths[0]?.id).toBe('pushup-together');
  expect(r.strengths[0].why).toMatch(/coordinate and repeat/);expect(r.limits.join(' ')).toMatch(/not an all-clear/);expect(r.practiceTip.title).toBe('General practice tip');
});

test('squat timing and strict-pull-up swing are conditional observational cues',()=>{
  expect(ids(fixture('squat','wave'))).toContain('squat-timing');
  const r=getMovementReview(fixture('pullup','swing'));
  const swing=r.observations.find(e=>e.id==='pullup-swing');expect(swing).toBeDefined();
  expect(swing!.cue).toMatch(/If.*strict/);expect(swing!.why).toMatch(/repeatable.*momentum/);expect(r.limits.join(' ')).toMatch(/cannot tell whether you intended/);
});

test('lowering timing requires a visible top and both endpoints, not a clipped phase',()=>{
  const r=fixture('pullup','fast-down');expect(ids(r)).toContain('pullup-descent');
  const result=getMovementReview(r);
  expect(result.observations.find(e=>e.id==='pullup-descent')!.why).toMatch(/practice controlling the return/);
  expect(result.limits.join(' ')).toMatch(/does not prove.*lost control/);
  r.frames=r.frames.slice(23);expect(ids(r)).not.toContain('pullup-descent');
});

test('continuous multi-rep runs retain complete local lowering windows',()=>{
  const r=fixture('pullup','fast-down');
  expect(ids(r)).toContain('pullup-descent');
  const second=structuredClone(r.frames.slice(1));second.forEach(f=>{f.timestamp+=8;});
  r.frames.push(...second);r.duration=16;r.estimatedRepetitions=2;
  const result=getMovementReview(r).observations.find(e=>e.id==='pullup-descent');
  expect(result).toBeDefined();expect(result!.timestamp).toBe(14.25);expect(result!.endTimestamp).toBe(16);
  expect(result!.support.frames).toBe(8);
});

test('local lowering windows distinguish steady and varying timing without joining clipped endpoints',()=>{
  const steady=fixture('pullup');
  expect(ids(steady)).not.toContain('pullup-descent');
  const varied=fixture('pullup');
  const fast=fixture('pullup','fast-down').frames.slice(1);
  fast.forEach(f=>{f.timestamp+=8;});varied.frames.push(...fast);varied.duration=16;
  expect(getMovementReview(varied).observations.find(e=>e.id==='pullup-descent')!.timestamp).toBe(14.25);
  const clipped=fixture('pullup','fast-down');clipped.frames=clipped.frames.slice(0,28);
  expect(ids(clipped)).not.toContain('pullup-descent');
  const interrupted=fixture('pullup','fast-down');interrupted.frames[25].landmarks=[];
  expect(ids(interrupted)).not.toContain('pullup-descent');
});

test('small tracking noise does not fabricate local reps and a tracking spike cannot supply a top',()=>{
  const noisy=fixture('pullup');
  noisy.frames.forEach((f,i)=>[11,23].forEach(id=>{f.landmarks[id].y+=(i%2?1:-1)*.002;}));
  expect(ids(noisy)).not.toContain('pullup-descent');
  const fast=fixture('pullup','fast-down');
  fast.frames.forEach((f,i)=>[11,23].forEach(id=>{f.landmarks[id].y+=(i%2?1:-1)*.002;}));
  expect(ids(fast)).toContain('pullup-descent');
  const flat=fixture('pullup');flat.frames.forEach(f=>{f.landmarks[11].y=.5;f.landmarks[23].y=.78;});
  flat.frames[25].landmarks[11].y-=.2;flat.frames[25].landmarks[23].y-=.2;
  expect(ids(flat)).not.toContain('pullup-descent');
});

test('known limitation: different speeds in the same direction do not count as opposite-direction timing',()=>{
  const r=fixture('squat');
  r.frames.forEach((f,i)=>{
    const phase=Math.sin(i*.25*Math.PI/2);
    f.landmarks[11].y=.25+.015*phase;
    f.landmarks[23].y=.55+.1*phase;
  });
  expect(ids(r)).not.toContain('squat-timing');
});

test('hidden chains, single-frame spikes, gaps, uncertain identity and wrong stations abstain',()=>{
  const hidden=fixture('pushup','wave');hidden.frames.forEach(f=>f.landmarks[23].visibility=.2);expect(ids(hidden)).toHaveLength(0);
  const spike=fixture('pushup');spike.frames[15].landmarks[23].y+=.25;expect(ids(spike)).toHaveLength(0);
  const gapped=fixture('pushup','wave');gapped.frames.forEach((f,i)=>{if(i%4===0)f.landmarks=[];});expect(ids(gapped)).toHaveLength(0);
  const jump=fixture('pushup','wave');jump.captureNotes=['The tracked body shifts abruptly between sampled frames.'];expect(ids(jump)).toHaveLength(0);
  const wrong=fixture('squat','wave');wrong.frames.forEach(f=>{f.metrics.orientationMatches=false;f.metrics.orientation='incompatible' as never;});expect(ids(wrong)).toHaveLength(0);
});

test('horizontal mirror, frame scaling, resolution and simple camera pan preserve physical comparisons',()=>{
  const original=fixture('pushup','wave'), expected=ids(original);
  const mirror=structuredClone(original);mirror.frames.forEach(f=>f.landmarks.forEach(p=>{p.x=1-p.x;}));expect(ids(mirror)).toEqual(expected);
  const resized=structuredClone(original);resized.width=1920;resized.height=1920;expect(ids(resized)).toEqual(expected);
  const small=structuredClone(original);small.frames.forEach(f=>f.landmarks.forEach(p=>{p.x=.2+.6*p.x;p.y=.2+.6*p.y;}));expect(ids(small)).toEqual(expected);
  const wide=structuredClone(original);wide.width=1280;wide.frames.forEach(f=>f.landmarks.forEach(p=>{p.x=p.x/2+.2;}));expect(ids(wide)).toEqual(expected);
  const pan=structuredClone(original);pan.frames.forEach((f,i)=>f.landmarks.forEach(p=>{p.x+=i*.001;p.y+=i*.001;}));expect(ids(pan)).toEqual(expected);
});

test('no observations remain useful practice advice without presenting absence as correct form',()=>{
  const r=fixture('squat');r.frames=[];r.status='partial';const result=getMovementReview(r);
  expect(result.observations).toHaveLength(0);expect(result.strengths).toHaveLength(0);
  expect(result.practiceTip.why).toMatch(/not a fault detected/);expect(result.limits.length).toBeGreaterThan(0);
});

test('partial status can retain a sustained visible section, while frontal geometry avoids body-line verdicts',()=>{
  const partial=fixture('pushup','wave');partial.status='partial';partial.estimatedRepetitions=0;
  expect(ids(partial)).toContain('pushup-timing');expect(partial.status).toBe('partial');expect(partial.estimatedRepetitions).toBe(0);
  const frontal=fixture('pushup','wave');frontal.frames.forEach(f=>{
    f.landmarks[12]={...f.landmarks[11],x:f.landmarks[11].x+.4};
    f.landmarks[24]={...f.landmarks[23],x:f.landmarks[23].x+.3};
  });
  const result=getMovementReview(frontal);expect(result.observations).toHaveLength(0);expect(result.strengths).toHaveLength(0);
  expect(result.limits.join(' ')).toMatch(/front-facing/);
});
