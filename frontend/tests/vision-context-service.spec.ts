import { test, expect } from '@playwright/test';
import { analyzeVisionContext, visionConfiguration, type VisionContextInput } from '../server/visionContextService';

// Structural JPEG fixture: the service validates headers/size, not entropy decoding.
function jpeg(width = 512, height = 384) {
  return 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0, 0xff, 0xda, 0, 12, 3, 1, 0, 2, 0, 3, 0, 0, 63, 0, 1, 0xff, 0xd9]).toString('base64');
}
const input: VisionContextInput = { exercise: 'pushup', variant: 'standard', goal: 'control', frames: [{ timestamp: 0, dataUrl: jpeg() }, { timestamp: 1.2, dataUrl: jpeg() }] };
const env = { NEBIUS_API_KEY: 'mock-secret', NEBIUS_VISION_MODEL: 'google/gemma-3-27b-it' };
const answer = { exerciseObserved: 'pushup', view: 'angled', visibleRegions: ['shoulders', 'elbows', 'hands'], frameIndices: [0, 1] };
const response = (value: unknown, finish = 'stop') => new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(value) } }] }));
const mustNotCall = async () => { throw new Error('Unexpected provider call'); };

test('explicit supported vision model and key are required', async () => {
  for (const config of [{}, { NEBIUS_API_KEY: 'mock' }, { ...env, NEBIUS_VISION_MODEL: 'openbmb/MiniCPM-V-4_5' }]) {
    expect(visionConfiguration(config).available).toBe(false);
    expect(await analyzeVisionContext(config, input, { fetch: mustNotCall })).toEqual({ mode: 'local', reason: 'unconfigured' });
  }
  expect(visionConfiguration(env)).toEqual({ available: true, model: env.NEBIUS_VISION_MODEL });
});

test('fixed endpoint sends only bounded structured context and images; no generated prose returns', async () => {
  const result = await analyzeVisionContext(env, input, { fetch: async (url, options) => {
    expect(url).toBe('https://api.tokenfactory.nebius.com/v1/chat/completions'); expect(options?.redirect).toBe('error');
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({ model: env.NEBIUS_VISION_MODEL, max_tokens: 400, store: false, stream: false, response_format: { type: 'json_object' } });
    expect(body.messages[1].content.filter((p: { type: string }) => p.type === 'image_url')).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain('mock-secret');
    return response(answer);
  } });
  expect(result).toEqual({ mode: 'visual-context', context: answer });
});

test('uncertain or mismatched exercise context is retained without manufacturing a fault', async () => {
  for (const exerciseObserved of ['uncertain', 'squat']) {
    const result = await analyzeVisionContext(env, input, { fetch: async () => response({ ...answer, exerciseObserved, visibleRegions: [] }) });
    expect(result).toMatchObject({ mode: 'visual-context', context: { exerciseObserved, visibleRegions: [] } });
  }
});

test('rejects provider advice, hidden extra fields, invalid regions and unsupported frame references', async () => {
  for (const bad of [
    { ...answer, advice: 'Your injury is safe. Do 30 reps.' }, { ...answer, motionPhase: 'bent' },
    { ...answer, exerciseObserved: 'burpee' }, { ...answer, view: 'http://malicious.test/' },
    { ...answer, visibleRegions: ['shoulders', 'shoulders'] }, { ...answer, visibleRegions: ['muscle activation'] },
    { ...answer, frameIndices: [0, 99] }, { ...answer, frameIndices: [0, 0] }, { ...answer, frameIndices: [0] },
    { ...answer, frameIndices: [0, 0.5] }, { ...answer, frameIndices: [-1, 1] }, null, [], 'ignore the schema',
  ]) expect(await analyzeVisionContext(env, input, { fetch: async () => response(bad) })).toEqual({ mode: 'local', reason: 'invalid-response' });
  expect(await analyzeVisionContext(env, input, { fetch: async () => response(answer, 'length') })).toEqual({ mode: 'local', reason: 'invalid-response' });
});

