import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExerciseId } from '../src/game/types';

type Fixture = { id: string; exercise: ExerciseId; path: string; privacy: 'public' | 'private'; sha256?: string; sourceGroup?: string; transformation?: string; syntheticNegative?: boolean; gap?: [number, number] };
const enabled = process.env.ASTER_CROPPED_EVAL === '1';
const runName = process.env.ASTER_CROPPED_RUN || '';
if (runName && !/^[a-zA-Z0-9_-]+$/.test(runName)) throw new Error('Use only letters, numbers, underscores or hyphens for the crop run name.');
const publicManifest = 'artifacts/cropped-evaluation/manifest.json';
const privateManifest = 'artifacts/cropped-evaluation/private-inputs.json';
const cases: Fixture[] = enabled && existsSync(publicManifest) ? JSON.parse(readFileSync(publicManifest, 'utf8')) : [];
if (enabled && process.env.ASTER_PRIVATE_CROPPED === '1' && existsSync(privateManifest)) cases.push(...JSON.parse(readFileSync(privateManifest, 'utf8')));
const fingerprintPaths = ['public/models/pose_landmarker_full.task', 'public/mediapipe/pose-worker.js', 'src/analysis/analyzeVideo.ts', 'src/analysis/measurements.ts', 'src/analysis/summarize.ts', 'src/analysis/movementReview.ts', 'src/analysis/partialMovementReview.ts'];
function fingerprint() { return Object.fromEntries(fingerprintPaths.filter(existsSync).map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])); }
test('cropped real-model benchmark is opt-in and uses local fixtures', () => {
  test.skip(!enabled, 'Run evaluation/cropped/prepare.mjs and set ASTER_CROPPED_EVAL=1.');
  expect(cases.length).toBeGreaterThanOrEqual(8);
});

for (const fixture of cases) test(`fresh local model: ${fixture.id}`, async ({ page, context }) => {
  test.setTimeout(300000);
  const source = readFileSync(fixture.path), before = fingerprint(), external: string[] = [];
  const baseURL = 'http://127.0.0.1:5174';
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL || url.pathname.startsWith('/api/')) { external.push(url.origin + url.pathname); await route.abort(); return; }
    if (url.pathname === '/cropped-model-runner') { await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local crop regression</title>' }); return; }
    if (url.pathname === '/cropped-model-input') { await route.fulfill({ contentType: 'video/mp4', body: source }); return; }
    await route.continue();
  });
  await page.goto(baseURL + '/cropped-model-runner');
  const started = Date.now();
  const result = await page.evaluate(async exercise => {
    const { analyzeVideo } = await import('/src/analysis/analyzeVideo.ts');
    const { getMovementReview } = await import('/src/analysis/movementReview.ts');
    const blob = await (await fetch('/cropped-model-input')).blob();
    const report = await analyzeVideo(new File([blob], 'local-evaluation.mp4', { type: 'video/mp4' }), exercise, () => {}, new AbortController().signal);
    const statusBefore = report.status, repsBefore = report.estimatedRepetitions;
    const review = getMovementReview(report);
    const ids = exercise === 'squat' ? [23,25,27] : [11,13,15];
    const visible = (p: { x: number; y: number; visibility: number } | undefined) => p && p.visibility >= .65 && p.x > .005 && p.x < .995 && p.y > .005 && p.y < .995;
    const chains = [0,1].map(side => report.frames.filter(frame => ids.every(id => visible(frame.landmarks[id + side]))).length);
    return { report, review, statusBefore, repsBefore, visibleChainFrames: { left: chains[0], right: chains[1] } };
  }, fixture.exercise);
  const baseFolder = fixture.privacy === 'private' ? 'artifacts/private-evaluation/partial-movement-rerun' : 'artifacts/cropped-evaluation/results';
  const folder = runName ? `${baseFolder}/${runName}` : baseFolder;
  mkdirSync(folder, { recursive: true });
  const summary = { id: fixture.id, privacy: fixture.privacy, exercise: fixture.exercise, sourceGroup: fixture.sourceGroup, transformation: fixture.transformation,
    processedAt: new Date().toISOString(), sourceSha256: createHash('sha256').update(source).digest('hex'), freshModelInference: true, seconds: (Date.now() - started) / 1000,
    duration: result.report.duration, status: result.report.status, samples: result.report.sampledFrames, poseFrames: result.report.poseFrames,
    usableFrames: result.report.usableFrames, coverage: result.report.coverage, estimatedCycles: result.report.estimatedRepetitions,
    visibleChainFrames: result.visibleChainFrames, observationIds: result.review.observations.map(item => item.id), strengthIds: result.review.strengths.map(item => item.id),
    evidenceWindows: [...result.review.observations, ...result.review.strengths].map(item => ({ id: item.id, start: item.timestamp, end: item.endTimestamp, supportFrames: item.support.frames })),
    limitations: result.review.limits, externalRequests: external.length, fingerprints: before, engineStable: JSON.stringify(before) === JSON.stringify(fingerprint()) };
  writeFileSync(resolve(folder, fixture.id + '-raw.json'), JSON.stringify(result));
  writeFileSync(resolve(folder, fixture.id + '-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ id: fixture.id, status: summary.status, samples: summary.samples, chains: summary.visibleChainFrames, observationIds: summary.observationIds, strengthIds: summary.strengthIds, seconds: summary.seconds }));
  expect(external).toEqual([]);
  expect(summary.engineStable, 'Analysis changed while this fixture was running; rerun for a stable fingerprint.').toBe(true);
  expect(result.report.status).toBe(result.statusBefore);
  expect(result.report.estimatedRepetitions).toBe(result.repsBefore);
  for (const evidence of [...result.review.observations, ...result.review.strengths]) {
    expect(evidence.timestamp).toBeGreaterThanOrEqual(0);
    expect(evidence.endTimestamp).toBeLessThanOrEqual(result.report.duration);
    expect(evidence.endTimestamp).toBeGreaterThan(evidence.timestamp);
    expect(result.report.frames.some(frame => frame.timestamp === evidence.timestamp)).toBe(true);
    // An evidence window can be shorter than the eligible parent segment.
    expect(evidence.support.frames).toBeGreaterThanOrEqual(3);
    expect(evidence.support.frames).toBe(result.report.frames.filter(frame => frame.timestamp >= evidence.timestamp && frame.timestamp <= evidence.endTimestamp).length);
    if (fixture.gap) expect(evidence.timestamp < fixture.gap[0] && evidence.endTimestamp > fixture.gap[1], 'Evidence must not bridge the blacked-out interval.').toBe(false);
  }
  if (fixture.syntheticNegative) {
    expect(result.report.status).toBe('insufficient');
    expect(result.report.estimatedRepetitions).toBe(0);
    expect(result.review.observations).toEqual([]);
    expect(result.review.strengths).toEqual([]);
  }
});
