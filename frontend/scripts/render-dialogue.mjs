/** Offline asset build. Sends only the fixed original script, never user media. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
try { process.loadEnvFile(path.join(root, 'frontend/.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Could not load local speech configuration.'); }
const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
if (!apiKey) throw new Error('Set DEEPGRAM_API_KEY in the environment or frontend/.env.local.');
const ffmpeg = process.env.FFMPEG_PATH || path.join(root, '.tools/ffmpeg.exe');
const script = JSON.parse(await fs.readFile(path.join(root, 'frontend/src/game/dialogue.json'), 'utf8'));
const entries = Object.entries(script);
if (entries.length !== 17 || entries.reduce((sum, [, line]) => sum + line.text.length, 0) > 5000) throw new Error('Dialogue exceeds the authorized fixed-script generation budget.');
const cache = path.join(root, '.tools/voice-studio/deepgram-aura2');
const output = path.join(root, 'frontend/public/audio');
await fs.mkdir(cache, { recursive: true });
const manifest = [];
const hash = data => createHash('sha256').update(data).digest('hex');
function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-threads', '1', ...args], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('Audio processing failed; inspect the local input WAV and FFmpeg installation.');
  return result.stderr;
}
function waveDuration(data) {
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Invalid audio response.');
  let byteRate = 0; let bytes = 0;
  for (let p = 12; p + 8 <= data.length;) {
    const size = data.readUInt32LE(p + 4), name = data.toString('ascii', p, p + 4);
    if (name === 'fmt ') byteRate = data.readUInt32LE(p + 16);
    if (name === 'data') bytes += Math.min(size, data.length - p - 8);
    p += size + 8 + (size % 2);
  }
  if (!byteRate || !bytes) throw new Error('Audio response has no PCM samples.');
  return bytes / byteRate;
}
for (const [key, line] of entries) {
  const model = line.role === 'traveller' ? 'aura-2-apollo-en' : 'aura-2-thalia-en';
  const fingerprint = hash(JSON.stringify({ model, text: line.text, sampleRate: 24000, revision: 1 }));
  const rawPath = path.join(cache, `${fingerprint}.wav`);
  const receiptPath = path.join(cache, `${fingerprint}.json`);
  let receipt;
  try { receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8')); await fs.access(rawPath); }
  catch {
    const url = new URL('https://api.deepgram.com/v1/speak');
    for (const [name, value] of Object.entries({ model, encoding: 'linear16', container: 'wav', sample_rate: '24000', mip_opt_out: 'true' })) url.searchParams.set(name, value);
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: line.text }), signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Speech generation failed for ${key}: HTTP ${response.status}. No automatic paid retry was attempted.`);
    const audio = Buffer.from(await response.arrayBuffer());
    const duration = waveDuration(audio);
    if (duration < .2 || duration > 30 || audio.length > 2 * 1024 * 1024) throw new Error(`Unexpected speech length for ${key}.`);
    receipt = { generatedAt: new Date().toISOString(), provider: 'Deepgram', model, providerModel: response.headers.get('dg-model-name'), characters: Number(response.headers.get('dg-char-count')) || line.text.length };
    await fs.writeFile(rawPath, audio);
    await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  }
  const statsText = run(['-i', rawPath, '-af', 'loudnorm=I=-19:TP=-2:LRA=9:print_format=json', '-f', 'null', '-']);
  const stats = JSON.parse(statsText.slice(statsText.lastIndexOf('{'), statsText.lastIndexOf('}') + 1));
  const normalized = path.join(cache, `${fingerprint}-normalized.wav`);
  const filter = `loudnorm=I=-19:TP=-2:LRA=9:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`;
  run(['-y', '-i', rawPath, '-af', filter, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', normalized]);
  const rendered = await fs.readFile(normalized);
  manifest.push({ key, role: line.role, text: line.text, voice: model, model: 'Deepgram Aura 2', format: '24kHz mono PCM16 WAV', duration: Number(waveDuration(rendered).toFixed(3)), sha256: hash(rendered), ...receipt, sourceFingerprint: fingerprint });
  console.log(`${key}: ${waveDuration(rendered).toFixed(2)}s (${model})`);
}
// Publish only once every cue is successfully generated and normalized.
for (const row of manifest) await fs.copyFile(path.join(cache, `${row.sourceFingerprint}-normalized.wav`), path.join(output, `${row.key}.wav`));
await fs.writeFile(path.join(output, 'dialogue.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Published ${manifest.length} dialogue clips. No API credentials were written to assets.`);
