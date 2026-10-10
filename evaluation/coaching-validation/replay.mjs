// Coverage-only replay. No video decoding, provider requests, fitting, or fault-label joins.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { ROOT, readManifest, summarizeManifest, validateRecords, sha, atomicJson } from '../lib.mjs';
import { measure, summarize } from '../versions/revised3/measurements.ts';
import { getMovementReview } from '../../frontend/src/analysis/movementReview.ts';

const manifestPath = resolve(ROOT, 'evaluation/manifests/dataset.jsonl');
const before = sha(readFileSync(manifestPath)); const rows = readManifest(manifestPath);
const manifest = summarizeManifest(rows), validation = validateRecords(rows, { requireTarget: true });
const run = JSON.parse(readFileSync(resolve(ROOT, 'evaluation/results/inference-v1.json')));
if (!validation.valid || manifest.sha256 !== run.manifest.sha256 || run.failed !== 0 || run.stopped || rows.some(r => r.label.form !== null)) throw Error('Locked manifest/provenance/label contract mismatch');
const current = readFileSync(resolve(ROOT, 'frontend/src/analysis/measurements.ts'), 'utf8');
const snapshot = readFileSync(resolve(ROOT, 'evaluation/versions/revised3/measurements.ts'), 'utf8');
const body = value => value.replace(/^import[^\n]*\n/gm, '').replace(/\r\n/g, '\n').trim();
if (body(current) !== body(snapshot)) throw Error('Measurement snapshot no longer matches app; resolve provenance before replay');
const movementSourcePath = resolve(ROOT, 'frontend/src/analysis/movementReview.ts');
const movementSourceHash = sha(readFileSync(movementSourcePath));
const blank = () => ({ recordings: 0, usable: 0, partial: 0, insufficient: 0, correctionRecordings: 0, strengthRecordings: 0, anySpecificRecordings: 0, generalOnlyRecordings: 0, emittedCorrections: 0, emittedStrengths: 0, correctionIds: {}, strengthIds: {}, limitations: {} });
const aggregates = {};
const count = (object, key) => object[key] = (object[key] || 0) + 1;
let caches = 0, totalFrames = 0;
for (const record of rows) {
  const path = resolve(ROOT, 'evaluation/cache', run.engineKey, record.sha256 + '.json.gz');
  if (!existsSync(path)) throw Error('Missing actual inference cache');
  const data = JSON.parse(gunzipSync(readFileSync(path)));
  if (data.sha256 !== record.sha256 || data.engineKey !== run.engineKey) throw Error('Cache provenance mismatch');
  const frames = data.frames.map(f => ({ ...f, metrics: measure(f.landmarks, record.exercise, data.width, data.height) }));
  const report = summarize(frames, record.exercise, data.duration, data.width, data.height);
  const review = getMovementReview(report); caches++; totalFrames += frames.length;
  for (const item of [...review.observations, ...review.strengths]) {
    if (!Number.isFinite(item.timestamp) || !Number.isFinite(item.endTimestamp) || item.timestamp < 0 || item.endTimestamp < item.timestamp || item.endTimestamp > data.duration || item.support.frames < 1 || item.sourceKey !== `ace-${record.exercise}`) throw Error('Movement evidence violates temporal/source invariants');
    if (!frames.some(f => Math.abs(f.timestamp - item.timestamp) < .0001) || !frames.some(f => Math.abs(f.timestamp - item.endTimestamp) < .0001)) throw Error('Evidence timestamp is not a real sampled timestamp');
  }
  for (const key of ['all/all', `${record.split}/all`, `all/${record.exercise}`, `${record.split}/${record.exercise}`]) {
    const a = aggregates[key] ??= blank(); a.recordings++; a[report.status]++;
    a.correctionRecordings += Number(review.observations.length > 0); a.strengthRecordings += Number(review.strengths.length > 0);
    a.anySpecificRecordings += Number(review.observations.length + review.strengths.length > 0);
    a.generalOnlyRecordings += Number(review.observations.length + review.strengths.length === 0);
    a.emittedCorrections += review.observations.length; a.emittedStrengths += review.strengths.length;
    for (const item of review.observations) count(a.correctionIds, item.id);
    for (const item of review.strengths) count(a.strengthIds, item.id);
    for (const limit of review.limits) count(a.limitations, limit);
  }
}
if (before !== sha(readFileSync(manifestPath)) || movementSourceHash !== sha(readFileSync(movementSourcePath))) throw Error('Inputs changed during replay');
const artifact = { createdAt: new Date().toISOString(), manifest, manifestFileHash: before, engineKey: run.engineKey,
  movementSourceHash, measurementSourceHash: sha(current), measurementSnapshotHash: sha(snapshot),
  actualCachedRecordings: caches, totalFrames, networkRequests: 0, newInferenceRuns: 0, formLabels: 0,
  temporalAndSourceInvariantFailures: 0, aggregates,
  claimBoundary: 'Descriptive output coverage only, not accuracy, fault precision, correction helpfulness, clinical safety, or a new held-out efficacy result. General practice tips are not detected faults. No thresholds were selected or changed by this replay.' };
atomicJson(resolve(ROOT, 'evaluation/coaching-validation/coverage-0.9.json'), artifact);
console.log(JSON.stringify({ cached: caches, frames: totalFrames, all: aggregates['all/all'], test: aggregates['test/all'], claimBoundary: artifact.claimBoundary }, null, 2));
