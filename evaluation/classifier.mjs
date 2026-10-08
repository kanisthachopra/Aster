import{CLASSES,sha}from'./lib.mjs';import{wilson,perClassMetrics}from'./metrics.mjs';
import{fitForest,forestScores}from'./forest.mjs';
import{ACTIVITY_POSE_FEATURE_NAMES}from'../frontend/src/analysis/activityFeatures.ts';
export const FEATURE_NAMES=[...CLASSES.flatMap(c=>['compatibleFraction','incompatibleFraction','measurementCoverage','poseCoverage','range/180','min(cycles,10)/10','usable'].map(n=>`${c}:${n}`)),...ACTIVITY_POSE_FEATURE_NAMES];
export function vector(predictions){return [...CLASSES.flatMap(c=>{const p=predictions[c];return[p.compatibleFraction,p.incompatibleFraction,p.measurementCoverage,p.poseCoverage,Math.max(0,Math.min(180,p.range))/180,Math.min(10,p.cycles)/10,p.status==='usable'?1:0];}),...ACTIVITY_POSE_FEATURE_NAMES.map((_,i)=>predictions.poseFeatures?.[i]??0)].map(v=>Number.isFinite(v)?v:0);}
const softmax=logits=>{const max=Math.max(...logits),exps=logits.map(x=>Math.exp(x-max)),total=exps.reduce((a,b)=>a+b,0);return exps.map(x=>x/total);};
export function fitLinear(rows,{regularization=.03,epochs=700,learningRate=.15}={}){
  if(!rows.length)throw Error('No training rows');const dim=FEATURE_NAMES.length+1,weights=CLASSES.map(()=>Array(dim).fill(0));
  const training=[...rows].sort((a,b)=>sha(a.id).localeCompare(sha(b.id))).map(row=>({x:[1,...vector(row.predictions)],y:CLASSES.indexOf(row.label.exercise)}));
  const classCounts=CLASSES.map(c=>rows.filter(r=>r.label.exercise===c).length);if(classCounts.some(n=>!n))throw Error('Training needs all three exercise labels');
  for(let epoch=0;epoch<epochs;epoch++){
    const gradient=CLASSES.map(()=>Array(dim).fill(0));
    for(const{x,y}of training){const probabilities=softmax(weights.map(w=>w.reduce((s,v,j)=>s+v*x[j],0))),importance=rows.length/(3*classCounts[y]);
      for(let c=0;c<3;c++)for(let j=0;j<dim;j++)gradient[c][j]+=(probabilities[c]-(c===y?1:0))*x[j]*importance/rows.length;
    }
    const rate=learningRate/(1+epoch/700);for(let c=0;c<3;c++)for(let j=0;j<dim;j++)weights[c][j]-=rate*(gradient[c][j]+(j?regularization*weights[c][j]:0));
  }
  return{type:'regularized-multinomial-logistic-regression',classes:CLASSES,featureNames:FEATURE_NAMES,weights,trainingConfig:{regularization,epochs,learningRate},trainingRows:rows.length};
}
export function linearPredict(predictions,model,gate={threshold:0,margin:0}){
  const features=vector(predictions),x=[1,...features],probabilities=model.type==='deterministic-random-forest'?forestScores(features,model):softmax(model.weights.map(w=>w.reduce((s,v,j)=>s+v*x[j],0))),ranked=probabilities.map((score,i)=>({exercise:CLASSES[i],score})).sort((a,b)=>b.score-a.score),margin=ranked[0].score-ranked[1].score;
  // A statistical classifier must abstain when no motion evidence exists, irrespective of its bias term.
  const pose=predictions.poseFeatures,feature=name=>pose?.[ACTIVITY_POSE_FEATURE_NAMES.indexOf(name)]??0;
  const coherentMotion=!Array.isArray(pose)||(Math.max(feature('peakHandAnchoredBodyMotion'),feature('peakFootAnchoredBodyMotion'))>.025&&feature('maximumTrackingJump')<.8);
  const evidence=coherentMotion&&CLASSES.some(c=>predictions[c].measurementCoverage>=.1&&predictions[c].range>=10);
  const selectedGate=gate.perClass?.[ranked[0].exercise]??gate;
  return{prediction:evidence&&selectedGate.enabled!==false&&ranked[0].score>=selectedGate.threshold&&margin>=selectedGate.margin?ranked[0].exercise:null,best:ranked[0].exercise,score:ranked[0].score,margin,probabilities};
}
export function linearAggregate(rows,model,gate){
  const confusion=Object.fromEntries(CLASSES.map(c=>[c,Object.fromEntries([...CLASSES,'abstain'].map(p=>[p,0]))]));let accepted=0,correct=0;
  for(const row of rows){const result=linearPredict(row.predictions,model,gate);confusion[row.label.exercise][result.prediction??'abstain']++;if(result.prediction){accepted++;if(result.prediction===row.label.exercise)correct++;}}
  return{evaluated:rows.length,accepted,correct,wrong:accepted-correct,abstained:rows.length-accepted,coverage:rows.length?accepted/rows.length:null,accuracyIncludingAbstentions:rows.length?correct/rows.length:null,acceptedPrecision:accepted?correct/accepted:null,acceptedPrecision95CI:wilson(correct,accepted),confusion,perClass:perClassMetrics(confusion),balancedRecall:CLASSES.reduce((sum,c)=>sum+confusion[c][c]/Math.max(1,rows.filter(r=>r.label.exercise===c).length),0)/3};
}
export function fitAndCalibrate(train,validation,targetPrecision=.8,family='linear'){
  // Hyperparameters are proposed using training only; validation is reserved for the abstention gate.
  const folds=new Map([...new Set(train.map(r=>r.sourceGroup))].sort().map(group=>[group,parseInt(sha(group).slice(0,8),16)%3]));
  const candidates=[];
  const parameters=family==='forest'?[{maxDepth:3,minLeaf:6},{maxDepth:3,minLeaf:12},{maxDepth:5,minLeaf:6},{maxDepth:5,minLeaf:12}]:[.01,.03,.1].map(regularization=>({regularization}));
  const fit=(rows,config)=>family==='forest'?{...fitForest(rows.map(row=>({x:vector(row.predictions),y:CLASSES.indexOf(row.label.exercise)})),config),classes:CLASSES,featureNames:FEATURE_NAMES}:fitLinear(rows,config);
  for(const config of parameters){
    const foldsResults=[];for(let fold=0;fold<3;fold++){const fitting=train.filter(r=>folds.get(r.sourceGroup)!==fold),held=train.filter(r=>folds.get(r.sourceGroup)===fold);if(!held.length||CLASSES.some(c=>!fitting.some(r=>r.label.exercise===c)))continue;const model=fit(fitting,config);foldsResults.push(linearAggregate(held,model,{threshold:0,margin:0}));}
    candidates.push({config,groupCrossValidation:foldsResults,meanRecall:foldsResults.reduce((s,r)=>s+r.balancedRecall,0)/Math.max(1,foldsResults.length)});
  }
  candidates.sort((a,b)=>b.meanRecall-a.meanRecall||JSON.stringify(a.config).localeCompare(JSON.stringify(b.config)));const model=fit(train,candidates[0].config),gates=[];
  for(const threshold of[0,.5,.6,.7,.8,.9,.95])for(const margin of[0,.1,.2,.3]){const gate={threshold,margin},result=linearAggregate(validation,model,gate);gates.push({gate,result});}
  const perClass={},classGateResults={};
  for(const c of CLASSES){
    const minimumSupport=Math.min(20,Math.ceil(validation.filter(r=>r.label.exercise===c).length*.4));
    const qualifying=gates.filter(g=>g.result.perClass[c].acceptedAsClass>=minimumSupport&&g.result.perClass[c].acceptedPrecision95CI.low>=targetPrecision);
    qualifying.sort((a,b)=>b.result.perClass[c].acceptedAsClass-a.result.perClass[c].acceptedAsClass||b.result.perClass[c].acceptedPrecision-a.result.perClass[c].acceptedPrecision);
    const chosen=qualifying[0];perClass[c]=chosen?{...chosen.gate,enabled:true}:{threshold:1,margin:1,enabled:false};
    classGateResults[c]={passed:!!chosen,minimumSupport,metrics:chosen?.result.perClass[c]??null};
  }
  const gate={perClass};
  return{model,gate,targetPrecision,validationGatePassed:CLASSES.every(c=>classGateResults[c].passed),anyClassGatePassed:CLASSES.some(c=>classGateResults[c].passed),classGateResults,trainingCrossValidation:candidates,training:linearAggregate(train,model,gate),validation:linearAggregate(validation,model,gate),method:`Supervised ${family} activity classifier trained on source-grouped training data. Grouped cross-validation chooses hyperparameters; independent validation selects separate abstention gates for each predicted class. Unsupported classes abstain. No form-quality labels or reinforcement learning.`};
}
