import type { AnalysisReport, EvidenceFrame, Landmark } from './types';
import type { MovementEvidence, MovementReview, MovementSourceKey } from './movementReview';
import { getTwoPointMovementReview, phaseHasDwell } from './twoPointMovementReview';

type Point = { x: number; y: number };
type Sample = { t: number; points: [Point, Point, Point]; lengths: [number, number]; angle: number };
type Window = { start: number; bend: number; end: number };
export type PartialMovementReview = Pick<MovementReview, 'observations' | 'strengths' | 'limits'>;
const visible = (p: Landmark | undefined): p is Landmark => !!p && p.visibility >= .65 && Number.isFinite(p.x) && Number.isFinite(p.y)
  && p.x > .005 && p.x < .995 && p.y > .005 && p.y < .995;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const span = (values: number[]) => Math.max(...values) - Math.min(...values);
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Local image-plane phase timing, not a full-ROM or good/bad-form classifier.
 * Visibility stays at .65. The 28-degree excursion comes from the existing
 * cycle screen; it establishes measurable change, never a target joint angle.
 * New quality gates are fixed engineering hypotheses, not corpus-calibrated:
 * >=.04 image-height links, <=25% inter-frame link change, <=35 degree jump,
 * <=.4s gaps, >=8 samples/1.5s, stable visible support and local link lengths.
 * We never infer cropped landmarks, bridge gaps, or update report status/reps.
 */
function chainRuns(r: AnalysisReport): Sample[][] {
  if (!(r.width > 0 && r.height > 0)) return [];
  const ids = r.exercise === 'squat' ? [23, 25, 27] : [11, 13, 15];
  const eligible = (f: EvidenceFrame, side: number) => f.metrics?.orientation !== 'incompatible'
    && ids.every(i => visible(f.landmarks[i + side]));
  const side = r.frames.filter(f => eligible(f, 0)).length >= r.frames.filter(f => eligible(f, 1)).length ? 0 : 1;
  const result: Sample[][] = []; let run: Sample[] = [];
  const flush = () => { if (run.length >= 8 && run.at(-1)!.t - run[0].t >= 1.5) result.push(run); run = []; };
  for (const f of r.frames) {
    if (!Number.isFinite(f.timestamp) || !eligible(f, side)) { flush(); continue; }
    const points = ids.map(i => ({ x: f.landmarks[i + side].x * r.width / r.height, y: f.landmarks[i + side].y })) as Sample['points'];
    const lengths: Sample['lengths'] = [distance(points[0], points[1]), distance(points[1], points[2])];
    if (Math.min(...lengths) < .04) { flush(); continue; }
    const scale = lengths[0] + lengths[1];
    const angle = Math.acos(Math.max(-1, Math.min(1, ((points[0].x - points[1].x) * (points[2].x - points[1].x)
      + (points[0].y - points[1].y) * (points[2].y - points[1].y)) / (lengths[0] * lengths[1])))) * 180 / Math.PI;
    // Context uses only the observed chain; it does not certify the exercise.
    const delta = points[2].y - points[0].y;
    if (r.exercise === 'pullup' ? delta >= -.08 * scale : delta <= .08 * scale) { flush(); continue; }
    const previous = run.at(-1);
    if (previous && (f.timestamp <= previous.t || f.timestamp - previous.t > .4 || Math.abs(angle - previous.angle) > 35
      || lengths.some((v, i) => Math.abs(v / previous.lengths[i] - 1) > .25)
      || points.some((p, i) => distance(p, previous.points[i]) / scale > .5))) flush();
    run.push({ t: f.timestamp, points, lengths, angle });
  }
  flush(); return result;
}

