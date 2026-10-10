import type { AnalysisReport, EvidenceFrame, Landmark } from './types';
import type { MovementEvidence, MovementReview, MovementSourceKey } from './movementReview';

type Point = { x: number; y: number };
type Sample = { t: number; moving: Point; anchor: Point; length: number };
type Window = { start: number; turn: number; end: number };
type Review = Pick<MovementReview, 'observations' | 'strengths' | 'limits'>;
const visible = (p: Landmark | undefined): p is Landmark => !!p && p.visibility >= .65 && Number.isFinite(p.x) && Number.isFinite(p.y)
  && p.x > .005 && p.x < .995 && p.y > .005 && p.y < .995;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const span = (v: number[]) => Math.max(...v) - Math.min(...v);
const median = (v: number[]) => [...v].sort((a,b) => a-b)[Math.floor(v.length/2)];

/** A sustained near-static portion makes elapsed phase time different from
 * movement time. Abstain rather than classify an intentional hold as slow
 * movement. The .75s duration is the existing minimum tempo phase; tolerance
 * is the caller's existing directional-jitter tolerance in its own units. */
export function phaseHasDwell(times:number[],values:number[],start:number,end:number,tolerance:number):boolean {
  for(let left=start;left<end;left++) {
    let right=left+1;
    while(right<=end&&times[right]-times[left]<.75)right++;
    if(right>end)break;
    const window=values.slice(left,right+1);
    if(span(window)<=tolerance)return true;
  }
  return false;
}

/** Two observed endpoints describe a segment, never its joint angle. Fixed
 * engineering gates: .65 visibility, .04 image-height segment, .4s max gap,
 * .35 segment-length excursion, .15 return tolerance, .2 anchor travel,
 * <=25% inter-frame length change and >=80% directional consistency. Tempo
 * additionally requires <=25% total projected-length change. Repeated-path
 * strengths instead require matching cycle endpoint, length and path profiles;
 * smooth repeated foreshortening is possible for a real rigid limb in 3-D.
 * These gates have not
 * been optimized against private footage or the opened evaluation corpus.
 * Camera translation is rejected using the anchor; depth/view changes can
 * remain ambiguous even when projected length is stable. No hidden endpoints
 * or physical lowering phase are inferred from two points.
 */
function runs(r: AnalysisReport): Sample[][] {
  if (!(r.width > 0 && r.height > 0)) return [];
  const ids = r.exercise === 'squat' ? [25,27] : [13,15];
  const eligible = (f: EvidenceFrame, side: number) => f.metrics?.orientation !== 'incompatible' && ids.every(i => visible(f.landmarks[i+side]));
  const side = r.frames.filter(f=>eligible(f,0)).length >= r.frames.filter(f=>eligible(f,1)).length ? 0 : 1;
  const result: Sample[][] = []; let run: Sample[] = [];
  const flush = () => { if (run.length >= 8 && run.at(-1)!.t-run[0].t >= 1.5) result.push(run); run=[]; };
  for (const f of r.frames) {
    if (!Number.isFinite(f.timestamp) || !eligible(f,side)) { flush(); continue; }
    const point = (i:number) => ({x:f.landmarks[i+side].x*r.width/r.height,y:f.landmarks[i+side].y});
    const moving=point(ids[0]), anchor=point(ids[1]), length=distance(moving,anchor);
    if (length < .04 || (r.exercise === 'pullup' ? moving.y-anchor.y <= .08*length : anchor.y-moving.y <= .08*length)) { flush(); continue; }
    const p=run.at(-1);
    if (p && (f.timestamp<=p.t || f.timestamp-p.t>.4 || Math.abs(length/p.length-1)>.25
      || distance(moving,p.moving)/p.length>.5 || distance(anchor,p.anchor)/p.length>.5)) flush();
    run.push({t:f.timestamp,moving,anchor,length});
  }
  flush(); return result;
}

