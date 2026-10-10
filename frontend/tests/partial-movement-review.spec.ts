import { test, expect } from '@playwright/test';
import { getPartialMovementReview } from '../src/analysis/partialMovementReview';
import { getMovementReview } from '../src/analysis/movementReview';
import type { AnalysisReport, Landmark } from '../src/analysis/types';

// Independent constant-link 2-D kinematics. These exercise the rules, not model
// performance or correctness of an exercise technique in real footage.
function fixture(exercise: AnalysisReport['exercise'], fast = true, repeats = 1): AnalysisReport {
  const frames = Array.from({ length: 32 * repeats + 1 }, (_, n) => {
    const i = n === 32 * repeats ? 32 : n % 32;
    const turn = fast ? (exercise === 'pullup' ? 24 : 8) : 16;
    const angle = (i <= turn ? 160 - 80 * i / turn : 80 + 80 * (i - turn) / (32 - turn)) * Math.PI / 180;
    const length = .18, anchor = exercise === 'pullup' ? .12 : .85, direction = exercise === 'pullup' ? 1 : -1;
    const p: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
    const ids = exercise === 'squat' ? [23, 25, 27] : [11, 13, 15];
    const joints = [[.5, anchor + direction * 2 * length * Math.sin(angle / 2)],
      [.5 + length * Math.cos(angle / 2), anchor + direction * length * Math.sin(angle / 2)], [.5, anchor]];
    ids.forEach((id, j) => { p[id] = { x: joints[j][0], y: joints[j][1], z: 0, visibility: 1 }; });
    return { timestamp: n * .25, landmarks: p, metrics: { elbow: null, knee: null, hip: null, bodyTilt: null, side: 'left' as const,
      orientationMatches: false, orientation: 'uncertain' as const } };
  });
  return { id: 'synthetic-local-chain', exercise, status: 'partial', duration: 8 * repeats, width: 640, height: 640,
    frames, sampledFrames: frames.length, usableFrames: 0, coverage: 0, findings: [], summary: 'Only part of the body is visible.',
    limitations: [], sources: [], estimatedRepetitions: 0, captureNotes: ['The visible positions do not consistently establish the selected exercise.'] };
}
const observations = (r: AnalysisReport) => getMovementReview(r).observations.map(e => e.id);

test('cropped arm or leg can support conditional tempo without hidden hips, head or other limbs', () => {
  for (const exercise of ['pullup', 'pushup', 'squat'] as const) {
    const r = fixture(exercise), result = getMovementReview(r), chain = exercise === 'squat' ? 'leg' : 'arm';
    const cue = result.observations.find(e => e.id === `${exercise}-${chain}-tempo`);
    expect(cue).toBeDefined(); expect(cue!.timestamp).toBe(0); expect(cue!.endTimestamp).toBe(8);
    expect(cue!.cue).toMatch(/If/); expect(cue!.why).toMatch(/intentional/);
    expect(result.limits.join(' ')).toMatch(/does not establish a full rep/);
    expect(r.status).toBe('partial'); expect(r.estimatedRepetitions).toBe(0);
  }
});

test('two complete local cycles can show repeatable rhythm without an equal-speed prescription', () => {
  for (const exercise of ['pullup', 'pushup', 'squat'] as const) {
    const result = getMovementReview(fixture(exercise, false, 2));
    expect(result.observations).toHaveLength(0); expect(result.strengths).toHaveLength(1);
    expect(result.strengths[0].id).toBe(`${exercise}-${exercise === 'squat' ? 'leg' : 'arm'}-rhythm`);
    expect(result.strengths[0].why).toMatch(/does not require.*equal speed/);
    expect(result.strengths[0].endTimestamp).toBe(16);
  }
});

test('incomplete cycles and single cycles never invent repeatable rhythm', () => {
  const r = fixture('pushup'); r.frames = r.frames.slice(0, 20);
  expect(getPartialMovementReview(r).observations).toHaveLength(0);
  expect(getPartialMovementReview(r).strengths.every(e=>e.id.endsWith('-support'))).toBe(true);
  expect(getPartialMovementReview(fixture('squat', false)).strengths.every(e=>e.id.endsWith('-support'))).toBe(true);
});

test('uncertain or insufficient full-body status is not an explicit mismatch', () => {
  const r = fixture('pullup'); r.status = 'insufficient';
  expect(observations(r)).toContain('pullup-arm-tempo'); expect(r.status).toBe('insufficient');
  r.frames.forEach(f => { f.metrics!.orientation = 'incompatible'; });
  expect(observations(r)).toHaveLength(0);
  const changed = fixture('squat'); changed.captureNotes = ['The tracked body shifts abruptly.'];
  expect(observations(changed)).toHaveLength(0);
  const wrong = fixture('pushup'); wrong.summary = 'This movement does not consistently match this station.';
  expect(observations(wrong)).toHaveLength(0);
});

test('missing or out-of-frame joint and tracking gaps cannot complete a local cycle', () => {
  const hidden = fixture('pullup'); hidden.frames.forEach(f => { f.landmarks[13].visibility = .6; });
  expect(observations(hidden)).toHaveLength(0);
  const outside = fixture('pushup'); outside.frames.forEach(f => { f.landmarks[15].x = 1.02; });
  expect(observations(outside)).toHaveLength(0);
  const gap = fixture('squat'); gap.frames[8].landmarks = [];
  expect(observations(gap)).toHaveLength(0);
  const jump = fixture('pullup'); jump.frames[24].landmarks[13].x = .95;
  expect(observations(jump)).toHaveLength(0);
});

