import type { ExerciseId } from '../game/types';
import type { AnalysisReport, EvidenceFrame, FrameMetrics, JointAngles, Landmark, Side } from './types';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
export const visible = (p: Landmark | undefined) => !!p && p.visibility >= .55 && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > .005 && p.x < .995 && p.y > .005 && p.y < .995;
const sides = { left: [11,13,15,23,25,27], right: [12,14,16,24,26,28] } as const;
type Metric = keyof JointAngles;
const number = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const percentile = (values: number[], fraction: number) => [...values].sort((a,b)=>a-b)[Math.round((values.length-1)*fraction)];

// Image-plane angles need aspect correction. Neither axis is physical depth.
export function angle(a: Landmark,b: Landmark,c: Landmark,aspect: number): number {
  const u=[(a.x-b.x)*aspect,a.y-b.y],v=[(c.x-b.x)*aspect,c.y-b.y],size=Math.hypot(...u)*Math.hypot(...v);
  return size<1e-7 ? NaN : Math.acos(clamp((u[0]*v[0]+u[1]*v[1])/size))*180/Math.PI;
}
export function measure(p: Landmark[],exercise: ExerciseId,width: number,height: number): FrameMetrics | null {
  if(p.length!==33 || width<=0 || height<=0)return null;
  const aspect=width/height;
  const chain=(a:number,b:number,c:number):number|null=>{
    if(![a,b,c].every(i=>visible(p[i])))return null;
    const value=angle(p[a],p[b],p[c],aspect);return Number.isFinite(value)?value:null;
  };
  const left:JointAngles={elbow:chain(11,13,15),knee:chain(23,25,27),hip:chain(11,23,27)};
  const right:JointAngles={elbow:chain(12,14,16),knee:chain(24,26,28),hip:chain(12,24,28)};
  const primary:Metric=exercise==='squat'?'knee':'elbow';
  const quality=(side:Side)=>{
    const ids=sides[side],required=primary==='knee'?[ids[3],ids[4],ids[5]]:[ids[0],ids[1],ids[2]];
    return Math.min(...required.map(i=>visible(p[i])?p[i].visibility:0));
  };
  const side:Side=quality('left')>=quality('right')?'left':'right';
  const [s,,w,h,,a]=sides[side];
  const bodyTilt=visible(p[s])&&visible(p[h])?Math.atan2(Math.abs((p[h].x-p[s].x)*aspect),Math.abs(p[h].y-p[s].y))*180/Math.PI:null;
  const visibleJoints=Array.from({length:33},(_,i)=>i).filter(i=>visible(p[i]));
  if(visibleJoints.filter(i=>i>=11).length<3)return null;
  const wristAbove=visible(p[w])&&visible(p[s])&&p[w].y<p[s].y-.025;
  const wristBelow=visible(p[w])&&visible(p[s])&&p[w].y>p[s].y+.015;
  const feetBelow=visible(p[a])&&visible(p[h])&&p[a].y>p[h].y+.06;
  let orientation:FrameMetrics['orientation']='uncertain';
  if(exercise==='pullup'){
    if(wristAbove && (bodyTilt===null||bodyTilt<70))orientation='compatible';
    else if(number(bodyTilt)&&bodyTilt>65&&wristBelow)orientation='incompatible';
  }else if(exercise==='pushup'){
    if(number(bodyTilt)&&bodyTilt>40&&wristBelow)orientation='compatible';
    else if(wristAbove || (number(bodyTilt)&&bodyTilt<25&&feetBelow&&visible(p[w])&&visible(p[h])&&p[w].y>p[h].y-.08))orientation='incompatible';
  }else{
    if(feetBelow && (bodyTilt===null||bodyTilt<75) && !wristAbove)orientation='compatible';
    else if(wristAbove || (number(bodyTilt)&&bodyTilt>75))orientation='incompatible';
  }
  return {...(side==='left'?left:right),bodyTilt,side,orientationMatches:orientation==='compatible',orientation,sides:{left,right},visibleJoints};
}

