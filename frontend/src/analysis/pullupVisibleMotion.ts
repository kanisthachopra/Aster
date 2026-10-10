import type { AnalysisReport, Landmark } from './types';
import type { MovementEvidence, MovementReview } from './movementReview';

type Point={x:number;y:number};
type Sample={t:number;shoulder:Point;hip:Point;hand:Point;scale:number;sy:number;hy:number};
type Review=Pick<MovementReview,'observations'|'strengths'|'limits'>;
const visible=(p:Landmark|undefined):p is Landmark=>!!p&&p.visibility>=.65&&Number.isFinite(p.x)&&Number.isFinite(p.y)
  &&p.x>.005&&p.x<.995&&p.y>.005&&p.y<.995;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const span=(v:number[])=>Math.max(...v)-Math.min(...v);
const median=(v:number[])=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)];

/** A narrow positive observation, not a form-quality or physical-control score.
 * Existing movement gates are retained: visibility .65, <=.4s sample gaps,
 * .04 minimum torso size, <=25% frame-to-frame size change, .2 torso-length
 * hand travel, and .25 torso-length vertical excursion. Both camera-relative
 * displacement and per-frame body-normalized displacement must agree. The
 * latter cancels ideal uniform zoom; the former prevents foreshortening alone
 * from manufacturing body translation. Depth/perspective still remain limits.
 * No credit/status change, full-ROM verdict, inferred scapula or grip force.
 */
function continuousRuns(r:AnalysisReport):Sample[][] {
  if(!(r.width>0&&r.height>0))return [];
  const eligible=(side:number,f:AnalysisReport['frames'][number])=>f.metrics?.orientationMatches
    &&[11,15,23].every(i=>visible(f.landmarks[i+side]));
  const side=r.frames.filter(f=>eligible(0,f)).length>=r.frames.filter(f=>eligible(1,f)).length?0:1;
  const result:Sample[][]=[];let run:Sample[]=[];
  const flush=()=>{if(run.length>=11)result.push(run);run=[];};
  for(const frame of r.frames){
    if(!Number.isFinite(frame.timestamp)||!eligible(side,frame)){flush();continue;}
    const point=(id:number):Point=>({x:frame.landmarks[id+side].x*r.width/r.height,y:frame.landmarks[id+side].y});
    const shoulder=point(11),hip=point(23),hand=point(15),scale=distance(shoulder,hip);
    if(scale<.04||hand.y>=shoulder.y-.08*scale||hip.y<=shoulder.y){flush();continue;}
    const previous=run.at(-1);
    if(previous&&(frame.timestamp<=previous.t||frame.timestamp-previous.t>.4||Math.abs(scale/previous.scale-1)>.25
      ||distance(hand,previous.hand)/previous.scale>.5||distance(shoulder,previous.shoulder)/previous.scale>.65
      ||distance(hip,previous.hip)/previous.scale>.65))flush();
    run.push({t:frame.timestamp,shoulder,hip,hand,scale,sy:(shoulder.y-hand.y)/scale,hy:(hip.y-hand.y)/scale});
  }
  flush();return result;
}

export function getPullupVisibleMotion(r:AnalysisReport):Review {
  const result:Review={observations:[],strengths:[],limits:[]};
  if(r.exercise!=='pullup'||r.status==='insufficient')return result;
  if(/shifts abruptly|change of tracked person|does not consistently match this station|do not consistently establish the selected exercise|multiple people|more than one person/i
    .test((r.captureNotes??[]).join(' ')+' '+r.summary))return result;
  for(const run of continuousRuns(r))for(let start=3;start+7<run.length;start++){
    if(run[start].sy>run[start+1].sy+.03||run[start].hy>run[start+1].hy+.03)continue;
    const lead=run.slice(Math.max(0,start-12),start+1).filter(p=>run[start].t-p.t<=3);
    if(lead.length<4)continue;
    // Require an observed rise before discussing the return. A hang, reach for
    // the bar, or dropping into the frame is not positive return evidence.
    const leadStart=lead.reduce((best,p)=>p.sy>best.sy?p:best,lead[0]);
    if(leadStart.t>=run[start].t||leadStart.sy-run[start].sy<=.25||leadStart.hy-run[start].hy<=.25)continue;
    const leadStartIndex=run.indexOf(leadStart);
    for(let end=start+7;end<Math.min(run.length,start+17);end++){
      const down=run.slice(start,end+1),duration=down.at(-1)!.t-down[0].t;
      if(duration<1.5||duration>4)continue;
      const last=down.at(-1)!,first=down[0],all=run.slice(leadStartIndex,end+1),scale=median(all.map(p=>p.scale));
      if(last.sy-first.sy<=.25||last.hy-first.hy<=.25)continue;
      if(Math.max(...all.map(p=>p.scale))/Math.min(...all.map(p=>p.scale))>1.6)continue;
      if(Math.hypot(span(all.map(p=>p.hand.x)),span(all.map(p=>p.hand.y)))/scale>=.2)continue;
      const raw=(p:Sample,key:'shoulder'|'hip')=>(p[key].y-p.hand.y)/scale;
      if(raw(leadStart,'shoulder')-raw(first,'shoulder')<=.25||raw(leadStart,'hip')-raw(first,'hip')<=.25
        ||raw(last,'shoulder')-raw(first,'shoulder')<=.25||raw(last,'hip')-raw(first,'hip')<=.25)continue;
      const directions=down.slice(2).map((p,i)=>({s:p.sy-down[i].sy,h:p.hy-down[i].hy}));
      // Compare over two sample intervals to avoid calling one wobbling dot a
      // coordination failure. Both parts must predominantly travel downward.
      if(directions.filter(d=>d.s>0&&d.h>0).length/directions.length<.8)continue;
      const evidence:MovementEvidence={id:'pullup-return-together',title:'Coming down together',
        observation:'Your shoulders and hips come down together while your visible hand stays in a similar image position.',
        cue:'Keep your hips and shoulders coming down together on your next comfortable attempt.',
        why:'A coordinated return gives you a more repeatable starting point for the next pull.',
        timestamp:first.t,endTimestamp:last.t,support:{frames:down.length,durationSeconds:Number(duration.toFixed(2))},sourceKey:'ace-pullup'};
      result.strengths.push(evidence);
      result.limits.push('This describes only the linked return in this camera view. It does not establish a full rep, safe shoulder position, grip pressure, or overall control.');
      result.limits.push('Depth and camera perspective can change the apparent path. The observation requires the tracked hand, shoulder and hip to remain visible.');
      return result;
    }
  }
  return result;
}
