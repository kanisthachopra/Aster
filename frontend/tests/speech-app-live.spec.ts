import { test, expect } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { park, moveTo } from './helpers/voice-expedition';

test.use({ trace: 'off' });

// This deliberately uses the real App, real local model and real provider. No
// injected reports, test-only app routes, or AudioContext playback substitutes.
test('real expedition and exercise review produce audible feedback, replay and stop', async ({ page }) => {
  test.skip(process.env.ASTER_LIVE_SPEECH !== '1', 'Paid provider verification requires explicit opt-in.');
  test.skip(!existsSync('artifacts/real-exercise.mp4'), 'Public-domain exercise fixture is required.');
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    type Probe = { starts: Array<{ at: number; duration: number; rms: number; state: string }>; context?: AudioContext; analyser?: AnalyserNode };
    const probe: Probe = { starts: [] };
    Object.assign(window, { voiceProbe: probe });
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this), start = source.start.bind(source), context = this;
      source.start = (...args: Parameters<typeof start>) => {
        const data = source.buffer?.getChannelData(0); let squares = 0;
        if (data) for (let i = 0; i < data.length; i++) squares += data[i] * data[i];
        probe.starts.push({ at: performance.now(), duration: source.buffer?.duration ?? 0, rms: data?.length ? Math.sqrt(squares / data.length) : 0, state: context.state });
        probe.context = context; start(...args);
      };
      return source;
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (...args: Parameters<AudioNode['connect']>) {
      const result = Reflect.apply(connect, this, args);
      if (args[0] instanceof AudioDestinationNode && !probe.analyser) {
        probe.analyser = (this.context as AudioContext).createAnalyser();
        Reflect.apply(connect, this, [probe.analyser]);
      }
      return result;
    } as AudioNode['connect'];
  });
  await park(page);
  await page.getByRole('button', { name: /02.*GROUNDWORK.*Push-ups/ }).click();
  await moveTo(page, 0, 70);
  await page.keyboard.press('e');
  await page.getByLabel('Choose exercise video').setInputFiles('artifacts/real-exercise.mp4');
  await expect(page.getByText('7.0s', { exact: true })).toBeVisible();
  const configuration = await page.evaluate(async () => {
    const { available, model, remainingCharacters, message } = await (await fetch('/api/speech/config')).json();
    return { available, model, remainingCharacters, message };
  });
  expect(configuration.available).toBe(true);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/speech/review') && response.request().method() === 'POST', { timeout: 150000 });
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const spokenText = response.request().postDataJSON().text as string;
  expect(spokenText.length).toBeLessThanOrEqual(900);
  expect((await response.body()).byteLength).toBeGreaterThan(1000);
  const voice = page.getByLabel('Spoken feedback');
  await expect(voice).toHaveAttribute('data-voice-state', 'speaking');
  await expect(page.locator('#written-feedback')).toBeHidden();
  const output = await page.evaluate(async () => {
    const probe = (window as unknown as { voiceProbe: { starts: Array<{ duration: number; rms: number; state: string }>; context: AudioContext; analyser: AnalyserNode } }).voiceProbe;
    let peak = 0;
    for (let sample = 0; sample < 12; sample++) {
      const data = new Float32Array(probe.analyser.fftSize); probe.analyser.getFloatTimeDomainData(data);
      peak = Math.max(peak, ...data.map(Math.abs)); await new Promise(resolve => setTimeout(resolve, 80));
    }
    return { source: probe.starts.at(-1), contextState: probe.context.state, outputPeak: peak };
  });
  expect(output.contextState).toBe('running');
  expect(output.source?.state).toBe('running');
  expect(output.source?.rms).toBeGreaterThan(.005);
  expect(output.outputPeak).toBeGreaterThan(.005);
  await voice.screenshot({ path: 'artifacts/voice-app-playing.png' });
  await page.screenshot({ path: 'artifacts/voice-app-review.png', fullPage: true });
  await expect(voice).toHaveAttribute('data-voice-state', 'ready', { timeout: 90000 });
  const replay = page.waitForResponse(response => response.url().endsWith('/api/speech/review'));
  await voice.getByRole('button', { name: /Listen again/ }).click();
  expect((await replay).headers()['x-aster-speech-cache']).toBe('hit');
  await expect(voice).toHaveAttribute('data-voice-state', 'speaking');
  await voice.getByRole('button', { name: /Stop voice/ }).click();
  await expect(voice).toHaveAttribute('data-voice-state', 'paused');
  await page.getByRole('button', { name: /View written feedback/ }).click();
  await expect(page.locator('#written-feedback')).toBeVisible();
  expect(errors).toEqual([]);
  writeFileSync('artifacts/voice-app-verification.json', JSON.stringify({ checkedAt: new Date().toISOString(), verificationPath: 'full App / public Navy push-up fixture / real local inference / actual Deepgram', configuration, characters: spokenText.length, audioBytes: (await response.body()).byteLength, ...output, replay: 'cache hit', stop: 'paused', errors }, null, 2));
});