// A consistent set-level side avoids turning alternating left/right estimates into false cycles.
export function stabilizeFrames(frames:EvidenceFrame[],exercise:ExerciseId):EvidenceFrame[]{
  const metric:Metric=exercise==='squat'?'knee':'elbow';
  const score=(side:Side)=>frames.reduce((total,f)=>total+(number(f.metrics?.sides?.[side][metric])?1:0),0);
  const side:Side=score('left')>=score('right')?'left':'right';
  return frames.map(f=>f.metrics?.sides?{...f,metrics:{...f.metrics,...f.metrics.sides[side],side}}:f);
}

export function countCycles(frames:EvidenceFrame[],metric:'knee'|'elbow',exercise?:ExerciseId):number{
  const valid=frames.filter(f=>f.metrics?.orientationMatches&&number(f.metrics[metric]));
  if(valid.length<8)return 0;
  const values=valid.map(f=>f.metrics![metric] as number),lo=percentile(values,.1),hi=percentile(values,.9);
  if(hi-lo<28)return 0;
  const low=lo+(hi-lo)*.25,high=hi-(hi-lo)*.25;
  let state:'start'|'high'|'low'='start',count=0,last=-Infinity,start:EvidenceFrame|null=null,bottom:EvidenceFrame|null=null;
  let origin:'high'|'low'='high';
  for(const f of frames){
    const m=f.metrics;
    if(!m?.orientationMatches||!number(m[metric])){if(f.timestamp-last>.8)state='start';continue;}
    if(f.timestamp-last>.8)state='start';last=f.timestamp;
    const value=m[metric];
    const extreme=value>=high?'high':value<=low?'low':null;
    if(state==='start'&&extreme){state=extreme;origin=extreme;start=f;bottom=null;}
    else if(extreme&&extreme!==origin&&!bottom){state=extreme;bottom=f;}
    else if(extreme===origin&&bottom){
      let realExcursion=!!start&&f.timestamp-start.timestamp>=.7;
      if(exercise==='pullup'&&start&&bottom){
        const ids=sides[m.side],s=ids[0],w=ids[2],a=start.landmarks,b=bottom.landmarks,c=f.landmarks;
        // Reaching for a bar is not a pull-up: hand stays anchored while shoulder rises.
        realExcursion=realExcursion&&[a[s],a[w],b[s],b[w],c[w]].every(visible)
          && Math.abs(a[w].y-b[w].y)<.08 && Math.abs(c[w].y-b[w].y)<.08 && (origin==='high'?a[s].y-b[s].y:b[s].y-a[s].y)>.035;
      }
      if(realExcursion)count++;state=origin;start=f;bottom=null;
    }
  }
  return count;
}

function captureNotes(frames:EvidenceFrame[],exercise:ExerciseId):string[]{
  const poses=frames.filter(f=>f.landmarks.length===33);if(!poses.length)return ['No stable body landmarks were found. Keep the relevant joints in view, improve lighting, and avoid placing the camera extremely close.'];
  const visibility=(ids:number[])=>poses.filter(f=>ids.some(i=>visible(f.landmarks[i]))).length/poses.length;
  const notes:string[]=[];
  if(poses.length/Math.max(1,frames.length)<.7){
    let longest:EvidenceFrame[]=[],run:EvidenceFrame[]=[];
    for(const frame of frames){if(!frame.landmarks.length){run.push(frame);if(run.length>longest.length)longest=[...run];}else run=[];}
    if(longest.length>2)notes.push(`Body tracking drops out from ${longest[0].timestamp.toFixed(1)}s to ${longest[longest.length-1].timestamp.toFixed(1)}s. Observations from other moments do not describe that missing portion. Check whether the working joints leave the frame, become hidden, or merge into a bright or dark background during that interval.`);
  }
  if(visibility([11,12])<.65)notes.push('Your shoulders are missing or obscured in much of this view. Move the camera back or tilt it slightly upward so the shoulder stays visible through the top of the movement.');
  if(visibility([15,16])<.65)notes.push('The wrists or hands are frequently out of view. Widen the frame to include the hands and, for pull-ups, the bar.');
  if(visibility([23,24])<.65)notes.push('The hip is difficult to locate in this recording. Leave more space around the torso; dark clothing and backlighting can reduce tracking.');
  if(visibility([27,28])<.65)notes.push(exercise==='squat'?'The feet or ankles are often hidden. Tilt the camera down slightly or step farther back to include the floor.':'The ankles are outside or obscured in this view. Arm observations can still be useful, but I cannot assess a shoulder–hip–ankle line or lower-body movement.');
  if(visibility([0])<.4)notes.push('The head is often cropped or turned away. That does not invalidate visible arm or leg measurements, but head position cannot be assessed.');
  const broad=poses.filter(f=>visible(f.landmarks[11])&&visible(f.landmarks[12])&&visible(f.landmarks[23])&&Math.abs(f.landmarks[11].x-f.landmarks[12].x)>Math.abs(f.landmarks[11].y-f.landmarks[23].y)*.6).length/poses.length;
  if(broad>.4)notes.push('This appears more frontal or oblique than a pure side view. Projected bend angles can hide depth; compare clips from a similar angle and use a second view for depth questions.');
  return notes;
}