function cycles(values:number[]): Window[] {
  const firstChange=values.find(v=>Math.abs(v-values[0])>.35);
  if (firstChange===undefined) return [];
  // Mirroring the camera or reversing the path does not change temporal scope.
  const sign=firstChange>values[0] ? -1 : 1, v=values.map(x=>x*sign);
  const result:Window[]=[]; let start=0,turn=0,end=0, phase=0;
  for(let i=1;i<v.length;i++) {
    if(phase===0) {
      if(v[i]>v[start])start=i;
      if(v[start]-v[i]>.35){turn=i;phase=1;}
    } else if(phase===1) {
      if(v[i]<v[turn])turn=i;
      if(v[i]-v[turn]>.35){end=i;phase=2;}
    } else {
      if(v[i]>v[end])end=i;
      if(v[end]-v[i]>.35){result.push({start,turn,end});start=end;turn=i;phase=1;}
    }
  }
  if(phase===2)result.push({start,turn,end});
  return result.filter(w=>Math.abs(v[w.start]-v[w.end])<.15
    && v.slice(w.start+1,w.turn+1).filter((x,i)=>x<=v[w.start+i]+.03).length/(w.turn-w.start)>=.8
    && v.slice(w.turn+1,w.end+1).filter((x,i)=>x>=v[w.turn+i]-.03).length/(w.end-w.turn)>=.8);
}

function relativePoint(p:Sample):Point { return {x:p.moving.x-p.anchor.x,y:p.moving.y-p.anchor.y}; }

/** Compare observed profiles at equal fractions of each phase. This only
 * interpolates between adjacent samples inside an already continuous run;
 * it never fills a missing sample or manufactures an unseen body landmark. */
function phaseProfile(run:Sample[],start:number,end:number):{point:Point;length:number}[] {
  return [0,.25,.5,.75,1].map(fraction=>{
    const t=run[start].t+(run[end].t-run[start].t)*fraction;
    let right=start;while(right<end&&run[right].t<t)right++;
    const left=Math.max(start,right-1),duration=run[right].t-run[left].t;
    const mix=duration>0?(t-run[left].t)/duration:0,a=relativePoint(run[left]),b=relativePoint(run[right]);
    return {point:{x:a.x+(b.x-a.x)*mix,y:a.y+(b.y-a.y)*mix},length:run[left].length+(run[right].length-run[left].length)*mix};
  });
}

function matchingImagePaths(run:Sample[],a:Window,b:Window,scale:number):boolean {
  for(const w of [a,b]) {
    if(distance(relativePoint(run[w.start]),relativePoint(run[w.end]))/scale>.15
      ||Math.abs(run[w.start].length-run[w.end].length)/scale>.15)return false;
  }
  const first=[...phaseProfile(run,a.start,a.turn),...phaseProfile(run,a.turn,a.end)];
  const second=[...phaseProfile(run,b.start,b.turn),...phaseProfile(run,b.turn,b.end)];
  return first.every((p,i)=>distance(p.point,second[i].point)/scale<=.15&&Math.abs(p.length-second[i].length)/scale<=.15);
}

