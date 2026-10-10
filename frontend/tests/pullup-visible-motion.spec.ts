import {test,expect} from '@playwright/test';
import {getPullupVisibleMotion} from '../src/analysis/pullupVisibleMotion';
import {getMovementReview} from '../src/analysis/movementReview';
import {getCoachingReview,coachingReport} from '../src/analysis/coaching';
import {trustedCoachingCard} from '../src/analysis/coachingCards';
import {MOVEMENT_ANALYSIS_VERSION} from '../src/analysis/movementKnowledge';
import type {AnalysisReport,Landmark} from '../src/analysis/types';

// Independent world-coordinate translation projected into a fixed camera.
// These fixtures test observable-path logic, not model accuracy or good form.
function fixture():AnalysisReport {
  const frames=Array.from({length:33},(_,i)=>{
    const phase=i<=12?i/12:i<=24?(24-i)/12:0;
    const p:Landmark[]=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
    p[11]={x:.5,y:.54-.14*phase,z:0,visibility:1};
    p[23]={x:.5,y:.74-.14*phase,z:0,visibility:1};
    p[15]={x:.5,y:.15,z:0,visibility:1};
    return {timestamp:i*.25,landmarks:p,metrics:{elbow:null,knee:null,hip:null,bodyTilt:0,side:'left' as const,orientationMatches:true,orientation:'compatible' as const}};
  });
  return {id:'synthetic-return',exercise:'pullup',status:'partial',duration:8,width:640,height:640,sampledFrames:33,usableFrames:33,coverage:1,
    frames,findings:[],summary:'A visible supported movement.',limitations:[],sources:[],estimatedRepetitions:0,captureNotes:[]};
}
const result=(r:AnalysisReport)=>getPullupVisibleMotion(r);

test('a measured rise and coordinated return support a keep-doing cue without a complete-rep verdict',()=>{
  const r=fixture(),review=result(r);
  expect(review.observations).toHaveLength(0);expect(review.strengths[0]?.id).toBe('pullup-return-together');
  expect(review.strengths[0].support.frames).toBeGreaterThanOrEqual(8);
  expect(review.strengths[0].support.durationSeconds).toBeGreaterThanOrEqual(1.5);
  expect(review.strengths[0].timestamp).toBeGreaterThanOrEqual(2.5);
  expect(review.strengths[0].cue).toMatch(/hips and shoulders coming down together/);
  expect(review.limits.join(' ')).toMatch(/does not establish a full rep/);
  expect(r.status).toBe('partial');expect(r.estimatedRepetitions).toBe(0);
});

test('a static hang, a single upward movement and a drop without an observed rise do not count as coordinated returns',()=>{
  const hold=fixture();hold.frames.forEach(f=>{f.landmarks[11].y=.54;f.landmarks[23].y=.74;});expect(result(hold).strengths).toHaveLength(0);
  const upward=fixture();upward.frames=upward.frames.slice(0,13);expect(result(upward).strengths).toHaveLength(0);
  const downward=fixture();downward.frames=downward.frames.slice(12);expect(result(downward).strengths).toHaveLength(0);
});

test('moving the camera or zooming around the hand cannot manufacture body translation relative to its size',()=>{
  for(const kind of ['pan','zoom']) {
    const r=fixture(),initial=structuredClone(r.frames[0].landmarks);
    r.frames.forEach((f,i)=>{
      f.landmarks=structuredClone(initial);const phase=i<=12?i/12:i<=24?(24-i)/12:0;
      for(const id of [11,15,23]) {
        if(kind==='pan'){f.landmarks[id].x+=.1*phase;f.landmarks[id].y-=.14*phase;}
        else {f.landmarks[id].x=.5+(f.landmarks[id].x-.5)*(1-.3*phase);f.landmarks[id].y=.15+(f.landmarks[id].y-.15)*(1-.3*phase);}
      }
    });
    expect(result(r).strengths).toHaveLength(0);
  }
});

test('reaching with the hand while the torso stays still is not a supported pull-up return',()=>{
  const r=fixture();r.frames.forEach((f,i)=>{
    const phase=i<=12?i/12:i<=24?(24-i)/12:0;
    f.landmarks[11].y=.54;f.landmarks[23].y=.74;f.landmarks[15].y=.15+.14*phase;
  });expect(result(r).strengths).toHaveLength(0);
});

