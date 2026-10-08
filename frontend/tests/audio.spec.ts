import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const script: Record<string, { text: string }> = JSON.parse(readFileSync('src/game/dialogue.json', 'utf8'));

test('every spoken line has a matching local neural recording and subtitle', () => {
  const manifest = JSON.parse(readFileSync('public/audio/dialogue.json', 'utf8'));
  for (const [key, line] of Object.entries(script)) {
    const recording = readFileSync(`public/audio/${key}.wav`);
    expect(recording.toString('ascii', 0, 4)).toBe('RIFF');
    expect(recording.toString('ascii', 8, 12)).toBe('WAVE');
    expect(recording.length).toBeGreaterThan(24000);
    expect(JSON.stringify(manifest)).toContain(line.text);
  }
});

test('opening starts with one voice, no surf-like noise, and skipping stops it', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { buffers: [] as number[], stopped: 0, oscillators: 0 };
    Object.assign(window, { audioTest: state });
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this), start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...args: Parameters<typeof start>) => { state.buffers.push(source.buffer?.duration ?? 0); start(...args); };
      source.stop = (...args: Parameters<typeof stop>) => { state.stopped++; stop(...args); };
      return source;
    };
    const oscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { state.oscillators++; return oscillator.call(this); };
  });
  await page.goto('/tests/harnesses/audio.html');
  const state = () => page.evaluate(() => (window as unknown as {audioTest: {buffers: number[]; stopped: number; oscillators: number}}).audioTest);
  expect(await state()).toEqual({ buffers: [], stopped: 0, oscillators: 0 });
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await expect.poll(async () => (await state()).buffers.length).toBe(1);
  await page.waitForTimeout(900);
  expect((await state()).buffers[0]).toBeGreaterThan(4);
  expect((await state()).oscillators).toBe(0);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  expect((await state()).stopped).toBe(1);
});
