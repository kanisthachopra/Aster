import {test} from 'node:test';import assert from 'node:assert/strict';
import {extractActivityPoseFeatures,ACTIVITY_POSE_FEATURE_NAMES} from '../../frontend/src/analysis/activityFeatures.ts';
const index=name=>ACTIVITY_POSE_FEATURE_NAMES.indexOf(name);
function syntheticFrames(anchor){return Array.from({length:32},(_,i)=>{
 const d=.05*Math.sin(i*Math.PI/8),landmarks=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
 for(const offset of [0,1])for(const [joint,y] of [[11,.35+d],[13,.3+d],[15,anchor==='hand'?.18:.45+d],[23,.6+d],[27,anchor==='foot'?.86:.86+d]])landmarks[joint+offset]={x:.4+offset*.1,y,z:0,visibility:1};
 return {timestamp:i*.25,landmarks,metrics:null};
});}
test('synthetic fixed-hand and fixed-foot histories produce distinct temporal anchor evidence',()=>{
 const hand=extractActivityPoseFeatures(syntheticFrames('hand'),640,480),foot=extractActivityPoseFeatures(syntheticFrames('foot'),640,480);
 assert.ok(hand[index('peakHandAnchoredBodyMotion')]>0.1);assert.ok(foot[index('peakFootAnchoredBodyMotion')]>0.1);
 assert.ok(hand[index('handAnchorContrast')]>foot[index('handAnchorContrast')]);assert.ok(foot[index('footAnchorContrast')]>hand[index('footAnchorContrast')]);
});
test('pose features retain framing-scale invariance and never fill missing wrists',()=>{
 const frames=syntheticFrames('hand'),original=extractActivityPoseFeatures(frames,640,480);
 const transformed=frames.map(f=>({...f,landmarks:f.landmarks.map(p=>({...p,x:p.x*.7+.1,y:p.y*.7+.1}))}));
 const other=extractActivityPoseFeatures(transformed,640,480);assert.ok(original.every((v,i)=>Math.abs(v-other[i])<1e-10));
 const missing=frames.map(f=>({...f,landmarks:f.landmarks.map((p,i)=>[15,16].includes(i)?{...p,visibility:0}:p)}));
 const features=extractActivityPoseFeatures(missing,640,480);assert.equal(features[index('wristCoverage')],0);assert.equal(features[index('wristShoulderCoverage')],0);assert.equal(features[index('peakHandAnchoredBodyMotion')],0);
 assert.ok(extractActivityPoseFeatures([],640,480).every(Number.isFinite));
});
test('a left shoulder and right hip alone do not create a synthetic torso scale',()=>{
 const frames=syntheticFrames('hand').map(f=>({...f,landmarks:f.landmarks.map((p,i)=>[12,23].includes(i)?{...p,visibility:0}:p)}));
 const features=extractActivityPoseFeatures(frames,640,480);assert.equal(features[index('torsoCoverage')],0);assert.equal(features[index('peakHandAnchoredBodyMotion')],0);
});
