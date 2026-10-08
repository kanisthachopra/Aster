import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zstdDecompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parquetReadObjects, asyncBufferFromFile } from './private/decoder/node_modules/hyparquet/src/node.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const expected = {
  multiple_choice: '26fe661c5054dc64d9bb3b7ec267fc533ed3952907b8ffa763339b8328db461f',
  temporal_grounding: '5d2471fb599f627b56ad70d1880c65221571d97d538e24bf6ff01cc21826830f',
};
const inputs = {};
const files = {};
for (const [name, sha256] of Object.entries(expected)) {
  const path = resolve(here, 'private', `${name}.parquet`);
  const bytes = await readFile(path);
  if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error(`Unexpected ${name} checksum`);
  inputs[name] = await parquetReadObjects({ file: await asyncBufferFromFile(path), compressors: { ZSTD: zstdDecompressSync } });
  files[name] = { bytes: bytes.length, sha256, rows: inputs[name].length };
}
const unique = items => [...new Set(items)];
const asset = row => `${row.dataset}/${row.video_name}`;
const countAssets = rows => unique(rows.map(asset)).length;
const faultAspectKey = row => JSON.stringify(row.form_error);
const mcq = inputs.multiple_choice;
const temporal = inputs.temporal_grounding;
if (mcq.length !== 5124 || temporal.length !== 388 || countAssets([...mcq, ...temporal]) !== 2219) throw new Error('Global counts differ from the release manifest');
if (unique([...mcq, ...temporal].map(row => row.question_id)).length !== 5512) throw new Error('Duplicate question IDs');
const pairMap = new Map(mcq.map(row => [row.question_id, row]));
for (const row of mcq) {
  if (!row.options.some(option => option.label === row.gold) || !row.options.some(option => option.label === row.correct_form_option)) throw new Error('Unknown option label');
  if (!['perception', 'judgement'].includes(row.task)) throw new Error('Unknown MCQ task');
  const partnerTask = row.task === 'perception' ? 'judgement' : 'perception';
  const partner = pairMap.get(row.question_id.replace(`${row.task}_`, `${partnerTask}_`));
  if (!partner || asset(partner) !== asset(row) || partner.action_name !== row.action_name || faultAspectKey(partner) !== faultAspectKey(row) || (partner.gold === partner.correct_form_option) !== (row.gold === row.correct_form_option)) throw new Error('Paired-question mismatch');
}
for (const row of temporal) {
  if (row.task !== 'temporal_grounding' || !Array.isArray(row.gold) || row.gold.length === 0 || row.gold.some(interval => !Number.isFinite(interval.start) || interval.start < 0 || !Number.isFinite(interval.end) || interval.end <= interval.start)) throw new Error('Invalid temporal annotation');
  if (!/^.+_\d{2}\.mp4$/.test(row.video_name)) throw new Error('Unexpected processed-clip name; do not infer parent workout');
}

