import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { getCoachingReview, getCoachingMoment } from '../src/analysis/coaching';
import type { AnalysisReport, EvidenceFrame, Finding } from '../src/analysis/types';

const finding = (id: string, timestamp: number): Finding => ({ id, timestamp, title: 'Technical evidence',
  observation: 'The projected elbow angle is 83° and spans 80–160°.', suggestion: 'Compare the measurements.' });
function report(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  const frames: EvidenceFrame[] = [1, 3].map((timestamp, i) => ({ timestamp, landmarks: [], metrics: {
    elbow: i ? 160 : 83, knee: null, hip: 170, bodyTilt: 80, side: 'left', orientationMatches: true,
  } }));
  return { id: 'synthetic-presentation-only', exercise: 'pushup', status: 'usable', duration: 5,
    width: 640, height: 480, sampledFrames: 2, usableFrames: 2, coverage: 1, poseFrames: 2,
    frames, findings: [finding('range', 1), finding('return', 3), finding('body-line', 1)],
    summary: 'Technical summary.', limitations: ['Technical limitations.'], sources: [], estimatedRepetitions: 1,
    captureNotes: [], ...overrides };
}

test('brief coaching preserves source timestamps and leaves original technical evidence unchanged', () => {
  const input = report(), before = JSON.stringify(input), review = getCoachingReview(input);
  expect(review.moments.map(m => [m.id, m.timestamp])).toEqual([['range', 1], ['return', 3]]);
  expect(review.spokenText).toContain('At 1 second');
  expect(review.spokenText).toContain('At 3 seconds');
  expect(review.spokenText).toMatch(/hips and shoulders.*up together/);
  expect(review.spokenText.length).toBeLessThanOrEqual(700);
  expect(review.spokenText).not.toMatch(/projected|degrees|°|80|160|your form is correct|your hips are sagging|establish|dependable|visible joints|selected exercise|torso|—/i);
  expect(JSON.stringify(input)).toBe(before);
});

test('missing joint measurements never become a visible bend or body-line claim', () => {
  const input = report();
  input.frames.forEach(f => { f.metrics!.elbow = null; f.metrics!.hip = null; });
  expect(getCoachingMoment(input, input.findings[0])).toBeNull();
  expect(getCoachingMoment(input, input.findings[2])).toBeNull();
  expect(getCoachingReview(input).spokenText).not.toMatch(/hips and shoulders.*up together/);
  expect(getCoachingMoment(input, finding('range', 2))).toBeNull();
});

test('cropped shoulder feedback gives one concrete camera action without claiming a full movement', () => {
  const input = report({ status: 'partial', estimatedRepetitions: 0,
    captureNotes: ['Your shoulders are missing or obscured in much of this view.'],
    findings: [finding('range', 1), finding('return', 3), finding('capture', 1)] });
  const review = getCoachingReview(input);
  expect(review.spokenText).toContain('Move the camera back or tilt it up');
  expect(review.uncertainty).toContain('shoulders');
  expect(review.moments).toHaveLength(3);
  expect(review.moments[1].cue).toMatch(/can.t follow a whole rep/);
  expect(input.status).toBe('partial');
  expect(input.estimatedRepetitions).toBe(0);
});

test('unclear exercise and abrupt tracking retain capture advice instead of invented corrections', () => {
  const input = report({ status: 'partial', captureNotes: [
    'Visible positions do not consistently establish the selected exercise.',
    'The tracked body shifts abruptly between sampled frames.',
  ], findings: [finding('range', 1), finding('return', 3), finding('capture', 1)] });
  const review = getCoachingReview(input);
  expect(review.moments.map(m => m.id)).toEqual(['capture']);
  expect(review.summary).toContain('which exercise you picked');
  expect(review.spokenText).toContain('camera still and one person');
  expect(review.spokenText).not.toMatch(/rise together|straighter|correct form|complete repetition/i);
});

test('unknown findings and insufficient tracking do not get fabricated movement advice', () => {
  const input = report({ status: 'insufficient', frames: [], poseFrames: 0, estimatedRepetitions: 0,
    findings: [finding('unknown-new-finding', 1), finding('visibility', 0)] });
  const review = getCoachingReview(input);
  expect(getCoachingMoment(input, input.findings[0])).toBeNull();
  expect(review.moments.map(m => m.id)).toEqual(['visibility']);
  expect(review.spokenText).toMatch(/yourself in view.*lighting/);
  expect(review.spokenText).not.toMatch(/bent|straighter|good job|fault|safe technique/i);
});

test('a return requires a genuinely straighter measured source position', () => {
  const input = report(); input.frames[1].metrics!.elbow = 70;
  expect(getCoachingMoment(input, input.findings[1])).toBeNull();
  expect(getCoachingMoment(input, finding('return', 99))).toBeNull();
});

test('an observable elbow does not turn hidden hips or torso into a body-motion cue', () => {
  const input = report(); input.frames.forEach(f => { f.metrics!.hip = null; });
  const review = getCoachingReview(input);
  expect(review.spokenText).toContain('elbow bends and straightens');
  expect(review.spokenText).not.toMatch(/hips.*up together/);
  expect(review.spokenText).not.toMatch(/, i could/);
});

test('actual cached public-video report produces succinct plain-language coaching', () => {
  const path = 'artifacts/analysis/real-pushup-report.json';
  test.skip(!existsSync(path), 'Optional previously inferred public fixture; synthetic tests are not model validation.');
  const input = JSON.parse(readFileSync(path, 'utf8')) as AnalysisReport;
  const review = getCoachingReview(input);
  expect(review.spokenText.length).toBeLessThanOrEqual(700);
  expect(review.spokenText).not.toMatch(/°|projected|percentile|your form is correct/i);
  expect(review.moments.length).toBeGreaterThan(0);
  for (const m of review.moments) expect(input.findings.some(f => f.id === m.id && f.timestamp === m.timestamp)).toBe(true);
});