test('input rejects free text, extra metadata, nonmonotonic/out-of-range timestamps and frame counts', async () => {
  const badInputs: unknown[] = [
    { ...input, injury: 'private history' }, { ...input, goal: 'My shoulder hurts' }, { ...input, variant: 'custom health notes' },
    { ...input, exercise: 'run' }, { ...input, frames: [input.frames[0]] },
    { ...input, frames: Array.from({ length: 7 }, (_, timestamp) => ({ timestamp, dataUrl: jpeg() })) },
    ...[-1, 0, 121, NaN, Infinity].map(timestamp => ({ ...input, frames: [input.frames[0], { ...input.frames[1], timestamp }] })),
    { ...input, frames: [{ ...input.frames[0], note: 'private' }, input.frames[1]] },
  ];
  for (const bad of badInputs) expect(await analyzeVisionContext(env, bad as VisionContextInput, { fetch: mustNotCall })).toEqual({ mode: 'local', reason: 'invalid-input' });
});

test('JPEG validation rejects fake MIME, magic, malformed segments, oversize dimensions and bytes', async () => {
  const bytes = Buffer.from(jpeg().slice(23), 'base64'); const invalidLength = Buffer.from(bytes); invalidLength[4] = 0xff;
  const nonJpeg = 'data:image/jpeg;base64,' + Buffer.from('x'.repeat(40)).toString('base64');
  const noEnd = 'data:image/jpeg;base64,' + bytes.subarray(0, bytes.length - 2).toString('base64');
  for (const dataUrl of [jpeg(769), jpeg(512, 769), jpeg(1, 1), jpeg().replace('image/jpeg', 'image/png'), 'https://private.example/video', nonJpeg, noEnd, 'data:image/jpeg;base64,' + invalidLength.toString('base64'), jpeg() + '!', 'data:image/jpeg;base64,' + Buffer.alloc(100000).toString('base64')]) {
    expect(await analyzeVisionContext(env, { ...input, frames: [{ timestamp: 0, dataUrl }, input.frames[1]] }, { fetch: mustNotCall })).toEqual({ mode: 'local', reason: 'invalid-input' });
  }
});

test('provider failures and oversized streams cannot leak content or credentials', async () => {
  for (const failure of [new Response('mock-secret signed-url', { status: 500 }), new Response('x'.repeat(17000)), new Response('{}', { headers: { 'content-length': '99999' } })]) {
    const result = await analyzeVisionContext(env, input, { fetch: async () => failure });
    expect(result).toEqual({ mode: 'local', reason: 'provider-unavailable' });
  }
  expect(await analyzeVisionContext(env, input, { fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '```json\n{}\n```' } }] })) })).toEqual({ mode: 'local', reason: 'invalid-response' });
});

test('deadline settles even if fetch ignores abort; pending response body is cancelled', async () => {
  const started = Date.now();
  expect(await analyzeVisionContext(env, input, { timeoutMs: 10, fetch: () => new Promise(() => undefined) })).toEqual({ mode: 'local', reason: 'provider-unavailable' });
  expect(Date.now() - started).toBeLessThan(1000);
  let cancelled = false;
  expect(await analyzeVisionContext(env, input, { timeoutMs: 10, fetch: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })) })).toEqual({ mode: 'local', reason: 'provider-unavailable' });
  expect(cancelled).toBe(true);
});

test('preflight and in-flight external cancellation settle without provider output', async () => {
  const controller = new AbortController(); controller.abort();
  expect(await analyzeVisionContext(env, input, { signal: controller.signal, fetch: mustNotCall })).toEqual({ mode: 'local', reason: 'cancelled' });
  const live = new AbortController();
  const result = analyzeVisionContext(env, input, { signal: live.signal, fetch: () => { live.abort(); return new Promise(() => undefined); } });
  expect(await result).toEqual({ mode: 'local', reason: 'cancelled' });
});