function windows(run: Sample[]): Window[] {
  const result: Window[] = []; let start = 0, bend = 0, end = 0;
  let phase: 'bending' | 'returning' | 'returned' = 'bending';
  for (let i = 1; i < run.length; i++) {
    const a = run[i].angle;
    if (phase === 'bending') {
      if (a > run[start].angle) start = i;
      if (run[start].angle - a > 28) { bend = i; phase = 'returning'; }
    } else if (phase === 'returning') {
      if (a < run[bend].angle) bend = i;
      if (a - run[bend].angle > 28) { end = i; phase = 'returned'; }
    } else {
      if (a > run[end].angle) end = i;
      if (run[end].angle - a > 28) { result.push({ start, bend, end }); start = end; bend = i; phase = 'returning'; }
    }
  }
  if (phase === 'returned') result.push({ start, bend, end });
  return result;
}

function supported(r: AnalysisReport, run: Sample[], w: Window, repeatability = false): boolean {
  const { start, bend, end } = w, part = run.slice(start, end + 1);
  if (bend - start < 3 || end - bend < 3 || Math.abs(run[start].angle - run[end].angle) > 14) return false;
  if (run[bend].t - run[start].t < .75 || run[end].t - run[bend].t < .75) return false;
  const bending = run.slice(start + 1, bend + 1).filter((p, i) => p.angle <= run[start + i].angle + 3).length / (bend - start);
  const returning = run.slice(bend + 1, end + 1).filter((p, i) => p.angle >= run[bend + i].angle - 3).length / (end - bend);
  if (bending < .8 || returning < .8) return false;
  // Large projected link changes suggest a view/depth change; angle timing then
  // need not describe the same plane of movement. Reject rather than correct.
  if (!repeatability && [0, 1].some(i => Math.max(...part.map(p => p.lengths[i])) / Math.min(...part.map(p => p.lengths[i])) > 1.6)) return false;
  const scale = median(part.map(p => p.lengths[0] + p.lengths[1]));
  const anchorTravel = Math.hypot(span(part.map(p => p.points[2].x)), span(part.map(p => p.points[2].y))) / scale;
  if (anchorTravel >= .2) return false;
  const relative = (p: Sample) => (p.points[0].y - p.points[2].y) / scale;
  const travel = relative(run[bend]) - relative(run[start]);
  if (r.exercise === 'pullup' ? travel >= -.08 : travel <= .08) return false;
  return Math.abs(relative(run[start]) - relative(run[end])) < .15;
}

/** Repeated projected joint paths may include the same foreshortening twice.
 * Match both link-length and image-position profiles instead of treating
 * projected link lengths as rigid physical lengths. Tempo keeps its gate. */
function matchingChainProfiles(run: Sample[], a: Window, b: Window): boolean {
  const part=run.slice(a.start,b.end+1),scale=median(part.map(p=>p.lengths[0]+p.lengths[1]));
  if(Math.hypot(span(part.map(p=>p.points[2].x)),span(part.map(p=>p.points[2].y)))/scale>=.2)return false;
  const profile=(start:number,end:number)=>[0,.25,.5,.75,1].map(fraction=>{
    const t=run[start].t+(run[end].t-run[start].t)*fraction;
    let right=start;while(right<end&&run[right].t<t)right++;
    const left=Math.max(start,right-1),duration=run[right].t-run[left].t,mix=duration>0?(t-run[left].t)/duration:0;
    return {
      points:[0,1].map(i=>({
        x:(run[left].points[i].x-run[left].points[2].x)*(1-mix)+(run[right].points[i].x-run[right].points[2].x)*mix,
        y:(run[left].points[i].y-run[left].points[2].y)*(1-mix)+(run[right].points[i].y-run[right].points[2].y)*mix,
      })),
      lengths:[0,1].map(i=>run[left].lengths[i]*(1-mix)+run[right].lengths[i]*mix),
    };
  });
  const first=[...profile(a.start,a.bend),...profile(a.bend,a.end)],second=[...profile(b.start,b.bend),...profile(b.bend,b.end)];
  return first.every((p,i)=>p.points.every((point,j)=>distance(point,second[i].points[j])/scale<=.15)
    &&p.lengths.every((v,j)=>Math.abs(v-second[i].lengths[j])/scale<=.15));
}

