/** Explicit public ID/field allowlists: never opens a private artifact folder. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT} from '../lib.mjs';
const manifest=JSON.parse(readFileSync(resolve(ROOT,'frontend/artifacts/cropped-evaluation/manifest.json'),'utf8'));
const modelNames=['model.json','group1-shard1of3.bin','group1-shard2of3.bin','group1-shard3of3.bin'];
const allowedHashes=new Set(modelNames.map(n=>'artifacts/recovery-models/movenet-thunder/'+n).concat(['measurements','movementReview','partialMovementReview','twoPointMovementReview','coaching'].map(n=>'src/analysis/'+n+'.ts')));
const cases=['navy-original','empty-scene'].map(id=>{
 const input=manifest.find(v=>v.id===id);if(!input||input.privacy!=='public')throw Error('Expected allowlisted public input: '+id);
 const result=JSON.parse(readFileSync(resolve(ROOT,'frontend/artifacts/cropped-evaluation/results/movenet-v1',id+'-summary.json'),'utf8'));
 if(result.id!==id||result.privacy!=='public'||!result.engineStable||result.externalRequests!==0)throw Error('Expected stable, local, public-only result.');
 return {id,sourceGroup:input.sourceGroup??null,sourceUrl:input.sourceUrl??null,transformation:input.transformation,sourceSha256:input.sha256,
  samples:result.samples,seconds:result.seconds,status:result.status,visibleChainFrames:{left:result.chain[0],right:result.chain[1]},visiblePairFrames:{left:result.pair[0],right:result.pair[1]},
  observationIds:result.observationIds,strengthIds:result.strengthIds,evidenceWindows:result.evidence,
  fingerprints:Object.fromEntries(Object.entries(result.hashes).filter(([path])=>allowedHashes.has(path)))};
});
const runtimeFiles={tensorflowJs:'@tensorflow/tfjs/dist/tf.min.js',poseDetection:'@tensorflow-models/pose-detection/dist/pose-detection.min.js'};
const runtimeHashes=Object.fromEntries(Object.entries(runtimeFiles).map(([key,path])=>[key,createHash('sha256').update(readFileSync(resolve(ROOT,'.tools/movenet-evaluation/node_modules',path))).digest('hex')]));
const output={evaluatedAt:new Date().toISOString(),experimentalOnly:true,productionIntegrated:false,privateDataIncluded:false,independentFormLabels:0,
 model:'MoveNet SinglePose Thunder v4',modelSource:'https://tfhub.dev/google/tfjs-model/movenet/singlepose/thunder/4',license:'Apache-2.0 per official model card',
 runtime:{tensorflowJs:'4.22.0',poseDetection:'2.1.3',backend:'WebGL',smoothing:true,hashes:runtimeHashes},
 criterion:'Existing 0.65 downstream gate retained conservatively; MoveNet confidence is not calibrated as MediaPipe visibility. The official 0.3 keypoint default is not a validated coaching threshold.',
 limitations:['SinglePose cannot independently reject multiple-person ambiguity.','The model can predict occluded joints; in-bounds confidence alone is not visual ground truth.','Only 12 actual shoulder/elbow/wrist/hip/knee/ankle outputs are mapped; other slots have zero confidence.','Two public controls do not establish general accuracy, calibration, or inability to track cropped people.'],cases};
writeFileSync(resolve(ROOT,'evaluation/cropped/public-movenet-results.json'),JSON.stringify(output,null,2)+'\n');
console.log('Exported 2 allowlisted public MoveNet controls. No private artifacts or diagnostics were read.');
