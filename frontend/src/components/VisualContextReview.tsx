import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../account/client';
import {contextSnapshots,type ContextSnapshot} from '../analysis/contextSnapshots';
import type {AnalysisReport} from '../analysis/types';
import type {CoachingContext} from '../analysis/coachingContext';
import type {VisualContext} from '../analysis/movementKnowledge';
interface Result {mode:'visual-context'|'local';context?:VisualContext;reason?:string;}
export default function VisualContextReview({file,report,context,persistent,onContext}:{file:File;report:AnalysisReport;context:CoachingContext;persistent:boolean;onContext:(value:VisualContext)=>void}){
 const [available,setAvailable]=useState(false),[frames,setFrames]=useState<ContextSnapshot[]>([]),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[notice,setNotice]=useState('');
 const task=useRef<AbortController|null>(null),active=useRef(true);
 useEffect(()=>{active.current=true;let current=true;if(persistent)void apiRequest<{available:boolean}>('vision-config').then(value=>{if(current)setAvailable(value.available);}).catch(()=>{});return()=>{current=false;active.current=false;task.current?.abort();};},[persistent]);
 const medical=context.discomfort==='pain'||context.discomfort==='instability';
 useEffect(()=>{if(medical){task.current?.abort();setBusy(false);setFrames([]);setConsent(false);}},[medical]);
 if(!available||medical)return null;
 async function preview(){
  task.current?.abort();const job=new AbortController();task.current=job;setBusy(true);setNotice('');setConsent(false);
  try{const snapshots=await contextSnapshots(file,report,job.signal);if(active.current&&!job.signal.aborted)setFrames(snapshots);}
  catch(error){if(active.current&&!job.signal.aborted)setNotice(error instanceof Error?error.message:'Could not prepare the snapshots.');}
  finally{if(active.current&&task.current===job)setBusy(false);}
 }
 async function send(){
  if(!consent||busy||medical)return;
  task.current?.abort();const job=new AbortController();task.current=job;setBusy(true);setNotice('Checking which movement and body parts are visible…');
  try{
   const result=await apiRequest<Result>('vision-context',{consent:true,discomfort:context.discomfort,exercise:report.exercise,variant:context.variant==='dynamic'?'other':context.variant,goal:context.goal==='control'?'control':'general-technique',frames},job.signal);
   if(!active.current||job.signal.aborted)return;
   if(result.mode==='visual-context'&&result.context){onContext(result.context);setNotice(`The visual check recognized ${result.context.exerciseObserved==='uncertain'?'an uncertain exercise':result.context.exerciseObserved==='pullup'?'pull-ups':result.context.exerciseObserved==='pushup'?'push-ups':'squats'}. Visible in these snapshots: ${result.context.visibleRegions.join(', ')||'no clear body region'}. This helps choose the context; movement corrections still need supporting local evidence.`);}
   else setNotice('The visual check could not give a reliable context. Your local feedback is still available.');
  }catch{if(active.current&&!job.signal.aborted)setNotice('The visual connection did not respond. Your local feedback is still available.');}
  finally{if(active.current&&task.current===job)setBusy(false);}
 }
 return <details className="visual-context-review"><summary>Optional: let ORBIT check the visible context</summary>
  <p className="fine-print">This uses Nebius to recognize the movement and visible body regions. It doesn’t decide that your form is correct.</p>
  {!frames.length&&<button type="button" className="text-button" disabled={busy} onClick={()=>void preview()}>{busy?'Preparing the preview…':'Preview the snapshots first'}</button>}
  {!!frames.length&&<><div className="context-snapshots">{frames.map((frame,i)=><figure key={frame.timestamp}><img src={frame.dataUrl} alt={`Snapshot ${i+1} from your recording at ${frame.timestamp.toFixed(1)} seconds`}/><figcaption>{frame.timestamp.toFixed(1)}s</figcaption></figure>)}</div>
   <label className="context-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/>Send these six snapshots to Nebius. They may include my face and surroundings. Aster won’t save these copies; Nebius’s processing policy applies. My injury check-in, account details and full video aren’t sent.</label>
   <button type="button" className="secondary" disabled={!consent||busy} onClick={()=>void send()}>{busy?'Checking the visible context…':'Check these snapshots'}</button></>}
  {busy&&<button type="button" className="text-button" onClick={()=>{task.current?.abort();setBusy(false);setNotice('Stopped. Your local review is unchanged.');}}>Stop visual check</button>}
  {notice&&<p className="fine-print" role="status">{notice}</p>}
 </details>;
}
