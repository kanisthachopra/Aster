import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';

const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../..');
const csvPath=resolve(root,process.argv[2] || 'frontend/artifacts/evaluation/rehab24-segmentation.csv');
const metadataPath=resolve(root,process.argv[3] || 'frontend/artifacts/evaluation/rehab24-metadata.json');
const bytes=await readFile(csvPath);
const md5=createHash('md5').update(bytes).digest('hex');
if(md5!=='90b8fbd7445dd050bf27b17126c78fbe')throw new Error('The annotation checksum differs from the pinned primary record. Review the source before using new labels.');
const metadata=JSON.parse(await readFile(metadataPath,'utf8'));
if(metadata.metadata?.license?.id!=='cc-by-nc-4.0')throw new Error('Unexpected license metadata; review provenance.');
const lines=bytes.toString('utf8').trim().split(/\r?\n/);
const header=lines.shift().split(';');
const required=['video_id','repetition_number','exercise_id','person_id','first_frame','last_frame','cam17_orientation','mocap_erroneous','lights_on','extra_person_in_cam17','extra_person_in_cam18','correctness'];
if(!required.every(column=>header.includes(column)))throw new Error('Required annotation columns are missing.');
const rows=lines.map((line,index)=>{
 const cells=line.split(';');if(cells.length!==header.length)throw new Error(`Unexpected CSV structure at data row ${index+1}`);
 const raw=Object.fromEntries(header.map((name,i)=>[name,cells[i]]));
 for(const key of required.filter(key=>!['video_id','cam17_orientation'].includes(key)))raw[key]=Number(raw[key]);
 if(![0,1].includes(raw.correctness)||raw.last_frame<=raw.first_frame)throw new Error('Invalid correctness or frame range.');
 return raw;
});
const unique=items=>[...new Set(items)];
const countBy=(items,key)=>Object.fromEntries(unique(items.map(item=>String(item[key]))).sort().map(value=>[value,items.filter(item=>String(item[key])===value).length]));
const ids=rows.map(row=>`${row.video_id}:${row.repetition_number}`);
if(unique(ids).length!==ids.length)throw new Error('Duplicate logical repetition IDs.');
const exerciseSummary=id=>{
 const group=rows.filter(row=>row.exercise_id===id);
 return {exerciseId:id,exercise:id===3?'incline/table push-up':'squat',repetitions:group.length,correctness:countBy(group,'correctness'),
 persons:unique(group.map(row=>row.person_id)).sort((a,b)=>a-b),recordings:unique(group.map(row=>row.video_id)).length,
 orientationCamera17:countBy(group,'cam17_orientation'),lightsOn:countBy(group,'lights_on'),mocapErroneous:countBy(group,'mocap_erroneous'),
 extraPersonCamera17:countBy(group,'extra_person_in_cam17'),extraPersonCamera18:countBy(group,'extra_person_in_cam18'),
 personsWithBothLabels:unique(group.map(row=>row.person_id)).filter(person=>unique(group.filter(row=>row.person_id===person).map(row=>row.correctness)).length===2).sort((a,b)=>a-b)};
};
const exercises=[exerciseSummary(3),exerciseSummary(6)];
const eligible=rows.filter(row=>[3,6].includes(row.exercise_id)&&(row.last_frame-row.first_frame)/30>=2&&(row.last_frame-row.first_frame)/30<=120&&row.mocap_erroneous===0);
const persons=unique(eligible.map(row=>row.person_id)).sort((a,b)=>a-b).filter(person=>[3,6].every(exercise=>[0,1].every(label=>eligible.some(row=>row.person_id===person&&row.exercise_id===exercise&&row.correctness===label)))).slice(0,2);
const candidates=[];
for(const person of persons)for(const exercise of [3,6])for(const label of [0,1]){
 const pool=eligible.filter(row=>row.person_id===person&&row.exercise_id===exercise&&row.correctness===label).sort((a,b)=>b.lights_on-a.lights_on||(a.extra_person_in_cam17+a.extra_person_in_cam18)-(b.extra_person_in_cam17+b.extra_person_in_cam18)||a.video_id.localeCompare(b.video_id)||a.repetition_number-b.repetition_number);
 const row=pool[0];
 candidates.push({...row,group_id:`rehab24-6:person-${person}`,repetition_id:`rehab24-6:${row.video_id}:rep-${row.repetition_number}`,camera_views:['Camera17','Camera18'],
 intended_use:'research-only annotation pilot; development only; not a held-out evaluation',media_obtained:false,inference_run:false});
}
const appFiles=['frontend/src/analysis/measurements.ts','frontend/src/analysis/types.ts'];
const sourceHashes={};for(const path of appFiles)sourceHashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
const report={protocol:'rehab24-form-feasibility-v1',generatedAt:new Date().toISOString(),source:{record:'https://zenodo.org/records/13305826',doi:'10.5281/zenodo.13305826',license:'CC-BY-NC-4.0',annotationMd5:md5,annotationSha256:createHash('sha256').update(bytes).digest('hex'),metadataSha256:createHash('sha256').update(await readFile(metadataPath)).digest('hex'),localLabels:relative(root,csvPath).replaceAll('\\','/')},
 totalRepetitions:rows.length,totalRecordings:unique(rows.map(row=>row.video_id)).length,totalPersons:unique(rows.map(row=>row.person_id)).length,exerciseIds:unique(rows.map(row=>row.exercise_id)).sort((a,b)=>a-b),labelColumns:header,
 labelsIncludeNamedFaultTypes:false,labelsIncludeExactFaultTimestamps:false,labelsIncludeCorrectionQuality:false,exercises,
 candidatePilot:{logicalRepetitions:candidates.length,pairedCameraViews:candidates.length*2,persons,selection:'First two eligible person IDs with both correctness labels in each target exercise; one rep per exercise/label, preferring lights on and fewer visible bystanders, then recording/rep order. Require mocap_erroneous=0 and nominal frame-span duration 2–120s.',file:'private/research-candidates.jsonl'},
 appSourceHashes:sourceHashes,diagnostic:{kind:'metadata and output-contract compatibility audit',clipsDownloaded:0,clipsInferred:0,formAccuracy:null,formAccuracyReason:'The current report schema has no binary correctness or named-fault prediction. Report status and generic observation presence are not correctness predictions.',pullupCoverage:'none',trainingPerformed:false,productWeightsProduced:false}};
await mkdir(resolve(here,'private'),{recursive:true});
await writeFile(resolve(here,'private/research-candidates.jsonl'),candidates.map(row=>JSON.stringify(row)).join('\n')+'\n');
await writeFile(resolve(here,'metadata-diagnostic.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({totalRepetitions:report.totalRepetitions,exercises,candidatePilot:report.candidatePilot,diagnostic:report.diagnostic},null,2));
