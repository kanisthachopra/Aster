// Evaluation-only worker. Not imported by the app. All assets and inference stay local.
self.exports = {};
importScripts('/mediapipe/vision_bundle.js');
let landmarker;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      const files = await self.exports.FilesetResolver.forVisionTasks('/mediapipe');
      landmarker = await self.exports.PoseLandmarker.createFromOptions(files, {
        baseOptions: {modelAssetPath:'/models/pose_landmarker_full.task',delegate:'CPU'},
        runningMode:'IMAGE',numPoses:2,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5,
      });
      self.postMessage({type:'ready'});
    } else if (data.type === 'frame') {
      try {
        const bitmap=data.bitmap, width=bitmap.width, height=bitmap.height;
        const original=landmarker.detect(bitmap).landmarks;
        const px=Math.round(width*.2),py=Math.round(height*.2);
        const canvas=new OffscreenCanvas(width+2*px,height+2*py),ctx=canvas.getContext('2d');
        ctx.fillStyle='#242424';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,px,py);
        const padded=landmarker.detect(canvas).landmarks.map(pose=>pose.map(p=>{
          const x=(p.x*canvas.width-px)/width,y=(p.y*canvas.height-py)/height;
          // Padding supplies detector context, never evidence for invisible anatomy.
          const inside=x>.005&&x<.995&&y>.005&&y<.995;
          return {...p,x,y,z:p.z*canvas.width/width,visibility:inside?p.visibility:0};
        }));
        const ambiguous=original.length>1||padded.length>1;
        self.postMessage({type:'result',ambiguous,counts:[original.length,padded.length],
          image:!ambiguous&&original.length===1?original[0]:[],padded:!ambiguous&&padded.length===1?padded[0]:[]});
      } finally { data.bitmap.close(); }
    }
  } catch(error) { self.postMessage({type:'error',message:error instanceof Error?error.message:String(error)}); }
};
