import type {AnalysisReport,Finding} from './types';
import {getMovementReview, type MovementEvidence} from './movementReview';
import {DEFAULT_COACHING_CONTEXT,SHOULDER_SOURCE,injuryResponse,type CoachingContext} from './coachingContext';
import {evidenceScope,MOVEMENT_ANALYSIS_VERSION,MOVEMENT_KNOWLEDGE_VERSION,type VisualContext} from './movementKnowledge';

export interface CoachingMoment {id:string;title:string;timestamp:number;endTimestamp?:number;observation:string;cue:string;why:string;spokenText:string;sourceKey:string;}
export interface CoachingFocus {id:string;title:string;observation:string;cue:string;why:string;sourceKey:string;detected:boolean;timestamp?:number;kind?:'correction'|'strength'|'practice'|'capture'|'health';}
export interface CoachingReview {title:string;summary:string;moments:CoachingMoment[];uncertainty:string;spokenText:string;focus:CoachingFocus;strength:string;sources:{title:string;url:string}[];safetyFirst:boolean;captureTip?:string;}
const SOURCE = {
 pushup:{title:'Push-up guidance · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/'},
 pullup:{title:'Pull-up guidance · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/'},
 squat:{title:'Squat guidance · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/'},
};
const KNEE_PUSHUP_SOURCE = {title:'Knee push-up guidance · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/13/bent-knee-push-up/'};
function captureAdvice(report:AnalysisReport){
 if((report.poseFrames ?? report.frames.filter(frame=>frame.landmarks.length).length)===0)return {why:'I couldn’t reliably find a person in this recording.',cue:'Keep yourself in view with light in front of you, and use a playable clip. The guide shows how to leave space around the movement.'};
 const text=(report.captureNotes??[]).join(' ');
 if(/shifts abruptly|change of tracked person/i.test(text))return {why:'The camera or tracked person changes, so I can’t follow a rep continuously.',cue:'Keep the camera still and one person in view. That lets me follow the movement from start to finish.'};
 if(/do not consistently establish the selected exercise|does not consistently match this station/i.test(text))return {why:'I’m not sure this clip matches the exercise you picked.',cue:'Check the station first. Then include the start and return of the exercise in your clip.'};
 if(/shoulders are missing|shoulder.*obscured/i.test(text))return {why:'Your shoulders are hidden in part of this view.',cue:'Move the camera back or tilt it up a little. Keep your shoulders in the picture at both ends of the rep.'};
 if(/wrists or hands.*out of view/i.test(text))return {why:'Your hands leave the picture in part of this clip.',cue:report.exercise==='pullup'?'Include your hands and the bar, even at the lowest position.':'Step the camera back so your hands stay visible throughout the rep.'};
 if(/hip is difficult to locate/i.test(text))return {why:'I can’t follow your hips clearly in this view.',cue:'Use a wider view with light in front of you. I need your hips and chest together to check their timing.'};
 if(/feet or ankles.*hidden|ankles are outside or obscured/i.test(text))return {why:'Your feet are outside the view or hidden.',cue:'Include your feet in the next clip if you want me to check your whole-body movement too.'};
 if(report.status!=='usable')return {why:'I can’t follow a complete rep clearly in this recording.',cue:'Show the start, the movement and the return. An existing angle is fine; the animated guide can help with your next recording.'};
 return {why:'I can check visible movement here, but not pain or how much a muscle is working.',cue:'Keep the same camera position for your next clip so we can compare the same movement.'};
}
function toMoment(item:MovementEvidence):CoachingMoment{
 return {...item,spokenText:`Around ${item.timestamp.toFixed(1)} seconds, ${item.observation} ${item.cue} ${item.why}`};
}
export function getCoachingMoment(report:AnalysisReport,finding:Finding):CoachingMoment|null{
 const candidate=getMovementReview(report).observations.find(item=>item.id===finding.id&&Math.abs(item.timestamp-finding.timestamp)<.001);
 return candidate?toMoment(candidate):null;
}
export function getCoachingReview(report:AnalysisReport,context:CoachingContext=DEFAULT_COACHING_CONTEXT,visual?:VisualContext):CoachingReview{
 const movement=getMovementReview(report),capture=captureAdvice(report),safety=injuryResponse(context);
 const allowed=movement.observations.filter(item=> !(report.exercise==='pullup'&&context.variant==='dynamic'&&['pullup-swing','pullup-arm-tempo','pullup-forearm-tempo','pullup-descent'].includes(item.id)) && !(report.exercise==='pushup'&&context.variant==='assisted'&&item.id==='pushup-hip-position'));
 if(context.goal==='control')allowed.sort((a,b)=>Number(/timing|descent/.test(b.id))-Number(/timing|descent/.test(a.id)));
 const selectedStrength=movement.strengths[0];
 const moments=safety?[]:(allowed.length?allowed.slice(0,2):selectedStrength?[selectedStrength]:[]).map(toMoment),first=moments[0];
 const isStrength=!!first&&!allowed.length;
 const partialPractice=!first&&report.status==='partial'&&report.frames.some(frame=>frame.landmarks.some(point=>point.visibility>=.65&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>0&&point.x<1&&point.y>0&&point.y<1))
  &&! /shifts abruptly|change of tracked person|does not consistently match this station|do not consistently establish the selected exercise/i.test((report.captureNotes??[]).join(' '));
 // A partial pose is not a detected fault or proof of exercise identity. Keep
 // selected-variation education available, separately from capture guidance.
 const unclear=(!first&&(report.status==='insufficient'||report.status==='partial')&&!partialPractice)||/shifts abruptly|change of tracked person/i.test((report.captureNotes??[]).join(' '));
 let focus:CoachingFocus=first?{...first,detected:true,kind:isStrength?'strength':'correction'}: {id:'practice-'+report.exercise,title:movement.practiceTip.title,observation:'A general practice cue, not a fault I detected in your clip.',cue:movement.practiceTip.cue,why:movement.practiceTip.why,sourceKey:movement.practiceTip.sourceKey,detected:false,kind:'practice'};
 if(report.exercise==='pullup'&&context.variant==='dynamic'&&!first)focus={...focus,title:'Keep the version you’re practicing clear',cue:'You said the momentum is intentional. I won’t treat swinging by itself as a mistake. A coach familiar with that variation can help assess it.',why:'Strict and momentum-based pull-ups have different goals. I can’t compare them as if they were the same exercise.'};
 if(report.exercise==='pushup'&&context.variant==='assisted'&&!first)focus={...focus,title:'Move together in your chosen version',cue:'In your kneeling or raised-hand version, practice bringing your hips and chest down and back up together, within a comfortable range.',why:'The aim is coordinated movement, not forcing your body into a full push-up before you’re ready.'};
 if(partialPractice)focus={...focus,observation:'This is a practice idea for the version you chose. I could not measure a specific fault in this clip.'};
 if(unclear)focus={id:'capture',title:'Let’s use the part I can see',observation:capture.why,cue:capture.cue,why:'A continuous view of the relevant body parts helps me follow the movement. The whole body does not need to fit for every check.',sourceKey:'capture',detected:false,kind:'capture'};
 if(safety)focus={id:'comfort-first',title:'Let’s put your comfort first',observation:'You mentioned discomfort or instability in your check-in.',cue:safety,why:'A video cannot choose an injury-specific exercise plan.',sourceKey:'shoulder',detected:false};
 const strength=!safety&&!isStrength&&movement.strengths[0]?movement.strengths[0].observation:'';
 const summary=safety?'Thanks for telling me. Let’s pause the exercise advice and look after that first.':first?first.observation:unclear?'Let’s make your next recording useful.':partialPractice?'I couldn’t follow enough of this movement to pick a specific correction. Here’s one practice idea for the version you chose.':'I don’t have a specific correction from this view. Let’s work on one practice cue.';
 const relevantLimit=movement.limits.find(line=>(! /hip position/.test(line)||first?.id==='pushup-hip-position')
  &&/front-facing|continuous view|camera angle|only the linked moments|does not prove/.test(line));
 const contextNote=visual?visual.exerciseObserved===report.exercise?`The optional visual check recognized ${report.exercise==='pullup'?'pull-ups':report.exercise==='pushup'?'push-ups':'squats'} in these selected frames. It supports context, not a technique verdict.`:visual.exerciseObserved==='uncertain'?'The optional visual check could not confidently identify the exercise in the selected frames.':'The visual check and your chosen station disagree. Please check the station; I have kept the local evidence separate.':'';
 const uncertainty=safety?'Your injury check-in is excluded from Nebius requests. Spoken feedback uses the voice service, and saved notes stay in your private journal.':[first?`This checks ${evidenceScope(first.id)}.`:capture.why,relevantLimit,contextNote].filter(Boolean).join(' ');
 const opening=safety?'':first?'Thanks for showing me your set. I’ve got one place to start.':unclear?'I want to give you something you can use, but this clip leaves a gap.':partialPractice?'I couldn’t follow enough of this clip to call a specific fault. We can still work on one practice idea for the version you chose.':'Thanks for showing me. Let’s keep the next step simple.';
 const closing=context.goal==='strength'?'For your strength goal, start with a rep you can repeat with control; this clip can’t choose your load or rep count.':context.goal==='comfortable'?'For your comfort goal, tell me how this felt. If it hurt or felt unstable, let’s change the advice before you try again.':'Try that cue in your next comfortable set, then tell me how it felt.';
 const spokenText=[opening,strength,first?`Around ${first.timestamp.toFixed(1)} seconds, ${first.observation}`:'',focus.cue,focus.why,!safety&&!unclear?closing:''].filter(Boolean).join(' ');
 return {title:focus.title,summary,moments,uncertainty,spokenText,focus,strength,sources:safety?[SHOULDER_SOURCE]:[SOURCE[report.exercise],...(report.exercise==='pushup'&&context.variant==='assisted'?[KNEE_PUSHUP_SOURCE]:[])],safetyFirst:!!safety,
  ...(!safety&&partialPractice?{captureTip:capture.cue}:{})};
}
export function localCoachingReply(review:CoachingReview,context:CoachingContext,question:string):string{
 const safety=injuryResponse(context,question);if(safety)return safety;
 if(/\b(neck|ceiling|look up|head|look forward)\b/i.test(question))return 'Keep your head comfortably in line with your body instead of forcing your neck up to look at the ceiling. I can’t see muscle activation in a clip, and a change in gaze alone doesn’t prove that your back is doing more work. If your neck or shoulder feels uncomfortable, don’t push through it.';
 if(/\b(reps?|sets?|how many|weight|load)\b/i.test(question))return 'I can’t choose your rep count or load from this recording. Use a set you can control comfortably, and pause when the movement starts changing or feels uncomfortable. Your training history and recovery matter too. For now, focus on this cue: '+review.focus.cue;
 if(/\b(grip|shoulder rotation|lock.*shoulder)\b/i.test(question))return 'I can’t check grip pressure or precise shoulder rotation from these body dots. Please don’t force your shoulders into a position because an app called it “locked.” A closer view can show hand placement, but comfort and an injury-specific plan need a qualified coach or clinician. For the visible movement, we can work on this: '+review.focus.cue;
 if(/\b(why|help|matter|reason)\b/i.test(question))return review.focus.why+' '+(review.focus.detected?'That connects to the movement I marked in your clip: '+review.focus.observation:'This is general practice guidance; I’m not claiming I saw that fault in your clip.');
 if(/\b(miss|unclear|see|certain|confident|understand)\b/i.test(question))return review.uncertainty+' '+(review.focus.detected?'The marked moment is something I could follow, but that doesn’t tell me every part of your form.':'I don’t have enough evidence to call a specific fault. I’d rather tell you what would help than invent one.');
 if(/\b(how|try|practice|do|change|next|easier)\b/i.test(question))return review.focus.cue+' '+review.focus.why+' Change one thing at a time, and tell me whether it felt steadier or less comfortable.';
 if(/\b(fine|okay|comfortable|better|steadier)\b/i.test(question))return 'That’s useful to know. Keep the same cue and camera position for your next clip so we can compare it. Feeling better matters, but I won’t call the movement safe or corrected from that alone.';
 return 'I can help with the marked movement, how to try the cue, or getting a clearer recording. '+review.focus.cue+' If you mean a different part of the exercise, tell me which part and what you felt.';
}
/** Persist useful notes; original measurements remain available during this review. */
export function coachingReport(report:AnalysisReport,review:CoachingReview):AnalysisReport{
 const findings=review.moments.map(item=>({id:item.id,title:item.title,timestamp:item.timestamp,observation:item.observation,suggestion:`${item.cue} ${item.why}`}));
 if(!findings.length)findings.push({id:review.focus.id,title:review.focus.title,timestamp:0,observation:review.focus.detected?review.focus.observation:'General guidance, not a detected form fault.',suggestion:review.focus.cue+' '+review.focus.why});
 return {...report,summary:review.summary,findings,sources:review.sources,analysisVersion:MOVEMENT_ANALYSIS_VERSION,knowledgeVersion:MOVEMENT_KNOWLEDGE_VERSION};
}