function summarizeShort(rows) {
  const judgements = rows.filter(row => row.task === 'judgement');
  const errorRows = judgements.filter(row => row.gold !== row.correct_form_option);
  const correctRows = judgements.filter(row => row.gold === row.correct_form_option);
  const anyErrorAssets = new Set(errorRows.map(asset));
  const allAssets = unique(rows.map(asset));
  return {
    uniqueSourceAssets: allAssets.length,
    questionInstances: rows.length,
    perceptionInstances: rows.filter(row => row.task === 'perception').length,
    judgementInstances: judgements.length,
    errorJudgementInstances: errorRows.length,
    correctAspectJudgementInstances: correctRows.length,
    uniqueAssetsWithAnyAssessedError: anyErrorAssets.size,
    uniqueAssetsWithOnlyCorrectAssessedAspects: allAssets.filter(id => !anyErrorAssets.has(id)).length,
    distinctAssessedAspectLabels: unique(judgements.flatMap(row => row.form_error)).sort(),
    assessedLabelsOnErrorAnswerRows: unique(errorRows.flatMap(row => row.form_error)).sort(),
    multiLabelJudgementInstances: judgements.filter(row => row.form_error.length > 1).length,
    hashedAssets: countAssets(rows.filter(row => row.video_sha256)),
    distinctNonNullVideoHashes: unique(rows.filter(row => row.video_sha256).map(row => row.video_sha256)).length,
    unhashedFrameSequenceAssets: countAssets(rows.filter(row => !row.video_sha256)),
  };
}
function summarizeTemporal(rows) {
  return {
    processedSingleExerciseClips: countAssets(rows),
    parentWorkoutIdsFromDocumentedFilenameConvention: unique(rows.map(row => `${row.dataset}/${row.video_name.replace(/_\d{2}\.mp4$/, '')}`)).length,
    questionInstances: rows.length,
    annotatedIntervalsAcrossQuestions: rows.reduce((sum, row) => sum + row.gold.length, 0),
    distinctTargetErrorLabels: unique(rows.flatMap(row => row.form_error)).sort(),
  };
}
const actions = ['Push-up', 'Knee Push-up', 'Squat'];
const coverage = actions.map(action => {
  const shortRows = mcq.filter(row => row.action_name === action);
  const temporalRows = temporal.filter(row => row.action_name === action);
  return {
    action,
    short: summarizeShort(shortRows),
    shortBySource: Object.fromEntries(unique(shortRows.map(row => row.dataset)).sort().map(source => [source, summarizeShort(shortRows.filter(row => row.dataset === source))])),
    temporal: summarizeTemporal(temporalRows),
    temporalBySource: Object.fromEntries(unique(temporalRows.map(row => row.dataset)).sort().map(source => [source, summarizeTemporal(temporalRows.filter(row => row.dataset === source))])),
  };
});
const decoder = JSON.parse(await readFile(resolve(here, 'private/decoder/node_modules/hyparquet/package.json'), 'utf8'));
const targetShort = mcq.filter(row => actions.includes(row.action_name));
const targetTemporal = temporal.filter(row => actions.includes(row.action_name));
const report = {
  kind: 'metadata-only FitAQA coverage census; no model predictions or media inference',
  generatedAt: new Date().toISOString(),
  source: 'https://huggingface.co/datasets/Kelly0510/FitAQA',
  sourceCommit: 'eec7c3be769f038889a05e1ac81a93b0cf2513fd',
  decoder: { package: decoder.name, version: decoder.version, node: process.version, compression: 'Node built-in ZSTD' },
  files,
  checks: { manifestTotalsMatch: true, uniqueQuestionIds: true, pairedAnswersAgree: true, goldOptionLabelsValid: true, temporalIntervalsOrdered: true },
  allShortActions: unique(mcq.map(row => row.action_name)).sort(),
  allTemporalActions: unique(temporal.map(row => row.action_name)).sort(),
  coverage,
  targetTotals: {
    short: summarizeShort(targetShort),
    temporal: summarizeTemporal(targetTemporal),
    unionUniqueAssetsAcrossConfigurations: countAssets([...targetShort, ...targetTemporal]),
    totalQuestionInstances: targetShort.length + targetTemporal.length,
  },
  interpretation: {
    errorJudgement: 'gold differs from correct_form_option for the particular assessed aspect, not a whole-repetition quality label',
    allCorrect: 'all released questions for this asset are correct; not proof of globally correct form',
    multipleLabels: 'a question can assess several form_error labels; even an error answer does not establish that every listed label is present. Use the selected perception option and expert-approved mapping for individual fault labels.',
    intervals: 'sum of annotated intervals per question; intervals for different errors may overlap and are not independent repetitions',
    parentWorkouts: 'source dataset + clip filename with the final _NN.mp4 removed, following the documented preprocessing convention; original media not inspected',
    mediaDownloadCount: 0,
    inferenceRunCount: 0,
    formAccuracy: null,
  },
};
await writeFile(resolve(here, 'fitaqa-coverage.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  decoder: report.decoder,
  checks: report.checks,
  coverage: coverage.map(row => ({
    action: row.action,
    shortAssets: row.short.uniqueSourceAssets,
    shortQuestions: row.short.questionInstances,
    errorJudgements: row.short.errorJudgementInstances,
    correctAspectJudgements: row.short.correctAspectJudgementInstances,
    temporalClips: row.temporal.processedSingleExerciseClips,
    temporalQuestions: row.temporal.questionInstances,
    temporalIntervals: row.temporal.annotatedIntervalsAcrossQuestions,
  })),
  totalUniqueAssets: report.targetTotals.unionUniqueAssetsAcrossConfigurations,
  totalQuestionInstances: report.targetTotals.totalQuestionInstances,
}, null, 2));
