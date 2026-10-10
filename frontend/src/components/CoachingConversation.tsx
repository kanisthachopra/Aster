import {useEffect,useRef,useState} from 'react';
import type {AnalysisReport} from '../analysis/types';
import {localCoachingReply,type CoachingReview} from '../analysis/coaching';
import {injuryResponse,type CoachingContext} from '../analysis/coachingContext';
import {trustedCoachingCard} from '../analysis/coachingCards';
import {apiRequest} from '../account/client';
import type {ReviewSpeech} from './ReportVoice';

export default function CoachingConversation({report,review,context,speech,persistent,onDiscomfort}:{report:AnalysisReport;review:CoachingReview;context:CoachingContext;speech?:ReviewSpeech;persistent:boolean;onDiscomfort?:(value:CoachingContext['discomfort'])=>void}){
 const [question,setQuestion]=useState(''),[reply,setReply]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[available,setAvailable]=useState(false),[notice,setNotice]=useState('');
 const requestVersion=useRef(0),active=useRef(true);
 const reading=useRef<AbortController|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;requestVersion.current++;reading.current?.abort();};},[]);
 useEffect(()=>{let current=true;setAvailable(false);if(persistent)void apiRequest<{available:boolean}>('coach-config').then(value=>{if(current)setAvailable(value.available);}).catch(()=>{});return()=>{current=false;};},[persistent]);
 const answer=async(text:string)=>{
  if(!text.trim()||busy)return;
  reading.current?.abort();speech?.stop(); void speech?.prepare?.();
  const version=++requestVersion.current;
 const local=localCoachingReply(review,context,text);setReply(local);setNotice('');setQuestion('');
 let spokenReply=local;
  const medical=injuryResponse(context,text),card=trustedCoachingCard(report.exercise,review.focus.id);
  const localOnly=/\b(neck|ceiling|look up|head|look forward|reps?|sets?|how many|weight|load|grip|shoulder rotation|lock.*shoulder|miss|unclear|see|certain|confident|understand|fine|okay|comfortable|better|steadier)\b/i.test(text);
  if(medical){setConsent(false);if(context.discomfort!=='pain'&&context.discomfort!=='instability')onDiscomfort?.(/dislocat|slip.*out|unstab|instab/i.test(text)?'instability':'pain');}
  if(consent&&available&&!medical&&!localOnly&&card&&!review.safetyFirst&&context.variant==='standard'){
   setBusy(true);
   try{const result=await apiRequest<{message:string;mode:string}>('coach-question',{exercise:report.exercise,question:text,cueId:card.id,goal:context.goal,consent:true});
    if(active.current&&version===requestVersion.current){spokenReply=result.message;setReply(result.message);setNotice(result.mode==='provider-selected'?'Nebius selected the explanation from your reviewed cue.':'Using the local explanation.');}
   }catch{if(active.current&&version===requestVersion.current)setNotice('The conversation connection didn’t respond. Your local explanation is ready.');}
   finally{if(active.current&&version===requestVersion.current)setBusy(false);}
  }
  if(!medical&&active.current&&version===requestVersion.current&&speech){const task=new AbortController();reading.current=task;void speech.speak(spokenReply,{signal:task.signal}).then(result=>{if(!task.signal.aborted&&active.current&&version===requestVersion.current&&(result.status==='error'||result.status==='unavailable'))setNotice(result.message||'Voice is unavailable. Your explanation is shown here.');}).catch(()=>{if(!task.signal.aborted&&active.current&&version===requestVersion.current)setNotice('Voice is unavailable. Your explanation is shown here.');});}
 };
 return <section className="coach-followup" aria-label="Talk through your review"><h4>Let’s talk it through.</h4>
  <div className="coach-followup-choices">{['Why does that help?','How do I try it?','What couldn’t you see?','That felt painful'].map(text=><button type="button" key={text} disabled={busy} onClick={()=>void answer(text)}>{text}</button>)}</div>
  {reply&&<><p className="coach-reply" role="status">{reply}</p>{speech&&<><button type="button" className="text-button" onClick={()=>{speech.stop();void speech.speak(reply).then(result=>{if(active.current&&(result.status==='error'||result.status==='unavailable'))setNotice(result.message||'The voice reply could not play.');}).catch(()=>{if(active.current)setNotice('The voice reply could not play. You can read the explanation here.');});}}>Listen to this explanation ▶</button><button type="button" className="text-button" onClick={()=>speech.stop()}>Stop voice</button></>}</>}
  <form onSubmit={event=>{event.preventDefault();void answer(question);}}><input type="text" aria-label="Ask ORBIT about this review" placeholder="Tell me which part feels difficult…" maxLength={600} value={question} disabled={busy} onChange={event=>setQuestion(event.target.value)}/><button type="submit" disabled={busy||!question.trim()}>{busy?'One moment…':'Ask ORBIT'}</button></form>
  {notice&&<p className="coach-private" role="status">{notice}</p>}
  {available&&!review.safetyFirst&&context.variant==='standard'&&trustedCoachingCard(report.exercise,review.focus.id)&&<div className="coach-provider"><label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>Use Nebius to select a fuller explanation. Sends your question, goal and a reviewed cue. Your video, body points and injury check-in are excluded. Keep personal details out of questions you send.</label></div>}
  <p className="coach-private">{review.safetyFirst?'Injury-related questions are handled here, without sending them to Nebius.':'These explanations work locally too. This is a guided review, not a substitute for a coach watching you in person.'}</p>
 </section>;
}