export function getTwoPointMovementReview(r:AnalysisReport):Review {
  const out:Review={observations:[],strengths:[],limits:[]};
  const supports:MovementEvidence[]=[];
  if(/shifts abruptly|change of tracked person|does not consistently match this station/i.test((r.captureNotes??[]).join(' ')+' '+r.summary))return out;
  const segment=r.exercise==='squat'?'shin':'forearm', sourceKey=`ace-${r.exercise}` as MovementSourceKey;
  for(const run of runs(r)) {
    const scale=median(run.map(p=>p.length));
    const stableProjectedLength=Math.max(...run.map(p=>p.length))/Math.min(...run.map(p=>p.length))<=1.25;
    if(Math.hypot(span(run.map(p=>p.anchor.x)),span(run.map(p=>p.anchor.y)))/scale>=.2)continue;
    const x=run.map(p=>(p.moving.x-p.anchor.x)/scale), y=run.map(p=>(p.moving.y-p.anchor.y)/scale);
    const values=span(x)>=span(y)?x:y;
    const windows=cycles(values).filter(w=>w.turn-w.start>=2&&w.end-w.turn>=2
      &&run[w.turn].t-run[w.start].t>=.25&&run[w.end].t-run[w.turn].t>=.25);
    const item=(w:Window,id:string,title:string,observation:string,cue:string,why:string):MovementEvidence=>({
      id,title,observation,cue,why,timestamp:run[w.start].t,endTimestamp:run[w.end].t,
      support:{frames:w.end-w.start+1,durationSeconds:Number((run[w.end].t-run[w.start].t).toFixed(2))},sourceKey});
    // A moving episode need not finish a return. Robust span and several
    // changing samples exclude a static hold or one isolated tracking spike.
    // This records an image-space support pattern, not a completed exercise.
    const ordered=[...values].sort((a,b)=>a-b);
    const robustSpan=ordered[Math.round((ordered.length-1)*.9)]-ordered[Math.round((ordered.length-1)*.1)];
    const changes=values.slice(1).filter((v,i)=>Math.abs(v-values[i])>.01).length;
    if(robustSpan>.35&&changes>=4) {
      const anchor=r.exercise==='squat'?'ankle':'hand';
      supports.push(item({start:0,turn:0,end:run.length-1},`${r.exercise}-${segment}-support`,'A steady point in view',
        `Your ${anchor} stays in a similar image position while your visible ${segment} moves through this section.`,
        r.exercise==='pullup'?'If this is your intended pull-up movement, keep the hand position steady as you move.'
          :r.exercise==='pushup'?'If this is your intended push-up movement, keep the hand position steady as you move.'
          :'If this is your intended squat movement, aim for a steady base as you move.',
        'A steady visible base gives you one part of the movement to keep consistent. It does not establish pressure, grip, or how the hidden parts move.'));
    }
    for(const w of windows) {
      const outward=run[w.turn].t-run[w.start].t, back=run[w.end].t-run[w.turn].t;
      // Coarse samples can show a return without supporting a speed comparison.
      if(!stableProjectedLength||w.turn-w.start<3||w.end-w.turn<3||outward<.75||back<.75||outward/back<=1.8)continue;
      const times=run.map(p=>p.t);
      if(phaseHasDwell(times,values,w.start,w.turn,.03)||phaseHasDwell(times,values,w.turn,w.end,.03))continue;
      out.observations.push(item(w,`${r.exercise}-${segment}-tempo`,'A quicker return',
        `Your visible ${segment} moves one way, then returns noticeably faster in this section.`,
        'If you want a steadier pace, try giving that return a little more time.',
        'A deliberate return gives you a pace you can practise and repeat. A faster return may also be intentional.'));
    }
    for(let i=1;i<windows.length;i++) {
      const a=windows[i-1],b=windows[i];if(a.end!==b.start)continue;
      const amplitudeA=Math.abs(values[a.start]-values[a.turn]),amplitudeB=Math.abs(values[b.start]-values[b.turn]);
      if(Math.max(amplitudeA,amplitudeB)/Math.min(amplitudeA,amplitudeB)>1.25)continue;
      const durationA=run[a.end].t-run[a.start].t,durationB=run[b.end].t-run[b.start].t;
      if(Math.max(durationA,durationB)/Math.min(durationA,durationB)>1.25||!matchingImagePaths(run,a,b,scale))continue;
      out.strengths.push(item({start:a.start,turn:a.turn,end:b.end},`${r.exercise}-${segment}-rhythm`,'A repeatable return',
        `Your visible ${segment} follows a similar path in the image and comes back to a similar position across these two movements.`,
        'Keep that repeatable movement when it fits the exercise and pace you are practising.',
        'A repeatable visible path gives you one part of the movement to compare next time. It does not require equal speeds in both directions.'));
    }
  }
  if(!out.observations.length&&!out.strengths.length)out.strengths=supports.slice(0,1);
  out.observations=out.observations.slice(0,1);out.strengths=out.strengths.slice(0,1);
  if(out.observations.length||out.strengths.length) {
    out.limits.push(`Only your ${segment}'s two visible endpoints support this observation. It does not measure ${r.exercise==='squat'?'a knee':'an elbow'} angle, a full rep, or what hidden body parts do.`);
    out.limits.push('Two points do not confirm which exercise or phase this is. Use the cue only if it matches the movement you intended; camera depth and rotation can change the appearance.');
    if(out.strengths.some(e=>e.id.endsWith('-rhythm')))out.limits.push('A repeated image path is not proof of the same movement in 3-D. Repeated camera movement can sometimes look the same with only two visible points.');
    if(out.strengths.some(e=>e.id.endsWith('-support')))out.limits.push('This is a visible moving episode, not evidence of a completed rep, a full return, a planted whole foot, or the correct exercise phase.');
  }
  return out;
}
