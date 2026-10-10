import type { AnalysisReport, EvidenceFrame, Landmark } from './types';

export const MOVEMENT_SOURCES = {
  'ace-pushup': { title: 'ACE push-up guide', url: 'https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/' },
  'ace-pullup': { title: 'ACE pull-up guide', url: 'https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/' },
  'ace-squat': { title: 'ACE bodyweight squat guide', url: 'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/' },
} as const;
export type MovementSourceKey = keyof typeof MOVEMENT_SOURCES;
export interface MovementEvidence {
  id: string; title: string; observation: string; cue: string; why: string;
  timestamp: number; endTimestamp: number;
  support: { frames: number; durationSeconds: number };
  sourceKey: MovementSourceKey;
}
export interface MovementReview {
  observations: MovementEvidence[]; strengths: MovementEvidence[];
  practiceTip: { title: string; cue: string; why: string; sourceKey: MovementSourceKey };
  limits: string[];
}
type Point = { x: number; y: number };
type Sample = { t: number; s: Point; h: Point; a: Point; w: Point; scale: number };
const visible = (p: Landmark | undefined): p is Landmark => !!p && p.visibility >= .65 && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > .005 && p.x < .995 && p.y > .005 && p.y < .995;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const span = (v: number[]) => Math.max(...v) - Math.min(...v);
const source = (r: AnalysisReport): MovementSourceKey => `ace-${r.exercise}`;

/** Exploratory image-plane temporal checks, not validated form classifiers.
 * Units are visible shoulder-to-hip lengths, after aspect correction. We require
 * a consistent side, >=65% visibility, >=8 consecutive samples, <=0.4s gaps,
 * and >=1.5s evidence. No gap interpolation, unseen joint inference or personal
 * body-type assumptions. Thresholds screen sustained motion, not safe anatomy.
 * A single-person pose track cannot prove identity: known jumps abstain and
 * local discontinuities split sequences. Camera rotation/depth remain limits.
 */
function segments(r: AnalysisReport): Sample[][] {
  if (!(r.width > 0 && r.height > 0)) return [];
  const ids = r.exercise === 'pullup' ? [11, 13, 15, 23] : r.exercise === 'pushup' ? [11, 13, 15, 23, 27] : [11, 23, 25, 27];
  const eligible = (f: EvidenceFrame, side: number) => f.metrics?.orientationMatches && ids.every(i => visible(f.landmarks[i + side]));
  const side = r.frames.filter(f => eligible(f, 0)).length >= r.frames.filter(f => eligible(f, 1)).length ? 0 : 1;
  const aspect = r.width / r.height, result: Sample[][] = []; let run: Sample[] = [];
  const flush = () => { if (run.length >= 8 && run.at(-1)!.t - run[0].t >= 1.5) result.push(run); run = []; };
  for (const f of r.frames) {
    if (!Number.isFinite(f.timestamp) || !eligible(f, side)) { flush(); continue; }
    const point = (i: number): Point => ({ x: f.landmarks[i + side].x * aspect, y: f.landmarks[i + side].y });
    const s = point(11), h = point(23), a = r.exercise === 'pullup' ? point(15) : point(27), w = r.exercise === 'squat' ? a : point(15);
    const sample: Sample = { t: f.timestamp, s, h, a, w, scale: distance(s, h) };
    if (sample.scale < .04) { flush(); continue; }
    const prev = run.at(-1);
    if (prev && (sample.t <= prev.t || sample.t - prev.t > .4 || Math.abs(sample.scale / prev.scale - 1) > .25
      || distance(sample.s, prev.s) / prev.scale > .65 || distance(sample.a, prev.a) / prev.scale > .5)) flush();
    run.push(sample);
  }
  flush(); return result;
}
function evidence(r: AnalysisReport, run: Sample[], id: string, title: string, observation: string, cue: string, why: string): MovementEvidence {
  return { id, title, observation, cue, why, timestamp: run[0].t, endTimestamp: run.at(-1)!.t,
    support: { frames: run.length, durationSeconds: Number((run.at(-1)!.t - run[0].t).toFixed(2)) }, sourceKey: source(r) };
}
function sustained(run: Sample[], flags: boolean[], minimum = 4): Sample[] | null {
  let start = -1;
  for (let i = 0; i <= flags.length; i++) {
    if (flags[i] && start < 0) start = i;
    if ((!flags[i] || i === flags.length) && start >= 0) {
      if (i - start >= minimum && run[i - 1].t - run[start].t >= .75) return run.slice(start, i);
      start = -1;
    }
  }
  return null;
}
/** Local extrema with the existing .35 body-length excursion as hysteresis.
 * Small tracking wiggles do not create rep boundaries. Clip boundaries remain
 * candidates only, subject to the endpoint/monotonicity gates below. */
