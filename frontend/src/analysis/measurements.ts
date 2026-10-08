import type { ExerciseId } from '../game/types';
import type { AnalysisReport, EvidenceFrame, FrameMetrics, Landmark } from './types';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const visible = (p: Landmark | undefined) => !!p && p.visibility >= .65 && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > .015 && p.x < .985 && p.y > .015 && p.y < .985;
// Pixel aspect correction is essential: normalized x/y do not use the same scale.
export function angle(a: Landmark, b: Landmark, c: Landmark, aspect: number): number {
  const u = [(a.x - b.x) * aspect, a.y - b.y], v = [(c.x - b.x) * aspect, c.y - b.y];
  const size = Math.hypot(...u) * Math.hypot(...v);
  return size < 1e-7 ? NaN : Math.acos(clamp((u[0] * v[0] + u[1] * v[1]) / size)) * 180 / Math.PI;
}
export function measure(landmarks: Landmark[], exercise: ExerciseId, width: number, height: number): FrameMetrics | null {
  if (landmarks.length !== 33 || width <= 0 || height <= 0) return null;
  const sides = [[11,13,15,23,25,27], [12,14,16,24,26,28]];
  const choices = sides.map((ids, side) => ({ ids, side, quality: Math.min(...ids.map(i => visible(landmarks[i]) ? landmarks[i].visibility : 0)) })).sort((a,b) => b.quality - a.quality);
  if (choices[0].quality < .65 || !visible(landmarks[0])) return null;
  const { ids: [s,e,w,h,k,a], side } = choices[0];
  const p = landmarks, aspect = width / height;
  const elbow = angle(p[s],p[e],p[w],aspect), knee = angle(p[h],p[k],p[a],aspect), hip = angle(p[s],p[h],p[a],aspect);
  const bodyTilt = Math.atan2(Math.abs((p[h].x-p[s].x)*aspect),Math.abs(p[h].y-p[s].y)) * 180 / Math.PI;
  if (![elbow,knee,hip,bodyTilt].every(Number.isFinite)) return null;
  // Orientation is a rejection gate, never a claim to identify an exercise with certainty.
  const orientationMatches = exercise === 'pushup' ? bodyTilt > 52 && p[w].y > p[s].y
    : exercise === 'pullup' ? bodyTilt < 45 && p[w].y < p[s].y - .035
    : bodyTilt < 65 && p[a].y > p[h].y + .08 && p[w].y > p[0].y;
  return { elbow, knee, hip, bodyTilt, side: side === 0 ? 'left' : 'right', orientationMatches };
}

// This counts complete visible excursions, not certified repetitions. Missing frames break a cycle.
export function countCycles(frames: EvidenceFrame[], metric: 'knee' | 'elbow'): number {
  const values = frames.flatMap(f => f.metrics?.orientationMatches ? [f.metrics[metric]] : []);
  if (values.length < 8) return 0;
  const ordered = [...values].sort((a,b)=>a-b);
  // Ignore isolated angle spikes; visibility alone does not remove landmark jitter.
  const lo = ordered[Math.floor((ordered.length-1)*.1)], hi = ordered[Math.ceil((ordered.length-1)*.9)];
  if (hi-lo < 28) return 0;
  const lower = lo + (hi-lo)*.25, upper = hi - (hi-lo)*.25;
  let state: 'start' | 'high' | 'low' = 'start', count = 0, last = -Infinity, startTime = 0, side = '';
  for (const f of frames) {
    const m = f.metrics;
    if (!m?.orientationMatches || f.timestamp-last > .8 || side !== m.side) { state = 'start'; }
    last = f.timestamp; side = m?.side || '';
    if (!m?.orientationMatches) continue;
    const value = m[metric];
    if (state === 'start' && value >= upper) { state = 'high'; startTime = f.timestamp; }
    else if (state === 'high' && value <= lower) state = 'low';
    else if (state === 'low' && value >= upper) {
      if (f.timestamp-startTime >= .7) count++;
      state = 'high'; startTime = f.timestamp;
    }
  }
  return count;
}

