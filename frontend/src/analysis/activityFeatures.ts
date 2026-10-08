import type {EvidenceFrame,Landmark} from './types';

// Features describe visible image-plane motion, not body type or correct form.
// Each joint retains one left/right index across the clip. Missing joints contribute
// no inferred geometry; explicit coverage features distinguish missing evidence.
export const ACTIVITY_POSE_FEATURE_NAMES = [
  'shoulderCoverage','wristCoverage','hipCoverage','ankleCoverage',
  'shoulderExcursion','wristExcursion','hipExcursion','ankleExcursion',
  'handAnchorContrast','footAnchorContrast',
  'wristShoulderY10','wristShoulderY50','wristShoulderY90','wristShoulderCoverage',
  'elbowShoulderY50','elbowShoulderCoverage','ankleHipY50','ankleHipCoverage',
  'torsoTilt50','torsoTilt90','torsoCoverage','trackingJumpFraction','maximumTrackingJump',
  'peakHandAnchoredBodyMotion','peakFootAnchoredBodyMotion',
] as const;
const valid=(p:Landmark|undefined):p is Landmark=>!!p&&p.visibility>=.55&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>.005&&p.x<.995&&p.y>.005&&p.y<.995;
const quantile=(a:number[],q:number)=>a.length?[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*q)]:0;
const bounded=(v:number,max=1)=>Math.max(-max,Math.min(max,v));
export function extractActivityPoseFeatures(frames:EvidenceFrame[],width:number,height:number):number[]{
  const aspect=width>0&&height>0?width/height:1,n=Math.max(1,frames.length);
  const choose=(a:number,b:number)=>frames.filter(f=>valid(f.landmarks[a])).length>=frames.filter(f=>valid(f.landmarks[b])).length?a:b;
  const pairCoverage=(a:number,b:number)=>frames.filter(f=>valid(f.landmarks[a])&&valid(f.landmarks[b])).length;
  const torsoSide=pairCoverage(11,23)>=pairCoverage(12,24)?0:1;
  const shoulder=11+torsoSide,hip=23+torsoSide,wrist=choose(15,16),ankle=choose(27,28),elbow=choose(13,14);
  const lengths:number[]=[],tilts:number[]=[];
  for(const f of frames){const s=f.landmarks[shoulder],h=f.landmarks[hip];if(valid(s)&&valid(h)){const dx=(s.x-h.x)*aspect,dy=s.y-h.y;lengths.push(Math.hypot(dx,dy));tilts.push(Math.atan2(Math.abs(dx),Math.abs(dy))/(Math.PI/2));}}
  const reference=quantile(lengths,.5),hasScale=reference>=.025;
  const excursion=(index:number)=>{const p=frames.map(f=>f.landmarks[index]).filter(valid);if(!hasScale||p.length<4)return 0;const x=p.map(j=>j.x*aspect),y=p.map(j=>j.y);return Math.hypot(quantile(x,.9)-quantile(x,.1),quantile(y,.9)-quantile(y,.1))/reference;};
  const ids=[shoulder,wrist,hip,ankle],coverage=ids.map(i=>frames.filter(f=>valid(f.landmarks[i])).length/n),movement=ids.map(excursion);
  const pair=(a:number,b:number)=>frames.flatMap(f=>{const p=f.landmarks[a],q=f.landmarks[b];return hasScale&&valid(p)&&valid(q)?[(p.y-q.y)/reference]:[];});
  const hand=pair(wrist,shoulder),arm=pair(elbow,shoulder),foot=pair(ankle,hip);
  let last:{x:number;y:number;length:number;time:number}|null=null,jumps=0,comparable=0,maximumJump=0;
  for(const f of frames){const s=f.landmarks[shoulder],h=f.landmarks[hip];if(!hasScale||!valid(s)||!valid(h))continue;
    const current={x:(s.x+h.x)*aspect/2,y:(s.y+h.y)/2,length:Math.hypot((s.x-h.x)*aspect,s.y-h.y),time:f.timestamp};
    if(last&&current.time-last.time<=.8){const displacement=Math.hypot(current.x-last.x,current.y-last.y)/reference,scaleRatio=Math.max(current.length,last.length)/Math.max(.01,Math.min(current.length,last.length));
      comparable++;maximumJump=Math.max(maximumJump,displacement);if(displacement>1.25&&scaleRatio>1.5)jumps++;
    }last=current;
  }
  const contrast=(moving:number,anchor:number)=>(moving-anchor)/(moving+anchor+.1);
  const peakAnchoredMotion=(moving:number,anchor:number)=>{
    if(!hasScale)return 0;let peak=0;
    for(let start=0;start<frames.length;start+=2){const window=frames.slice(start).filter(f=>f.timestamp-frames[start].timestamp<=2&&valid(f.landmarks[moving])&&valid(f.landmarks[anchor]));if(window.length<5)continue;
      const motion=(id:number)=>{const x=window.map(f=>f.landmarks[id].x*aspect),y=window.map(f=>f.landmarks[id].y);return Math.hypot(quantile(x,.9)-quantile(x,.1),quantile(y,.9)-quantile(y,.1))/reference;};
      peak=Math.max(peak,motion(moving)-motion(anchor));
    }return bounded(peak/2);
  };
  return [...coverage,...movement.map(v=>bounded(v/2)),contrast(movement[0],movement[1]),contrast(movement[2],movement[3]),
    ...[.1,.5,.9].map(q=>bounded(quantile(hand,q)/2)),hand.length/n,bounded(quantile(arm,.5)/2),arm.length/n,bounded(quantile(foot,.5)/2),foot.length/n,
    quantile(tilts,.5),quantile(tilts,.9),lengths.length/n,comparable?jumps/comparable:0,bounded(maximumJump/3),peakAnchoredMotion(shoulder,wrist),peakAnchoredMotion(hip,ankle)].map(v=>Number.isFinite(v)?v:0);
}