function pullupWindows(sy: number[]): { start: number; top: number; end: number }[] {
  const windows: { start: number; top: number; end: number }[] = [];
  let start = 0, top = 0, end = 0;
  let phase: 'rising' | 'lowering' | 'returned' = 'rising';
  for (let i = 1; i < sy.length; i++) {
    if (phase === 'rising') {
      if (sy[i] > sy[start]) start = i;
      if (sy[start] - sy[i] > .35) { top = i; phase = 'lowering'; }
    } else if (phase === 'lowering') {
      if (sy[i] < sy[top]) top = i;
      if (sy[i] - sy[top] > .35) { end = i; phase = 'returned'; }
    } else {
      if (sy[i] > sy[end]) end = i;
      if (sy[end] - sy[i] > .35) {
        windows.push({ start, top, end });
        start = end; top = i; phase = 'lowering';
      }
    }
  }
  if (phase === 'returned') windows.push({ start, top, end });
  return windows;
}
function practiceTip(r: AnalysisReport): MovementReview['practiceTip'] {
  const cue = r.exercise === 'pushup' ? 'For your next set, aim to move your hips and shoulders together.'
    : r.exercise === 'pullup' ? 'If you want a strict pull-up, let any swing settle and give the lowering part time.'
    : 'For your next squat, aim for a steady lowering and bring your hips and chest back up together.';
  const purpose = r.exercise === 'pushup' ? 'That helps the press stay steady instead of letting your body fold in the middle.'
    : r.exercise === 'pullup' ? 'A repeatable start and return make it easier to practice controlled movement.'
    : 'The goal is one coordinated movement you can repeat, not forcing a particular depth.';
  return { title: 'General practice tip', cue, why: `${purpose} This is a general tip, not a fault detected in your clip.`, sourceKey: source(r) };
}

function broadFrontView(r: AnalysisReport): boolean {
  const frames = r.frames.filter(f => [11,12,23,24].every(i => visible(f.landmarks[i])));
  if (frames.length < 6) return false;
  const aspect = r.width / r.height;
  return frames.filter(f => {
    const p = f.landmarks;
    const shoulder = { x: (p[11].x+p[12].x)*aspect/2, y: (p[11].y+p[12].y)/2 };
    const hip = { x: (p[23].x+p[24].x)*aspect/2, y: (p[23].y+p[24].y)/2 };
    return Math.abs(p[11].x-p[12].x)*aspect > distance(shoulder,hip)*.8;
  }).length / frames.length > .6;
}

