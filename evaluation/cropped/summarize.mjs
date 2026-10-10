import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../lib.mjs';
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'frontend/artifacts/cropped-evaluation/manifest.json'), 'utf8'));
const includeReplay = process.argv.includes('--replay');
const runName = process.argv.slice(2).find(arg => !arg.startsWith('--')) || '';
if (runName && !/^[a-zA-Z0-9_-]+$/.test(runName)) throw Error('Invalid run name.');
const cases = manifest.map(input => {
  if (input.privacy !== 'public') throw Error('Private records must never enter the tracked public summary.');
  const result = JSON.parse(readFileSync(resolve(ROOT, 'frontend/artifacts/cropped-evaluation/results', runName, input.id + '-summary.json'), 'utf8'));
  if (result.privacy !== 'public' || !result.freshModelInference || !result.engineStable) throw Error('Expected stable fresh public inference.');
  const replayPath = resolve(ROOT, 'frontend/artifacts/cropped-evaluation/results/recovery-v2', input.id + '-baseline-replay.json');
  const replay = includeReplay && existsSync(replayPath) ? JSON.parse(readFileSync(replayPath, 'utf8')) : null;
  if (replay && replay.summary.privacy !== 'public') throw Error('Unexpected private replay.');
  return { id: result.id, exercise: result.exercise, sourceGroup: input.sourceGroup ?? null, sourceUrl: input.sourceUrl ?? null,
    transformation: input.transformation, filter: input.filter ?? null, sha256: input.sha256,
    duration: result.duration, status: result.status, sampledFrames: result.samples, poseFrames: result.poseFrames,
    visibleChainFrames: result.visibleChainFrames, observationIds: result.observationIds, strengthIds: result.strengthIds,
    estimatedCycles: result.estimatedCycles, externalRequests: result.externalRequests, seconds: result.seconds, fingerprints: result.fingerprints,
    ...(replay ? { latestRuleReplay: { freshInference: false, observationIds: replay.summary.observationIds, strengthIds: replay.summary.strengthIds,
      focus: replay.summary.focus, focusId: replay.summary.focusId, fingerprints: replay.summary.hashes,
      evidenceWindows: [...replay.review.observations, ...replay.review.strengths].map(item => ({ id: item.id, start: item.timestamp, end: item.endTimestamp, supportFrames: item.support.frames })) } } : {}) };
});
const output = { schemaVersion: 1, evaluatedAt: new Date().toISOString(), purpose: 'Development regression with actual pixel crops and fresh MediaPipe inference; not a form-accuracy benchmark.',
  realSourceRecordings: 3, transformedCasesAreIndependentSamples: false, independentFormLabels: 0, privateDataIncluded: false,
  cases };
writeFileSync(resolve(ROOT, `evaluation/cropped/public-results${runName ? '-' + runName : ''}.json`), JSON.stringify(output, null, 2) + '\n');
console.log(`Exported ${cases.length} public-only aggregate records. Private files, landmarks and frames were not read.`);
