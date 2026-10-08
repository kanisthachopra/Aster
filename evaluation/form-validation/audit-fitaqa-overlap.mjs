import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zstdDecompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parquetReadObjects, asyncBufferFromFile } from './private/decoder/node_modules/hyparquet/src/node.js';

// Deliberately never project gold, options, form_error, error_detail, or predictions.
const columns = ['dataset', 'video_name', 'video_sha256', 'action_name'];
const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestPath = resolve(root, 'evaluation/manifests/dataset.jsonl');
const originalBytes = await readFile(manifestPath);
const manifest = originalBytes.toString('utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
const lock = JSON.parse(await readFile(`${manifestPath}.lock.json`, 'utf8'));
const canonicalHash = sha(manifest.map(row => JSON.stringify(row)).join('\n'));
if (manifest.length !== 600 || canonicalHash !== lock.summary.sha256) throw new Error('Locked 600 manifest verification failed');
const local = manifest.map(({ split, exercise, sourceDataset, sourceGroup, sourceStart, sourceEnd, sha256 }) => ({ split, exercise, sourceDataset, sourceGroup, sourceStart, sourceEnd, sha256 }));
if (local.some(row => !['train', 'validation', 'test'].includes(row.split))) throw new Error('Invalid locked split');

const expected = {
  multiple_choice: '26fe661c5054dc64d9bb3b7ec267fc533ed3952907b8ffa763339b8328db461f',
  temporal_grounding: '5d2471fb599f627b56ad70d1880c65221571d97d538e24bf6ff01cc21826830f',
};
const assets = new Map();
for (const [config, checksum] of Object.entries(expected)) {
  const path = resolve(here, 'private', `${config}.parquet`);
  if (sha(await readFile(path)) !== checksum) throw new Error('FitAQA annotation checksum differs');
  const rows = await parquetReadObjects({ file: await asyncBufferFromFile(path), columns, compressors: { ZSTD: zstdDecompressSync } });
  for (const row of rows.filter(row => ['Push-up', 'Knee Push-up', 'Squat'].includes(row.action_name))) {
    const key = `${row.dataset}/${row.video_name}`;
    if (assets.has(key) && assets.get(key).video_sha256 !== row.video_sha256) throw new Error('Conflicting asset hashes');
    assets.set(key, row);
  }
}
const targets = [...assets.values()];
const exerciseFor = action => action === 'Squat' ? 'squat' : 'pushup';
const exactMatches = [];
const sourceOnlyCandidates = [];
let comparableOriginalSourceIds = 0;
for (const target of targets) {
  const exact = target.video_sha256 ? local.filter(row => row.sha256.toLowerCase() === target.video_sha256.toLowerCase()) : [];
  for (const match of exact) exactMatches.push({ split: match.split, exercise: match.exercise, targetExercise: exerciseFor(target.action_name) });
  if (target.dataset !== 'Kinetics-700') continue;
  const parsed = /^([A-Za-z0-9_-]{11})_(\d+)_(\d+)\.mp4$/.exec(target.video_name);
  if (!parsed) throw new Error('Unexpected Kinetics filename; cannot compare source IDs');
  comparableOriginalSourceIds++;
  for (const match of local.filter(row => /^Kinetics-/.test(row.sourceDataset) && row.sourceGroup === parsed[1])) {
    if (exact.includes(match)) continue;
    sourceOnlyCandidates.push({
      split: match.split,
      exercise: match.exercise,
      targetExercise: exerciseFor(target.action_name),
      sourceTimeBoundsMatch: match.sourceStart === Number(parsed[2]) && match.sourceEnd === Number(parsed[3]),
    });
  }
}
const bySplit = Object.fromEntries(['train', 'validation', 'test'].map(split => [split, {
  lockedVideos: local.filter(row => row.split === split).length,
  exactHashMatchPairs: exactMatches.filter(row => row.split === split).length,
  sourceIdOnlyCandidatePairs: sourceOnlyCandidates.filter(row => row.split === split).length,
  sourceIdOnlyWithSameNominalTimeBounds: sourceOnlyCandidates.filter(row => row.split === split && row.sourceTimeBoundsMatch).length,
  sourceIdOnlyExerciseCounts: Object.fromEntries(['pullup', 'pushup', 'squat'].map(exercise => [exercise, sourceOnlyCandidates.filter(row => row.split === split && row.exercise === exercise).length])),
}]));
if (sha(await readFile(manifestPath)) !== sha(originalBytes)) throw new Error('Manifest changed during read-only audit');
const decoder = JSON.parse(await readFile(resolve(here, 'private/decoder/node_modules/hyparquet/package.json'), 'utf8'));
const report = {
  kind: 'aggregate metadata-only overlap audit; no fault labels, clips, or predictions inspected',
  generatedAt: new Date().toISOString(),
  lockedManifest: { path: 'evaluation/manifests/dataset.jsonl', rows: local.length, canonicalSha256: canonicalHash, fileSha256: sha(originalBytes), verifiedUnchanged: true },
  fitAqa: { commit: 'eec7c3be769f038889a05e1ac81a93b0cf2513fd', projectedColumns: columns, uniqueTargetAssets: targets.length, targetAssetsWithVideoHashes: targets.filter(row => row.video_sha256).length, targetAssetsWithoutVideoHashes: targets.filter(row => !row.video_sha256).length, comparableOriginalSourceIds, annotationSha256: expected },
  decoder: { package: decoder.name, version: decoder.version, node: process.version, compression: 'Node built-in ZSTD' },
  totals: { exactHashMatchPairs: exactMatches.length, sourceIdOnlyCandidatePairs: sourceOnlyCandidates.length, sameSourceAndNominalTimeBoundsWithoutByteMatch: sourceOnlyCandidates.filter(row => row.sourceTimeBoundsMatch).length, crossExerciseMatchPairs: [...exactMatches, ...sourceOnlyCandidates].filter(row => row.exercise !== row.targetExercise).length },
  bySplit,
  interpretation: 'Source ID or nominal interval equality without a SHA-256 match does not establish frame/encoding alignment; no labels may be transferred. These are future identity-verification candidates only. Current groups and splits remain locked, including any test candidates.',
  notInspected: ['FitAQA gold/options/form_error/error_detail columns', 'core prediction files', 'video bytes or frames'],
};
await writeFile(resolve(here, 'fitaqa-overlap.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