export function getMovementReview(r: AnalysisReport): MovementReview {
  const out: MovementReview = { observations: [], strengths: [], practiceTip: practiceTip(r), limits: [] };
  const notes = (r.captureNotes ?? []).join(' ');
  if (r.status === 'insufficient' || /shifts abruptly|change of tracked person|do not consistently establish the selected exercise|does not consistently match this station/i.test(notes + ' ' + r.summary)) {
    out.limits.push('I cannot follow one consistent exercise clearly enough to give a movement-specific cue.'); return out;
  }
  if (r.exercise !== 'pullup' && broadFrontView(r)) {
    out.limits.push('This looks like a front-facing view, which hides the body-line and timing comparison I need. A side or angled view may show more.');
    return out;
  }
  const runs = segments(r);
  if (!runs.length) { out.limits.push('I need a continuous view of the working arm or leg and your hips to compare how they move.'); return out; }
  out.limits.push('These are patterns in this camera view. They do not establish muscle activation, grip pressure, pain, or safe technique.');
  if (runs.reduce((n, run) => n + run.length, 0) < r.frames.length * .7) out.limits.push('Some of the clip is hidden or interrupted; these cues cover only the linked moments.');
  for (const run of runs) {
    const scale = median(run.map(p => p.scale));
    const sy = run.map(p => (p.s.y - p.a.y) / scale), hy = run.map(p => (p.h.y - p.a.y) / scale);
    // Relative to the visible support point, cancelling simple camera panning.
    if (r.exercise === 'pushup' || r.exercise === 'squat') {
      const opposite = run.map((_, i) => i >= 2 && (sy[i] - sy[i - 2]) * (hy[i] - hy[i - 2]) < 0
        && Math.abs(sy[i] - sy[i - 2]) > .05 && Math.abs(hy[i] - hy[i - 2]) > .05
        && Math.abs((sy[i] - sy[i - 2]) - (hy[i] - hy[i - 2])) > .18);
      const wave = sustained(run, opposite);
      if (wave) out.observations.push(evidence(r, wave, `${r.exercise}-timing`, 'Move together',
        'Your hips and shoulders appear to move in opposite directions for several moments here.',
        r.exercise === 'pushup' ? 'Try a slower rep with your hips and shoulders moving together. If needed, use a suitable easier push-up variation.'
          : 'Try a slower squat and bring your hips and chest back up together.',
        r.exercise === 'pushup' ? 'Moving as one unit helps keep the rep steady instead of bending in the middle of the press.'
          : 'Rising together makes the ascent one coordinated movement, rather than starting with your hips and then catching up with your chest.'));
      if (!wave && span(sy) > .2 && span(hy) > .12) {
        const moving = run.slice(2).map((_, k) => ({ s: sy[k + 2] - sy[k], h: hy[k + 2] - hy[k] })).filter(p => Math.abs(p.s) > .025 && Math.abs(p.h) > .025);
        if (moving.length >= 8 && moving.filter(p => p.s * p.h > 0).length / moving.length >= .9)
          out.strengths.push(evidence(r, run, `${r.exercise}-together`, 'Moving together',
            'Your hips and shoulders mostly travel in the same direction through this visible section.',
            'Keep that togetherness as you repeat the movement.', 'Moving together makes the next rep easier to coordinate and repeat.'));
      }
      if (r.exercise === 'pushup') {
        const lower = run.map(p => {
          const dx = p.a.x - p.s.x, dy = p.a.y - p.s.y;
          if (Math.abs(dx) < Math.abs(dy) * 1.2) return false;
          const fraction = (p.h.x - p.s.x) / dx;
          return fraction > .15 && fraction < .85 && (p.h.y - (p.s.y + fraction * dy)) / scale > .18;
        });
        const bent = sustained(run, lower, 6);
        if (bent) out.observations.push(evidence(r, bent, 'pushup-hip-position', 'Check your hip position',
          'Your hips appear below the line between your shoulder and ankle through this section.',
          'Check the dots in the replay, then try keeping your hips in line with the rest of your body.',
          'Keeping your body line steady helps you practice the same movement throughout the press.'));
      }
    } else if (r.status === 'usable' && r.estimatedRepetitions > 0) {
      const x = run.map(p => ((p.s.x + p.h.x) / 2 - p.w.x) / scale);
      const handTravel = span(run.map(p => p.w.x)) / scale + span(run.map(p => p.w.y)) / scale;
      const turns = x.slice(2).filter((_, i) => (x[i + 1] - x[i]) * (x[i + 2] - x[i + 1]) < 0 && Math.abs(x[i + 1] - x[i]) + Math.abs(x[i + 2] - x[i + 1]) > .03).length;
      if (handTravel < .2 && span(x) > .5 && turns >= 2 && span(sy) > .25)
        out.observations.push(evidence(r, run, 'pullup-swing', 'Let the swing settle',
          'Your upper body travels back and forth relative to your hands during this section.',
          'If you are aiming for strict pull-ups, let the swing settle before starting the next rep.',
          'A still start makes a strict pull-up more repeatable instead of relying on momentum. Intentional momentum-based variations are different.'));
      // Assess complete local return windows, keeping all original timing,
      // endpoint and stationary-hand gates. No interpolation across gaps.
      for (const { start, top, end } of pullupWindows(sy)) {
        if (handTravel >= .2 || top - start < 3 || end - top < 3) continue;
        const bottom = Math.min(sy[start], sy[end]);
        const excursion = bottom - sy[top], up = run[top].t - run[start].t, down = run[end].t - run[top].t;
        const rising = sy.slice(start + 1, top + 1).filter((y, i) => y <= sy[start + i] + .03).length / (top - start);
        const lowering = sy.slice(top + 1, end + 1).filter((y, i) => y >= sy[top + i] - .03).length / (end - top);
        if (excursion > .35 && Math.abs(sy[start] - sy[end]) < .15 && rising >= .8 && lowering >= .8 && down >= .75 && up / down > 1.8)
          out.observations.push(evidence(r, run.slice(top, end + 1), 'pullup-descent', 'Give the lowering part time',
            'In this visible movement, you come down in noticeably less time than you take to pull up.',
            'Try giving the lowering part a little more time and keeping it steady.',
            'It gives you a chance to practice controlling the return instead of rushing into the next rep.'));
      }
    }
  }
  // Prefer a short set of distinct, sustained observations over a long list.
  out.observations = [...new Map(out.observations.map(e => [e.id, e])).values()].slice(0, 2);
  out.strengths = [...new Map(out.strengths.map(e => [e.id, e])).values()].slice(0, 1);
  if (out.observations.some(e => e.id.endsWith('-timing'))) out.limits.push('Replay the timing comparison and check that the dots stay on your body. Tracking errors can look like a timing mismatch.');
  if (out.observations.some(e => e.id === 'pushup-hip-position')) out.limits.push('A camera angle can exaggerate the hip position. This is a position to check, not a diagnosis of a weak muscle or back problem.');
  if (out.observations.some(e => e.id === 'pullup-swing')) out.limits.push('This view cannot tell whether you intended a strict pull-up or a different style.');
  if (out.observations.some(e => e.id === 'pullup-descent')) out.limits.push('Speed alone does not prove that you lost control; this only compares the timing of the linked movement.');
  if (out.strengths.length) out.limits.push('Moving together is one visible strength, not an all-clear on your whole form.');
  if (!out.observations.length) out.limits.push('I did not find a sustained pattern to correct in the parts I could track. That does not certify the whole set.');
  return out;
}