export function summarize(frames: EvidenceFrame[], exercise: ExerciseId, duration: number, width: number, height: number): AnalysisReport {
  const valid = frames.filter(f => f.metrics?.orientationMatches), coverage = frames.length ? valid.length / frames.length : 0;
  const metric = exercise === 'squat' ? 'knee' : 'elbow';
  const repetitions = countCycles(frames, metric);
  const usable = coverage >= .6 && valid.length >= 8 && repetitions >= 1;
  const report: AnalysisReport = {
    id: crypto.randomUUID(), exercise, status: usable ? 'usable' : 'insufficient', duration, width, height,
    sampledFrames: frames.length, usableFrames: valid.length, coverage, frames, findings: [], estimatedRepetitions: usable ? repetitions : 0,
    summary: usable ? `I followed ${repetitions} complete visible movement ${repetitions === 1 ? 'cycle' : 'cycles'}. Let’s review two moments together.`
      : valid.length < 8 || coverage < .6 ? 'I couldn’t follow the required joints and exercise position consistently enough to review this set.' : 'I can see a pose, but I couldn’t follow a complete exercise cycle. Please include the beginning, movement and return.',
    limitations: ['These are estimates from a single camera view, not a diagnosis or a safety certification.',
      'Projected angles change with camera position. Joint visibility is not a probability that your form is correct.',
      'Movement cycles and exercise matching use exploratory rules; they are not validated repetition or form scores.',
      'I cannot determine pain, shoulder rotation, load suitability or whether a movement is safe for you from this clip.'],
    sources: [{ title: 'How the body landmarks are estimated · Google MediaPipe', url: 'https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker' },
      exercise === 'pushup' ? {title:'Push-up technique reference · NASM',url:'https://www.nasm.org/resource-center/exercise-library/push-up'}
        : exercise === 'squat' ? {title:'Bodyweight squat technique reference · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/'}
          : {title:'Pull-up technique reference · ACE',url:'https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/'}],
  };
  if (!usable) {
    report.findings.push({ id: 'capture', title: 'A clearer set would help', timestamp: valid[0]?.timestamp ?? 0,
      observation: `${valid.length} of ${frames.length} sampled frames met the visibility and position checks for ${exercise === 'pullup' ? 'pull-ups' : exercise === 'pushup' ? 'push-ups' : 'squats'}.`,
      suggestion: 'Record one person from a stable side view, with your head, hands and feet visible. Include at least one full repetition at your normal pace; leave a little space around your body.' });
    return report;
  }
  const sorted = [...valid].sort((a,b) => a.metrics![metric]-b.metrics![metric]), low = sorted[0], high = sorted[sorted.length-1];
  const joint = metric === 'knee' ? 'knee' : 'elbow';
  report.findings.push({ id: 'range', title: 'Your visible movement range', timestamp: low.timestamp,
    observation: `The ${low.metrics!.side} ${joint} appears most bent here: about ${Math.round(low.metrics![metric])}° in this camera view. Across the set, the projected ${joint} angle ranged from ${Math.round(low.metrics![metric])}° to ${Math.round(high.metrics![metric])}°.`,
    suggestion: 'Play this moment slowly and compare it with your more extended position. Use the same camera position next time to make the comparison useful. These angles do not set a target depth.' });
  report.findings.push({ id: 'return', title: 'The return position', timestamp: high.timestamp,
    observation: `At ${high.timestamp.toFixed(1)} seconds the visible ${joint} is more extended, around ${Math.round(high.metrics![metric])}°. This is an observed position, not a judgement that you should extend further.`,
    suggestion: 'Review the transition into and out of this moment. Aim for a movement you can control; if you are unsure about your individual range, get guidance from a qualified coach.' });
  if (exercise === 'pushup') {
    const bent = [...valid].sort((a,b) => a.metrics!.hip-b.metrics!.hip)[0];
    report.findings.push({ id: 'body-line', title: 'Check your shoulder–hip–ankle line', timestamp: bent.timestamp,
      observation: `The projected shoulder–hip–ankle angle is about ${Math.round(bent.metrics!.hip)}° here. A change in this line can also come from perspective or a tracking error.`,
      suggestion: 'Watch the overlaid joints against the actual video. If they line up correctly, check whether your hips are moving with your shoulders; the overlay is a prompt to review, not proof of a fault.' });
  }
  return report;
}
