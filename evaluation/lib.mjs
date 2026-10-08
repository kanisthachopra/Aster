import {createHash} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const CLASSES=['pullup','pushup','squat'];
export const sha=value=>createHash('sha256').update(value).digest('hex');
export const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
export function readManifest(path){return readFileSync(path,'utf8').split(/\r?\n/).filter(line=>line.trim()).map(line=>JSON.parse(line));}
export function atomicJson(path,value){mkdirSync(dirname(path),{recursive:true});const temporary=`${path}.tmp-${process.pid}`;writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');
  // Windows sync/indexing tools can briefly hold the destination without delete
  // sharing. Retry the atomic rename; never delete the last valid checkpoint.
  for(let attempt=0;;attempt++){try{renameSync(temporary,path);break;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=40)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}}
}
export function safeDataPath(record){const file=resolve(ROOT,record.relativePath),bases=[resolve(ROOT,'evaluation/data'),resolve(ROOT,'frontend/artifacts/evaluation/media')];if(!bases.some(base=>file.startsWith(base+sep)))throw Error(`${record.id}: media is outside approved evaluation directories`);return file;}
export function validateRecords(records,{checkFiles=false,requireTarget=false}={}){
  const errors=[],ids=new Set(),hashes=new Map(),groups=new Map(),counts=Object.fromEntries(CLASSES.map(c=>[c,0]));
  for(const r of records){
    if(!/^[a-zA-Z0-9_-]+$/.test(r.id??''))errors.push('Invalid manifest ID');
    if(ids.has(r.id))errors.push(`${r.id}: duplicate ID`);ids.add(r.id);
    if(!CLASSES.includes(r.exercise)||r.label?.exercise!==r.exercise)errors.push(`${r.id}: inconsistent exercise label`);else counts[r.exercise]++;
    if(!r.sourceDataset||!r.sourceGroup||!r.sourceUrl||!r.license)errors.push(`${r.id}: missing provenance/group/license`);
    if(!/^[a-f0-9]{64}$/i.test(r.sha256??''))errors.push(`${r.id}: missing SHA256`);
    if(hashes.has(r.sha256))errors.push(`${r.id}: duplicate bytes with ${hashes.get(r.sha256)}`);hashes.set(r.sha256,r.id);
    if(!(r.duration>=2&&r.duration<=120&&r.width>=240&&r.height>=180))errors.push(`${r.id}: outside supported app media policy`);
    if(r.label?.repCount!=null&&(!Number.isInteger(r.label.repCount)||r.label.repCount<0))errors.push(`${r.id}: invalid count label`);
    if(r.label?.form!=null&&!['good','bad'].includes(r.label.form))errors.push(`${r.id}: invalid form label`);
    if(r.label?.form!=null&&(!r.label.formProtocol||!r.label.annotationSource))errors.push(`${r.id}: form label lacks annotation protocol or annotator provenance`);
    if(r.split){if(!['train','validation','test'].includes(r.split))errors.push(`${r.id}: invalid split`);const group=r.sourceGroup;if(groups.has(group)&&groups.get(group)!==r.split)errors.push(`${r.id}: source-group leakage`);groups.set(group,r.split);}
    try{const file=safeDataPath(r);if(checkFiles){if(!existsSync(file))errors.push(`${r.id}: media missing`);else if(sha(readFileSync(file))!==r.sha256.toLowerCase())errors.push(`${r.id}: byte hash mismatch`);}}catch(e){errors.push(e.message);}
  }
  if(requireTarget)for(const c of CLASSES)if(counts[c]!==200)errors.push(`${c}: need 200 distinct videos; got ${counts[c]}`);
  return{valid:errors.length===0,errors,counts,records:records.length,groups:new Set(records.map(r=>r.sourceGroup)).size};
}
export function assignSplits(records,seed='aster-600-v1'){
  const groups=new Map();for(const r of records){const rows=groups.get(r.sourceGroup)??[];rows.push(r);groups.set(r.sourceGroup,rows);}
  const ordered=[...groups].sort((a,b)=>b[1].length-a[1].length||sha(seed+a[0]).localeCompare(sha(seed+b[0])));
  const splits=['train','validation','test'],ratios={train:.6,validation:.2,test:.2};
  const total=Object.fromEntries(CLASSES.map(c=>[c,records.filter(r=>r.exercise===c).length]));
  const counts=Object.fromEntries(splits.map(s=>[s,Object.fromEntries(CLASSES.map(c=>[c,0]))]));
  const assignment=new Map();
  for(const[group,rows]of ordered){
    const additions=Object.fromEntries(CLASSES.map(c=>[c,rows.filter(r=>r.exercise===c).length]));
    const score=split=>CLASSES.reduce((sum,c)=>{const target=total[c]*ratios[split];return sum+((counts[split][c]+additions[c])**2-counts[split][c]**2)/Math.max(1,target);},0);
    const chosen=rows.some(r=>r.developmentOnly)?'train':[...splits].sort((a,b)=>score(a)-score(b)||sha(seed+group+a).localeCompare(sha(seed+group+b)))[0];
    assignment.set(group,chosen);for(const c of CLASSES)counts[chosen][c]+=additions[c];
  }
  return records.map(r=>({...r,split:assignment.get(r.sourceGroup)}));
}
export function summarizeManifest(records){return{total:records.length,byClass:Object.fromEntries(CLASSES.map(c=>[c,records.filter(r=>r.exercise===c).length])),bySplit:Object.fromEntries(['train','validation','test'].map(s=>[s,records.filter(r=>r.split===s).length])),sourceGroups:new Set(records.map(r=>r.sourceGroup)).size,sha256:sha(records.map(r=>JSON.stringify(r)).join('\n'))};}
export function argumentsMap(argv=process.argv.slice(2)){const args={};for(let i=0;i<argv.length;i++){if(argv[i].startsWith('--')){args[argv[i].slice(2)]=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}}return args;}
export const relativeRoot=path=>relative(ROOT,path).split(sep).join('/');
