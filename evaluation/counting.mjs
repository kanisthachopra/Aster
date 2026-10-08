import {CLASSES} from './lib.mjs';

// A source annotation is usable only when its entire interval exists in the decoded clip.
export function completeCountIntervals(record,duration){
  return (record.countixIntervals??[]).filter(i=>Number.isFinite(i.start)&&Number.isFinite(i.end)&&i.start>=0&&i.end>i.start&&i.end<=duration+.001&&Number.isInteger(i.count)&&i.count>=0);
}
export function intervalCountPredictions(record,data,{measure,summarize}){
  return completeCountIntervals(record,data.duration).map(interval=>{
    const frames=data.frames.filter(f=>f.timestamp>=interval.start&&f.timestamp<=interval.end).map(f=>({...f,metrics:measure(f.landmarks,record.exercise,data.width,data.height)}));
    const report=summarize(frames,record.exercise,interval.end-interval.start,data.width,data.height);
    return {start:interval.start,end:interval.end,annotatedCount:interval.count,predictedCycles:report.estimatedRepetitions,status:report.status,samples:frames.length,sourceFile:interval.sourceFile};
  });
}
export function countMetrics(rows){
  const intervals=rows.flatMap(r=>(r.countIntervals??[]).map(i=>({...i,id:r.id,exercise:r.label.exercise}))),summarize=items=>{
    if(!items.length)return {intervals:0,videos:0,mae:null,rmse:null,withinOneAccuracy:null,exactAccuracy:null};
    const errors=items.map(i=>Math.abs(i.predictedCycles-i.annotatedCount)),sum=a=>a.reduce((s,v)=>s+v,0);
    return {intervals:items.length,videos:new Set(items.map(i=>i.id)).size,mae:sum(errors)/errors.length,rmse:Math.sqrt(sum(errors.map(e=>e*e))/errors.length),withinOneAccuracy:errors.filter(e=>e<=1).length/errors.length,exactAccuracy:errors.filter(e=>e===0).length/errors.length};
  };
  return {...summarize(intervals),perClass:Object.fromEntries(CLASSES.map(c=>[c,summarize(intervals.filter(i=>i.exercise===c))])),boundary:'Countix human counts cover only the specified subintervals. Predictions count complete observed angle cycles within those same windows, at app sampling resolution. Window boundaries and tracking gaps may undercount. This does not validate exercise form.'};
}