test('large view changes or a moving support abstain rather than reinterpret pose distortion as tempo', () => {
  const turn = fixture('pushup');
  turn.frames.forEach((f,i) => [11,13].forEach(id => {
    const factor = 1 + .8 * Math.sin(i * Math.PI / 32);
    f.landmarks[id].x = .5 + (f.landmarks[id].x - .5) * factor;
    f.landmarks[id].y = .85 + (f.landmarks[id].y - .85) * factor;
  }));
  expect(observations(turn)).toHaveLength(0);
  const pan = fixture('squat'); pan.frames.forEach((f,i) => [23,25,27].forEach(id => { f.landmarks[id].x += i * .003; }));
  expect(observations(pan)).toHaveLength(0);
});

test('mirror, aspect and resolution changes preserve the same local timing evidence', () => {
  const r = fixture('pullup'), expected = observations(r);
  const mirror = structuredClone(r); mirror.frames.forEach(f => f.landmarks.forEach(p => { p.x = 1 - p.x; }));
  expect(observations(mirror)).toEqual(expected);
  const wide = structuredClone(r); wide.width = 1280; wide.frames.forEach(f => f.landmarks.forEach(p => { p.x /= 2; }));
  expect(observations(wide)).toEqual(expected);
  const big = structuredClone(r); big.width = big.height = 1920; expect(observations(big)).toEqual(expected);
});

test('front-view restriction applies to body line but does not erase a supported local arm observation', () => {
  const r = fixture('pushup'); r.frames.forEach(f => {
    f.landmarks[12] = { ...f.landmarks[11], x: .85 };
    f.landmarks[23] = { x: .5, y: .7, z: 0, visibility: 1 };
    f.landmarks[24] = { x: .85, y: .7, z: 0, visibility: 1 };
  });
  const result = getMovementReview(r);
  expect(result.observations.map(e => e.id)).toEqual(['pushup-arm-tempo']);
  expect(result.limits.join(' ')).toMatch(/front-facing/);
});

test('identifiers keep variant-sensitive pull-up cues separate from ankle-dependent body-line cues', () => {
  const pull = getPartialMovementReview(fixture('pullup')).observations[0];
  expect(pull.id).toBe('pullup-arm-tempo'); expect(pull.cue).toMatch(/If.*controlled pull-ups/);
  const push = getPartialMovementReview(fixture('pushup')).observations[0];
  expect(push.id).toBe('pushup-arm-tempo'); expect(push.cue).not.toMatch(/ankle|straight leg|full push-up/);
});

test('matching projected three-point paths can repeat despite rigid 3-D links foreshortening',()=>{
  const r=fixture('pushup',false,2),lengths:number[]=[];
  r.frames.forEach((f,n)=>{
    const i=n===64?32:n%32,phase=i<=16?i/16:(32-i)/16,factor=1-.5*Math.sin(Math.PI*phase);
    [11,13].forEach(id=>{
      f.landmarks[id].x=.5+(f.landmarks[id].x-.5)*factor;
      f.landmarks[id].y=.85+(f.landmarks[id].y-.85)*factor;
    });
    const projected=.18*factor,depth=Math.sqrt(.18**2-projected**2);
    f.landmarks[13].z=depth;f.landmarks[11].z=2*depth;lengths.push(projected);
    expect(Math.hypot(projected,depth)).toBeCloseTo(.18,10);
  });
  expect(Math.max(...lengths)/Math.min(...lengths)).toBeGreaterThan(1.6);
  const result=getPartialMovementReview(r);
  expect(result.observations).toHaveLength(0);
  expect(result.strengths[0]?.id).toBe('pushup-arm-rhythm');
  expect(result.strengths[0].observation).toMatch(/path in the image/);
});

test('three-point repeatability rejects a changed projected path across cycles',()=>{
  const r=fixture('pushup',false,2);
  r.frames.forEach((f,n)=>{
    if(n<=32)return;
    const i=n-32,phase=i<=16?i/16:(32-i)/16,factor=1-.3*Math.sin(Math.PI*phase);
    [11,13].forEach(id=>{
      f.landmarks[id].x=.5+(f.landmarks[id].x-.5)*factor;
      f.landmarks[id].y=.85+(f.landmarks[id].y-.85)*factor;
    });
  });
  expect(getPartialMovementReview(r).strengths.some(e=>e.id==='pushup-arm-rhythm')).toBe(false);
});

test('three-point tempo never treats five-second holds as time spent moving',()=>{
  for(const exercise of ['pullup','pushup','squat'] as const)for(const position of [0,8,16,24]) {
    const r=fixture(exercise,false),hold=Array.from({length:20},()=>structuredClone(r.frames[position]));
    r.frames.splice(position+1,0,...hold);r.frames.forEach((f,i)=>{f.timestamp=i*.25;});
    expect(getPartialMovementReview(r).observations.some(e=>e.id.endsWith('-tempo'))).toBe(false);
  }
  for(const exercise of ['pullup','pushup','squat'] as const)
    expect(getPartialMovementReview(fixture(exercise,true)).observations.some(e=>e.id.endsWith('-tempo'))).toBe(true);
});