export function getPartialMovementReview(r: AnalysisReport): PartialMovementReview {
  const out: PartialMovementReview = { observations: [], strengths: [], limits: [] };
  if (/shifts abruptly|change of tracked person|does not consistently match this station/i.test((r.captureNotes ?? []).join(' ') + ' ' + r.summary)) {
    out.limits.push('I cannot follow one person or match this movement to the station reliably enough to compare its timing.'); return out;
  }
  const chain = r.exercise === 'squat' ? 'leg' : 'arm';
  const sourceKey = `ace-${r.exercise}` as MovementSourceKey;
  for (const run of chainRuns(r)) {
    const candidates = windows(run);
    const cycles = candidates.filter(w => supported(r, run, w));
    const repeatableCycles = candidates.filter(w => supported(r, run, w, true));
    const evidence = (w: Window, id: string, title: string, observation: string, cue: string, why: string): MovementEvidence => ({
      id, title, observation, cue, why, timestamp: run[w.start].t, endTimestamp: run[w.end].t,
      support: { frames: w.end - w.start + 1, durationSeconds: Number((run[w.end].t - run[w.start].t).toFixed(2)) }, sourceKey,
    });
    for (const w of cycles) {
      const bendTime = run[w.bend].t - run[w.start].t, returnTime = run[w.end].t - run[w.bend].t;
      const lowering = r.exercise === 'pullup' ? returnTime : bendTime, other = r.exercise === 'pullup' ? bendTime : returnTime;
      if (other / lowering <= 1.8) continue;
      const times=run.map(p=>p.t),angles=run.map(p=>p.angle);
      if(phaseHasDwell(times,angles,w.start,w.bend,3)||phaseHasDwell(times,angles,w.bend,w.end,3))continue;
      out.observations.push(evidence(w, `${r.exercise}-${chain}-tempo`, 'Give the lowering part time',
        `In this visible ${chain} movement, the lowering part takes noticeably less time than ${r.exercise === 'pullup' ? 'pulling back up' : 'coming back up'}.`,
        r.exercise === 'pullup' ? 'If you are practising controlled pull-ups, give the lowering part a little more time.'
          : 'If you want a steadier pace, give the lowering part a little more time before coming back up.',
        'This gives you a chance to practise a deliberate return. Different tempos can be intentional; faster does not automatically mean wrong.'));
    }
    for (let i = 1; i < repeatableCycles.length; i++) {
      const a = repeatableCycles[i - 1], b = repeatableCycles[i]; if (a.end !== b.start) continue;
      const aBend = run[a.bend].t - run[a.start].t, bBend = run[b.bend].t - run[b.start].t;
      const aReturn = run[a.end].t - run[a.bend].t, bReturn = run[b.end].t - run[b.bend].t;
      if (Math.max(aBend, bBend) / Math.min(aBend, bBend) > 1.25 || Math.max(aReturn, bReturn) / Math.min(aReturn, bReturn) > 1.25
        || !matchingChainProfiles(run,a,b)) continue;
      out.strengths.push(evidence({ start: a.start, bend: a.bend, end: b.end }, `${r.exercise}-${chain}-rhythm`, 'A repeatable rhythm',
        `Your visible ${chain} follows a similar bending and returning path in the image, with similar timing across these two movements.`,
        'Keep that repeatable rhythm when it fits the pace you are practising.',
        'A repeatable pace makes it easier to notice a change on your next attempt. This does not require the two phases to have equal speed.'));
    }
  }
  out.observations = out.observations.slice(0, 1); out.strengths = out.strengths.slice(0, 1);
  if (!out.observations.length && !out.strengths.length) return getTwoPointMovementReview(r);
  if (out.observations.length || out.strengths.length) {
    out.limits.push(`This compares only the visible ${chain} bending and returning. It does not establish a full rep, your full range, or what hidden body parts are doing.`);
    out.limits.push('These are timings in the camera view; intentional tempo choices and movement toward the camera can change their meaning.');
    if (!r.frames.some(f => f.metrics?.orientationMatches)) out.limits.push('The visible movement fits this timing comparison, but the crop does not confirm the whole exercise you picked.');
  }
  return out;
}