test('hidden hip, identity ambiguity, incompatible station and a cut at the turn all abstain',()=>{
  const hidden=fixture();hidden.frames.forEach(f=>{f.landmarks[23].visibility=.6;});expect(result(hidden).strengths).toHaveLength(0);
  const identity=fixture();identity.captureNotes=['Change of tracked person.'];expect(result(identity).strengths).toHaveLength(0);
  const multiple=fixture();multiple.captureNotes=['More than one person is visible.'];expect(result(multiple).strengths).toHaveLength(0);
  const incompatible=fixture();incompatible.frames.forEach(f=>{f.metrics!.orientationMatches=false;f.metrics!.orientation='incompatible';});expect(result(incompatible).strengths).toHaveLength(0);
  const wrong=fixture();wrong.exercise='pushup';expect(result(wrong).strengths).toHaveLength(0);
  const station=fixture();station.captureNotes=['The observed joints do not consistently establish the selected exercise.'];expect(result(station).strengths).toHaveLength(0);
  const gap=fixture();gap.frames[12].landmarks=[];expect(result(gap).strengths).toHaveLength(0);
});

test('uncoupled hip movement and an isolated tracking spike cannot earn a coordination strength',()=>{
  const hips=fixture();hips.frames.forEach(f=>{f.landmarks[23].y=.74;});expect(result(hips).strengths).toHaveLength(0);
  const spike=fixture();spike.frames.forEach(f=>{f.landmarks[11].y=.54;f.landmarks[23].y=.74;});
  spike.frames[12].landmarks[11].y-=.14;spike.frames[12].landmarks[23].y-=.14;expect(result(spike).strengths).toHaveLength(0);
});

test('horizontal mirror, image aspect and resolution preserve the measured coordination',()=>{
  const r=fixture(),mirror=structuredClone(r);mirror.frames.forEach(f=>f.landmarks.forEach(p=>{p.x=1-p.x;}));
  expect(result(mirror).strengths[0]?.id).toBe('pullup-return-together');
  const wide=structuredClone(r);wide.width=1280;wide.frames.forEach(f=>f.landmarks.forEach(p=>{p.x/=2;}));
  expect(result(wide).strengths[0]?.id).toBe('pullup-return-together');
  const large=structuredClone(r);large.width=large.height=1920;expect(result(large).strengths[0]?.id).toBe('pullup-return-together');
});

test('partial return evidence becomes a linked coaching strength without changing rep or status eligibility',()=>{
  const r=fixture(),movement=getMovementReview(r),coaching=getCoachingReview(r);
  expect(movement.strengths[0].id).toBe('pullup-return-together');
  expect(coaching.focus.kind).toBe('strength');expect(coaching.focus.detected).toBe(true);
  expect(coaching.moments[0].endTimestamp).toBeGreaterThan(coaching.moments[0].timestamp);
  expect(coaching.spokenText).toContain('hips and shoulders coming down together');
  expect(coaching.uncertainty).toContain('a full rep and shoulder position remain separate questions');
  const saved=coachingReport(r,coaching);
  expect(saved.findings[0].id).toBe('pullup-return-together');
  expect(saved.analysisVersion).toBe(MOVEMENT_ANALYSIS_VERSION);
  expect(saved.status).toBe('partial');expect(saved.estimatedRepetitions).toBe(0);
  expect(trustedCoachingCard('pullup',coaching.focus.id)?.cue).toBe(coaching.focus.cue);
  expect(trustedCoachingCard('pushup',coaching.focus.id)).toBeNull();
});

test('a health check-in takes priority over the linked return strength',()=>{
  const coaching=getCoachingReview(fixture(),{goal:'comfortable',variant:'standard',discomfort:'instability'});
  expect(coaching.safetyFirst).toBe(true);expect(coaching.moments).toHaveLength(0);
  expect(coaching.focus.detected).toBe(false);expect(coaching.spokenText).toMatch(/physiotherapist|clinician/);
  expect(coaching.spokenText).not.toContain('next comfortable attempt');
});
