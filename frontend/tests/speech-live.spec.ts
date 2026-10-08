import { test, expect } from '@playwright/test';

test.use({ trace: 'off' });

// Explicit opt-in: this check uses the configured provider and can incur usage.
// It never reads the key, records a trace, or sends a user's exercise recording.
test('configured Deepgram audio completes in the browser and replay can be stopped', async ({ page }) => {
  test.skip(process.env.ASTER_LIVE_SPEECH !== '1', 'Opt in with ASTER_LIVE_SPEECH=1 after configuring the local speech key.');
  await page.goto('/tests/harnesses/speech.html');
  const available = await page.evaluate(async () => {
    const response = await fetch('/api/speech/config');
    const configuration = await response.json();
    return configuration.available === true;
  });
  expect(available).toBe(true);
  const generated = page.waitForResponse(response => response.url().endsWith('/api/speech/review') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Read review', exact: true }).click();
  const response = await generated;
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('audio/');
  expect((await response.body()).byteLength).toBeGreaterThan(1000);
  await expect(page.getByRole('status')).toHaveText('speaking');
  await expect(page.getByRole('status')).toHaveText('completed', { timeout: 30000 });
  const replay = page.waitForResponse(response => response.url().endsWith('/api/speech/review') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Read review', exact: true }).click();
  expect((await replay).headers()['x-aster-speech-cache']).toBe('hit');
  await expect(page.getByRole('status')).toHaveText('speaking');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('cancelled');
});
