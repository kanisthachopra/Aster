/** Pixel-level perturbations of public development fixtures; never held-out data. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, sha, readManifest } from '../lib.mjs';
const output = resolve(ROOT, 'frontend/artifacts/cropped-evaluation');
mkdirSync(output, { recursive: true });
const records = readManifest(resolve(ROOT, 'evaluation/manifests/dataset.jsonl'));
const pullup = records.find(row => row.sourceGroup === '_2ynLsdbiOs');
const squat = records.find(row => row.sourceGroup === 'gV3dgCS0hWU');
if (!pullup || !squat || [pullup, squat].some(row => row.split !== 'train')) throw Error('Only the designated training fixtures may be used.');
const sources = {
  pushup: { path: 'frontend/artifacts/real-exercise.mp4', sourceGroup: 'navy-buds-pushup-81-88', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Navy-seal-buds-training-push-ups.ogv', license: 'US Navy official-duty work; public-domain status documented in the local source provenance.' },
  pullup: { path: pullup.relativePath, sourceGroup: pullup.sourceGroup, sourceUrl: pullup.sourceUrl, license: pullup.license },
  squat: { path: squat.relativePath, sourceGroup: squat.sourceGroup, sourceUrl: squat.sourceUrl, license: squat.license },
};
const transforms = [
  { id: 'navy-original', exercise: 'pushup', filter: null },
  { id: 'navy-arms-crop', exercise: 'pushup', filter: 'crop=390:440:330:20' },
  { id: 'pullup-original', exercise: 'pullup', filter: null },
  { id: 'pullup-arms-crop', exercise: 'pullup', filter: 'crop=420:270:400:50' },
  { id: 'squat-original', exercise: 'squat', filter: null },
  { id: 'squat-legs-crop', exercise: 'squat', filter: 'crop=320:100:0:80,pad=320:180:0:40:black' },
  { id: 'navy-interrupted-arms', exercise: 'pushup', filter: "crop=390:440:330:20,drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='between(t,2.2,4.6)'", gap: [2.2, 4.6] },
];
const ffmpeg = process.env.FFMPEG_PATH || resolve(ROOT, '.tools/ffmpeg.exe');
const rows = [];
for (const item of transforms) {
  const source = sources[item.exercise], input = resolve(ROOT, source.path);
  if (!existsSync(input)) throw Error('Public development fixture is missing: ' + source.path);
  const file = item.filter ? resolve(output, item.id + '.mp4') : input;
  if (item.filter) {
    const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-threads', '1', '-i', input, '-vf', item.filter, '-an', '-c:v', 'libx264', '-threads', '1', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { encoding: 'utf8' });
    if (result.status !== 0) throw Error(`FFmpeg failed for ${item.id}: ${result.stderr}`);
  }
  rows.push({ ...item, ...source, path: file, sourceSha256: sha(readFileSync(input)), sha256: sha(readFileSync(file)), privacy: 'public', transformation: item.filter ? 'synthetic pixel crop/occlusion of a real original recording' : 'unmodified development control' });
}
const empty = resolve(output, 'empty-scene.mp4');
const generated = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'lavfi', '-i', 'color=c=0x243542:s=480x360:r=24:d=5', '-an', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', empty], { encoding: 'utf8' });
if (generated.status !== 0) throw Error('Could not generate the empty-scene negative.');
rows.push({ id: 'empty-scene', exercise: 'pushup', path: empty, sha256: sha(readFileSync(empty)), privacy: 'public', syntheticNegative: true, transformation: 'generated flat-color no-person negative; not a real exercise video', license: 'Original test fixture' });
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(`Prepared ${rows.length} local fixtures from three source recordings; no new independent samples or form labels claimed.`);
