import type { ExerciseId } from '../game/types';
import { measure, summarize } from './measurements';
import type { AnalysisProgress, AnalysisReport, EvidenceFrame, Landmark } from './types';
export type { AnalysisProgress, AnalysisReport, EvidenceFrame } from './types';

function aborted(signal: AbortSignal) { if (signal.aborted) throw new DOMException('Analysis cancelled', 'AbortError'); }
function mediaEvent(video: HTMLVideoElement, event: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve,reject) => {
    const clear = () => { clearTimeout(timer); video.removeEventListener(event,done); video.removeEventListener('error',bad); signal.removeEventListener('abort',cancel); };
    const done = () => { clear(); resolve(); }, bad = () => { clear(); reject(new Error('This browser could not decode the video. Try an MP4 or WebM recording.')); };
    const cancel = () => { clear(); reject(new DOMException('Analysis cancelled','AbortError')); };
    const timer = setTimeout(bad,15000);
    video.addEventListener(event,done,{ once:true }); video.addEventListener('error',bad,{ once:true }); signal.addEventListener('abort',cancel,{ once:true });
    if (signal.aborted) cancel();
  });
}
function response(worker: Worker, signal: AbortSignal): Promise<{ landmarks?: Landmark[][] }> {
  return new Promise((resolve,reject) => {
    const clear = () => { clearTimeout(timer); worker.removeEventListener('message',done); worker.removeEventListener('error',bad); signal.removeEventListener('abort',cancel); };
    const done = (event: MessageEvent) => { clear(); event.data.type === 'error' ? reject(new Error(event.data.message)) : resolve(event.data); };
    const bad = () => { clear(); reject(new Error('The local motion model could not start. Reload the app and try again.')); };
    const cancel = () => { clear(); reject(new DOMException('Analysis cancelled','AbortError')); };
    const timer = setTimeout(bad,90000);
    worker.addEventListener('message',done); worker.addEventListener('error',bad); signal.addEventListener('abort',cancel,{ once:true });
    if (signal.aborted) cancel();
  });
}

export async function analyzeVideo(file: File, exercise: ExerciseId, onProgress: (progress: AnalysisProgress) => void, signal: AbortSignal): Promise<AnalysisReport> {
  aborted(signal);
  if (file.size > 150 * 1024 * 1024) throw new Error('Choose a clip smaller than 150 MB.');
  const url = URL.createObjectURL(file), video = document.createElement('video');
  video.preload = 'auto'; video.muted = true; video.playsInline = true;
  let worker: Worker | undefined;
  try {
    const loaded = mediaEvent(video,'loadeddata',signal); video.src = url; video.load(); await loaded;
    const { duration, videoWidth: width, videoHeight: height } = video;
    if (!Number.isFinite(duration) || duration < 2 || duration > 60) throw new Error('Choose a video between 2 and 60 seconds, with one complete set.');
    if (width < 240 || height < 180) throw new Error('This recording is too small to review. Use a clearer video of at least 240 × 180 pixels.');
    onProgress({ stage: 'loading', completed: 0, total: 0, message: 'Waking up the local motion model. Your video stays on this computer.' });
    worker = new Worker('/mediapipe/pose-worker.js');
    const ready = response(worker,signal); worker.postMessage({ type: 'init' }); await ready;
    const total = Math.min(240,Math.floor(duration*4)), frames: EvidenceFrame[] = [];
    for (let i = 0; i < total; i++) {
      aborted(signal);
      const timestamp = .02 + i * (duration-.08) / Math.max(1,total-1);
      const seeked = mediaEvent(video,'seeked',signal); video.currentTime = timestamp; await seeked;
      const bitmap = await createImageBitmap(video, { resizeWidth: Math.min(width,960), resizeHeight: Math.round(height * Math.min(width,960) / width) });
      if (signal.aborted) { bitmap.close(); aborted(signal); }
      const resultPromise = response(worker,signal); worker.postMessage({ type:'frame', timestamp, bitmap },[bitmap]);
      const result = await resultPromise;
      // Multiple visible people cannot be reliably assigned to the exerciser.
      const landmarks = result.landmarks?.length === 1 ? result.landmarks[0] : [];
      const frame = { timestamp, landmarks, metrics: measure(landmarks,exercise,width,height) };
      frames.push(frame); onProgress({ stage:'sampling', completed:i+1,total,message:`Following your movement · ${i+1} / ${total} frames`,frame });
    }
    onProgress({ stage:'summarizing',completed:total,total,message:'Finding the moments worth reviewing.' });
    aborted(signal); return summarize(frames,exercise,duration,width,height);
  } finally { worker?.terminate(); video.pause(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}
