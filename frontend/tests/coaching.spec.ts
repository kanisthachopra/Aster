import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {getCoachingReview,getCoachingMoment,localCoachingReply,coachingReport} from '../src/analysis/coaching';
import {DEFAULT_COACHING_CONTEXT} from '../src/analysis/coachingContext';
import type {AnalysisReport,Landmark} from '../src/analysis/types';

function report(wave=false):AnalysisReport {
 const frames=Array.from({length:33},(_,i)=>{
  const phase=Math.sin(i*.25*Math.PI/2),landmarks:Landmark[]=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
  for(const [id,x,y] of [[11,.2,.38+.06*phase],[13,.24,.51],[15,.2,.7],[23,.5,.5+(wave?-.065:.033)*phase],[25,.65,.57],[27,.8,.62]])landmarks[id]={x,y,z:0,visibility:1};
  return {timestamp:i*.25,landmarks,metrics:{elbow:100,knee:null,hip:170,bodyTilt:70,side:'left' as const,orientationMatches:true,orientation:'compatible' as const}};
 });
 return {id:'independent-coaching-test',exercise:'pushup',status:'usable',duration:8,width:640,height:640,sampledFrames:33,usableFrames:33,coverage:1,poseFrames:33,frames,findings:[{id:'range',title:'Measurement',timestamp:1,observation:'Projected elbow angle is 100°',suggestion:'Compare angles.'}],summary:'Technical summary',limitations:[],sources:[],estimatedRepetitions:1,captureNotes:[]};
}
test('a sustained observed pattern becomes an action and purpose linked to its actual frames',()=>{
 const input=report(true),before=JSON.stringify(input),review=getCoachingReview(input);
 expect(review.focus.id).toBe('pushup-timing');expect(review.focus.detected).toBe(true);
 expect(review.focus.cue).toMatch(/slower rep.*hips and shoulders moving together/);
 expect(review.focus.why).toMatch(/steady/);expect(review.moments[0].endTimestamp).toBeGreaterThan(review.moments[0].timestamp);
 expect(input.frames.some(frame=>frame.timestamp===review.moments[0].timestamp)).toBe(true);
 expect(review.spokenText).not.toMatch(/projected|degrees|°|your form is correct|muscle activation|—/i);
 expect(JSON.stringify(input)).toBe(before);
 const saved=coachingReport(input,review);expect(saved.findings[0].id).toBe('pushup-timing');expect(saved.findings[0].suggestion).toContain(review.focus.why);
});
test('general practice guidance is explicitly separate from a detected fault',()=>{
 const input=report();input.frames.forEach(frame=>frame.landmarks.forEach(point=>{if(point.visibility)point.y=.5;}));const review=getCoachingReview(input);
 expect(review.moments).toHaveLength(0);expect(review.focus.detected).toBe(false);
 expect(review.focus.observation).toMatch(/not a fault/);expect(review.summary).toContain('don’t have a specific correction');
 expect(getCoachingMoment(input,input.findings[0])).toBeNull();
 expect(localCoachingReply(review,DEFAULT_COACHING_CONTEXT,'Why does that help?')).toContain('not claiming I saw that fault');
});
test('a supported coordination strength is specific feedback rather than a generic fallback',()=>{
 const review=getCoachingReview(report());
 expect(review.focus.kind).toBe('strength');expect(review.focus.detected).toBe(true);expect(review.moments.length).toBeGreaterThan(0);
 expect(review.spokenText).toContain('visible section');expect(review.spokenText).not.toContain('I don’t have a specific correction');
 expect(coachingReport(report(),review).knowledgeVersion).toBe('1.1.0');
});
test('missing shoulders or an interrupted track gives concrete capture help, not an invented correction',()=>{
 const input=report(true);input.status='partial';input.captureNotes=['Your shoulders are missing or obscured in much of this view.'];input.frames.forEach(frame=>frame.landmarks=[]);
 const review=getCoachingReview(input);expect(review.moments).toHaveLength(0);expect(review.uncertainty).toContain('shoulders');
 input.status='insufficient';expect(getCoachingReview(input).focus.cue).toContain('Move the camera back or tilt it up');
 input.captureNotes=['The tracked body shifts abruptly between sampled frames.'];expect(getCoachingReview(input).focus.cue).toContain('camera still and one person');
});
test('pain and recurrent instability override generic cues and rep prescriptions',()=>{
 const context={...DEFAULT_COACHING_CONTEXT,discomfort:'instability' as const},review=getCoachingReview(report(true),context);
 expect(review.safetyFirst).toBe(true);expect(review.moments).toHaveLength(0);expect(review.spokenText).toContain('physiotherapist');
 expect(review.sources[0].url).toContain('orthoinfo');expect(review.focus.cue).not.toMatch(/six|6 reps|ceiling|lock your shoulder/i);
 const normal=getCoachingReview(report(true));
 expect(localCoachingReply(normal,DEFAULT_COACHING_CONTEXT,'That felt painful')).toContain('stop the set');
 expect(localCoachingReply(normal,DEFAULT_COACHING_CONTEXT,'My shoulder keeps slipping out')).toContain('assessment');
 expect(localCoachingReply(normal,DEFAULT_COACHING_CONTEXT,'How many reps?')).toContain('can’t choose your rep count');
 expect(localCoachingReply(normal,DEFAULT_COACHING_CONTEXT,'Should I look up at the ceiling?')).toContain('instead of forcing your neck');
});
test('goals alter the next step without inventing loads or a safety judgment',()=>{
 expect(getCoachingReview(report(),{...DEFAULT_COACHING_CONTEXT,goal:'strength'}).spokenText).toContain('can’t choose your load');
 expect(getCoachingReview(report(),{...DEFAULT_COACHING_CONTEXT,goal:'comfortable'}).spokenText).toContain('tell me how this felt');
});
test('cached public video stays plain and every correction is tied to a measured sample',()=>{
 const path='artifacts/analysis/real-pushup-report.json';test.skip(!existsSync(path),'Optional previously inferred public fixture.');
 const input=JSON.parse(readFileSync(path,'utf8')) as AnalysisReport,review=getCoachingReview(input);
 expect(review.spokenText).not.toMatch(/°|projected|percentile|your form is correct/i);
 for(const moment of review.moments)expect(input.frames.some(frame=>frame.timestamp===moment.timestamp)).toBe(true);
 if(!review.moments.length)expect(review.focus.detected).toBe(false);
});
