/* Local MediaPipe 0.10.32, Apache-2.0. Classic worker supports the WASM loader's importScripts. */
self.exports = {};
importScripts('/mediapipe/vision_bundle.js');
let landmarker;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const files = await self.exports.FilesetResolver.forVisionTasks('/mediapipe');
      landmarker = await self.exports.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/models/pose_landmarker_full.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numPoses: 2, minPoseDetectionConfidence: .5,
        minPosePresenceConfidence: .5, minTrackingConfidence: .5,
      });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      try {
        const result = landmarker.detectForVideo(data.bitmap, data.timestamp * 1000 + 1);
        self.postMessage({ type: 'result', landmarks: result.landmarks });
      } finally { data.bitmap.close(); }
    }
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
};
