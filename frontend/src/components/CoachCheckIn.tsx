import type {Exercise} from '../game/types';
import type {CoachingContext} from '../analysis/coachingContext';
import './coaching.css';
export default function CoachCheckIn({exercise,value,onChange,disabled=false}:{exercise:Exercise;value:CoachingContext;onChange:(value:CoachingContext)=>void;disabled?:boolean}){
 const change=(patch:Partial<CoachingContext>)=>onChange({...value,...patch});
 return <details className="coach-checkin" open>
  <summary>Before I watch, what would help you most?</summary>
  <fieldset disabled={disabled}><legend className="visually-hidden">Your review check-in</legend>
   <div className="coach-options" role="group" aria-label="What you want to work on">{([{id:'control',label:'A smoother rep'},{id:'strength',label:'Building strength'},{id:'comfortable',label:'Feeling comfortable'}] as const).map(option=><button type="button" aria-pressed={value.goal===option.id} key={option.id} onClick={()=>change({goal:option.id})}>{option.label}</button>)}</div>
   <label className="coach-question">Anything sore or unstable?<select aria-label="Pain or instability in this exercise" value={value.discomfort} onChange={event=>change({discomfort:event.target.value as CoachingContext['discomfort']})}><option value="not-said">I’d rather skip this</option><option value="none">No, this felt comfortable</option><option value="pain">This felt painful</option><option value="instability">My shoulder slips out or feels unstable</option></select></label>
   <label className="coach-question">Which version is this?<select aria-label="Exercise variation" value={value.variant} onChange={event=>change({variant:event.target.value as CoachingContext['variant']})}><option value="standard">{exercise.id==='pullup'?'A strict pull-up, without swinging':exercise.id==='pushup'?'A full push-up':'A bodyweight squat'}</option><option value="assisted">{exercise.id==='pullup'?'Assisted with a band or machine':exercise.id==='pushup'?'Kneeling or hands on a raised surface':'Using support or added weight'}</option>{exercise.id==='pullup'&&<option value="dynamic">Using momentum on purpose</option>}</select></label>
   <p className="coach-private">This changes your review. Injury details are excluded from Nebius requests. Spoken feedback uses the voice service; saved notes belong to your private journal.</p>
  </fieldset>
 </details>;
}
