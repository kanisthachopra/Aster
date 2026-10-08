import{CLASSES}from'./lib.mjs';
export function wilson(successes,total,z=1.96){if(!total)return{low:null,high:null};const p=successes/total,d=1+z*z/total,c=(p+z*z/(2*total))/d,h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;return{low:Math.max(0,c-h),high:Math.min(1,c+h)};}
export function perClassMetrics(confusion){return Object.fromEntries(CLASSES.map(c=>{
  const support=Object.values(confusion[c]).reduce((a,b)=>a+b,0),acceptedAsClass=CLASSES.reduce((n,truth)=>n+confusion[truth][c],0),correct=confusion[c][c],acceptedFromClass=support-confusion[c].abstain;
  return[c,{support,acceptedAsClass,correct,acceptedFromClass,coverage:support?acceptedFromClass/support:null,recall:support?correct/support:null,acceptedPrecision:acceptedAsClass?correct/acceptedAsClass:null,acceptedPrecision95CI:wilson(correct,acceptedAsClass)}];
}));}
export function evidenceFeatures(frames,report,exercise){
  const metric=exercise==='squat'?'knee':'elbow',measured=report.frames.filter(f=>Number.isFinite(f.metrics?.[metric]));
  const compatible=measured.filter(f=>f.metrics.orientationMatches).length,incompatible=measured.filter(f=>f.metrics.orientation==='incompatible').length;
  const values=measured.map(f=>f.metrics[metric]).sort((a,b)=>a-b),range=values.length?values[Math.floor((values.length-1)*.9)]-values[Math.floor((values.length-1)*.1)]:0;
  return{status:report.status,cycles:report.estimatedRepetitions,poseCoverage:frames.length?frames.filter(f=>f.landmarks.length).length/frames.length:0,measurementCoverage:frames.length?measured.length/frames.length:0,compatibleFraction:measured.length?compatible/measured.length:0,incompatibleFraction:measured.length?incompatible/measured.length:0,range:Number.isFinite(range)?range:0};
}
export function scoreEvidence(features,parameters={coverageWeight:.5,motionWeight:.25}){
  const coverage=Math.max(0,features.measurementCoverage),motion=Math.min(1,Math.max(0,features.range)/60);
  return Math.max(0,features.compatibleFraction-features.incompatibleFraction)*Math.pow(coverage,parameters.coverageWeight)*(1-parameters.motionWeight+parameters.motionWeight*motion);
}
export function predict(predictions,calibration={threshold:0,margin:0,coverageWeight:.5,motionWeight:.25}){
  const ranked=CLASSES.map(exercise=>({exercise,score:scoreEvidence(predictions[exercise],calibration)})).sort((a,b)=>b.score-a.score||a.exercise.localeCompare(b.exercise));
  const margin=ranked[0].score-ranked[1].score;
  const accepted=ranked[0].score>0&&ranked[0].score>=calibration.threshold&&margin>=calibration.margin;
  return{prediction:accepted?ranked[0].exercise:null,best:ranked[0].exercise,score:ranked[0].score,margin};
}
export function aggregate(rows,calibration){
  const counts={evaluated:rows.length,accepted:0,correct:0,wrong:0,abstained:0},confusion=Object.fromEntries(CLASSES.map(c=>[c,Object.fromEntries([...CLASSES,'abstain'].map(p=>[p,0]))]));
  const errors=[],squaredErrors=[],withinOne=[],qualityLabels=rows.filter(r=>r.label.form!=null).length;
  const station={positiveCompleted:0,positivePartial:0,positiveInsufficient:0,wrongStationAccepted:0,wrongStationTrials:rows.length*2,
    byClass:Object.fromEntries(CLASSES.map(c=>[c,{videos:0,usable:0,partial:0,insufficient:0,wrongStationAccepted:0,wrongStationTrials:0}]))};
  for(const row of rows){const decision=predict(row.predictions,calibration),truth=row.label.exercise;confusion[truth][decision.prediction??'abstain']++;if(decision.prediction){counts.accepted++;if(decision.prediction===truth)counts.correct++;else counts.wrong++;}else counts.abstained++;
    const own=row.predictions[truth];if(own.status==='usable')station.positiveCompleted++;else if(own.status==='partial')station.positivePartial++;else station.positiveInsufficient++;
    const classStation=station.byClass[truth];classStation.videos++;classStation[own.status]++;classStation.wrongStationTrials+=2;
    for(const c of CLASSES)if(c!==truth&&row.predictions[c].status==='usable'){station.wrongStationAccepted++;classStation.wrongStationAccepted++;}
    if(Number.isInteger(row.label.repCount)){const error=Math.abs(own.cycles-row.label.repCount);errors.push(error);squaredErrors.push(error*error);withinOne.push(error<=1?1:0);}
  }
  const sum=a=>a.reduce((s,v)=>s+v,0),acceptedPrecision=counts.accepted?counts.correct/counts.accepted:null;
  return{...counts,accuracyIncludingAbstentions:rows.length?counts.correct/rows.length:null,coverage:rows.length?counts.accepted/rows.length:null,acceptedPrecision,acceptedPrecision95CI:wilson(counts.correct,counts.accepted),confusion,perClass:perClassMetrics(confusion),
    balancedRecall:CLASSES.reduce((s,c)=>s+(rows.filter(r=>r.label.exercise===c).length?confusion[c][c]/rows.filter(r=>r.label.exercise===c).length:0),0)/CLASSES.length,
    station,...(errors.length?{repetitionCounting:{labeledVideos:errors.length,mae:sum(errors)/errors.length,rmse:Math.sqrt(sum(squaredErrors)/errors.length),withinOneAccuracy:sum(withinOne)/withinOne.length}}:{repetitionCounting:{labeledVideos:0,mae:null,rmse:null,withinOneAccuracy:null,reason:'No human repetition-count labels; activity labels do not validate counting.'}}),
    formQuality:{labeledVideos:qualityLabels,accuracy:null,reason:'This algorithm does not classify good/bad form. Activity-recognition accuracy is not form-quality accuracy.'}};
}
export function calibrate(train,validation,targetPrecision=.8){
  if(!train.length||!validation.length)throw Error('Both training and validation sets are required.');
  const trainCandidates=[];
  for(const coverageWeight of[0,.5,1])for(const motionWeight of[0,.25,.5]){const parameters={coverageWeight,motionWeight,threshold:0,margin:0};const result=aggregate(train,parameters);trainCandidates.push({parameters,result});}
  trainCandidates.sort((a,b)=>b.result.balancedRecall-a.result.balancedRecall||b.result.acceptedPrecision-a.result.acceptedPrecision);
  const base=trainCandidates[0].parameters,candidates=[];
  for(const threshold of[0,.2,.35,.5,.65,.8,.9])for(const margin of[0,.05,.1,.2,.3]){const parameters={...base,threshold,margin},result=aggregate(validation,parameters);candidates.push({parameters,result});}
  const qualifying=candidates.filter(c=>c.result.accepted>=Math.min(30,Math.ceil(validation.length*.25))&&c.result.acceptedPrecision95CI.low>=targetPrecision);
  qualifying.sort((a,b)=>b.result.coverage-a.result.coverage||b.result.acceptedPrecision-a.result.acceptedPrecision);
  const chosen=qualifying[0]??[...candidates].sort((a,b)=>(b.result.acceptedPrecision95CI.low??-1)-(a.result.acceptedPrecision95CI.low??-1)||b.result.coverage-a.result.coverage)[0];
  return{parameters:chosen.parameters,targetPrecision,validationGatePassed:qualifying.length>0,validation:chosen.result,training:trainCandidates[0].result,method:'Finite deterministic supervised rule/threshold calibration; no neural weight update or reinforcement learning. Test labels are never used.',candidateCounts:{training:trainCandidates.length,validation:candidates.length}};
}