export function summarize(input:EvidenceFrame[],exercise:ExerciseId,duration:number,width:number,height:number):AnalysisReport{
  const frames=stabilizeFrames(input,exercise),metric:'knee'|'elbow'=exercise==='squat'?'knee':'elbow';
  const poseFrames=frames.filter(f=>f.landmarks.length===33).length;
  const measurable=frames.filter(f=>number(f.metrics?.[metric])),valid=measurable.filter(f=>f.metrics!.orientationMatches);
  const coverage=frames.length?measurable.length/frames.length:0,repetitions=countCycles(frames,metric,exercise);
  const usable=valid.length>=8&&repetitions>0;
  const available=frames.filter(f=>f.metrics&&(['elbow','knee','hip'] as const).some(k=>number(f.metrics![k])));
  const incompatible=measurable.length>0&&measurable.filter(f=>f.metrics!.orientation==='incompatible').length/measurable.length>.7;
  const status:AnalysisReport['status']=usable?'usable':available.length>=3&&!incompatible?'partial':'insufficient';
  const notes=captureNotes(frames,exercise);
  const report:AnalysisReport={id:crypto.randomUUID(),exercise,status,duration,width,height,sampledFrames:frames.length,usableFrames:measurable.length,coverage,poseFrames,
    frames,findings:[],estimatedRepetitions:usable?repetitions:0,captureNotes:notes,
    measurementCoverage:Object.fromEntries((['elbow','knee','hip'] as const).map(k=>[k,frames.filter(f=>number(f.metrics?.[k])).length/Math.max(1,frames.length)])) as AnalysisReport['measurementCoverage'],
    summary:usable?`I followed ${repetitions} visible movement ${repetitions===1?'cycle':'cycles'} using the joints I could see. Here are the moments worth reviewing.`
      :status==='partial'?'There are some useful body-position observations here. They may include setup or rest positions; I cannot confirm a complete exercise cycle from this view.'
        :incompatible?'The visible position does not consistently match this station. Here is what I can observe; check that you selected the intended exercise.'
          :poseFrames?'I found a person in parts of this recording, but not enough clearly visible joint chains for reliable angle observations.':'I could not reliably locate body joints in this recording. I cannot infer form from missing landmarks.',
    limitations:['Each observation only concerns joints actually visible at its timestamp. Hidden or off-screen joints are not treated as measured.',
      'These are projected camera-view angles, not physical 3D joint measurements or a form-quality score. Front, oblique and low camera angles change their appearance.',
      'Motion cycles are exploratory estimates. They do not prove a full repetition, correct technique or safe range.',
      'I cannot diagnose pain, choose a safe load, or determine precise shoulder rotation from this footage.'],
    sources:[{title:'Body landmark method · Google MediaPipe',url:'https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker'},exercise==='pushup'?{title:'Push-up technique reference · NASM',url:'https://www.nasm.org/resource-center/exercise-library/push-up'}:exercise==='squat'?{title:'Squat technique reference · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/'}:{title:'Pull-up technique reference · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/'}]};
  const observed=measurable.filter(f=>f.metrics!.orientation!=='incompatible');
  if(observed.length>=3){
    const values=observed.map(f=>f.metrics![metric] as number),low=percentile(values,.1),high=percentile(values,.9);
    const near=(target:number)=>observed.reduce((a,b)=>Math.abs((b.metrics![metric] as number)-target)<Math.abs((a.metrics![metric] as number)-target)?b:a);
    const bent=near(low),extended=near(high),joint=metric==='knee'?'knee':'elbow';
    report.findings.push({id:'range',title:`Your visible ${joint} bend`,timestamp:bent.timestamp,
      observation:`At ${bent.timestamp.toFixed(1)}s, the visible ${bent.metrics!.side} ${joint} has a projected angle of about ${Math.round(bent.metrics![metric] as number)}°. The middle 80% of measurable samples span roughly ${Math.round(low)}–${Math.round(high)}°; missing parts of the movement are excluded.`,
      suggestion:exercise==='squat'?'Watch how your hips and knees bend together here. Compare the overlay to the video before using it; this view alone does not tell me your appropriate squat depth.':'Check that the shoulder, elbow and wrist dots sit on the visible arm. Compare this position with the more extended moment; I am not suggesting that you push beyond your comfortable range.'});
    if(high-low>=10)report.findings.push({id:'return',title:'Compare the more extended position',timestamp:extended.timestamp,
      observation:`The visible ${joint} appears more extended here, around ${Math.round(extended.metrics![metric] as number)}°. ${usable?'The visible sequence includes a bend and return.':'The recording does not establish a reliable complete cycle, so this is a position comparison.'}`,
      suggestion:exercise==='pullup'?'Watch whether the shoulder moves upward while the hand stays at the bar, then lowers under control. Reaching up, gripping the bar or bending the legs is not counted as a completed pull-up.':exercise==='squat'?'Compare the ascent and descent: do your hips and torso rise together? Keep the reference video angle similar; projected knee angles cannot establish knee alignment in depth.':'Watch whether your shoulders and hips move together through the transition. A second, wider view will help if the upper position leaves the frame.'});
  }
  const bodyLine=frames.filter(f=>number(f.metrics?.hip)&&f.metrics?.orientation!=='incompatible');
  if(exercise==='pushup'&&bodyLine.length>=3){const ordered=[...bodyLine].sort((a,b)=>(a.metrics!.hip as number)-(b.metrics!.hip as number)),f=ordered[Math.floor(ordered.length*.1)];report.findings.push({id:'body-line',title:'A visible body-line checkpoint',timestamp:f.timestamp,observation:`The visible shoulder–hip–ankle line has a projected angle of about ${Math.round(f.metrics!.hip as number)}° here. Perspective and tracking can change this angle.`,suggestion:'Use the overlay to inspect whether the hips move with the shoulders. If the dots do not match your body, disregard the measurement; it is not proof of a fault.'});}
  if(!report.findings.length)report.findings.push({id:'visibility',title:poseFrames?'What was visible':'Let’s make the next view useful',timestamp:frames.find(f=>f.metrics)?.timestamp??0,observation:`Body landmarks were detected in ${poseFrames} of ${frames.length} samples; ${measurable.length} samples had a measurable ${metric}.`,suggestion:notes[0]??'Keep the working joints in view through the whole movement. A second camera angle may answer questions this view cannot.'});
  if(notes.length)report.findings.push({id:'capture',title:'What this camera view leaves uncertain',timestamp:observed[0]?.timestamp??frames.find(f=>f.landmarks.length)?.timestamp??0,observation:notes.join(' '),suggestion:'Keep the useful observations from this clip. A wider or second view is optional for the parts I could not see; you do not need a perfect setup to start reviewing.'});
  return report;
}
