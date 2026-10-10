import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

test('actual model processing paints successive evidence frames and speaks their completed report', async ({ page }) => {
  test.skip(!existsSync('artifacts/real-exercise.mp4'), 'Public-domain Navy clip required; see fixture provenance.');
  await page.goto('/tests/harnesses/review.html?exercise=pushup&voice=test');
  await page.getByLabel('Choose exercise video').setInputFiles('artifacts/real-exercise.mp4');
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  const live = page.getByLabel('Live analysis: sampled recording with measured pose skeleton');
  await expect(live).toBeVisible();
  await expect.poll(() => live.getAttribute('data-visible-joints')).not.toBeNull();
  const first = Number(await live.getAttribute('data-timestamp'));
  await expect.poll(async () => Number(await live.getAttribute('data-timestamp'))).toBeGreaterThan(first);
  await expect.poll(async () => Number(await live.getAttribute('data-visible-joints'))).toBeGreaterThan(5);
  await page.screenshot({ path: 'artifacts/live-pose-analysis.png' });
  await expect(page.getByRole('region', { name: 'Movement analysis results' })).toBeVisible({ timeout: 60000 });
  await expect(live).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Listen again/ })).toBeEnabled();
  const spoken = await page.evaluate(() => (window as any).reviewSpeechCalls);
  expect(spoken).toHaveLength(1);
  expect(spoken[0]).toMatch(/hips|shoulders|rep|recording/i);
  expect(spoken[0]).not.toMatch(/projected|degrees|—|middle 80/);
  expect(spoken[0].length).toBeLessThan(1200);
  await expect(page.locator('#written-feedback')).toBeHidden();
  await expect(page.locator('.measurement-stats')).toBeHidden();
  await page.screenshot({ path: 'artifacts/voice-first-review.png' });
  await page.getByRole('button', { name: 'View written feedback' }).click();
  await expect(page.locator('#written-feedback')).toContainText('Try this:');
  await expect(page.locator('.measurement-stats')).toBeHidden();
  await page.getByText('Measurements, limits and sources', { exact: true }).click();
  await expect(page.locator('.measurement-stats')).toBeVisible();
  await expect(page.locator('.finding-card').first()).toContainText('projected angle');
  await page.getByRole('button', { name: 'Why does that help?' }).click();
  expect(await page.evaluate(() => (window as any).reviewSpeechCalls.length)).toBe(2);
  await page.screenshot({ path: 'artifacts/spoken-review.png' });
});

test('cancelling tracking leaves no stale report or speech', async ({ page }) => {
  await page.goto('/tests/harnesses/review.html?exercise=squat&voice=test');
  await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/playback.mp4');
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  await page.getByRole('button', { name: 'Stop analysis' }).click();
  await expect(page.getByRole('alert')).toContainText('Analysis stopped');
  await expect(page.getByRole('region', { name: 'Movement analysis results' })).toHaveCount(0);
  await expect(page.getByLabel('Live analysis: sampled recording with measured pose skeleton')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).reviewSpeechCalls)).toEqual([]);
  await expect(page.getByRole('button', { name: /Analyze movement/ })).toBeEnabled();
});

test('a clip with no person never gets a fabricated skeleton', async ({ page }) => {
  await page.goto('/tests/harnesses/review.html?exercise=squat');
  await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/playback.mp4');
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  const live = page.getByLabel('Live analysis: sampled recording with measured pose skeleton');
  await expect(live).toHaveAttribute('data-visible-joints', '0', { timeout: 60000 });
  await expect(page.getByRole('region', { name: 'Movement analysis results' })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('region', { name: 'Spoken feedback' })).toHaveAttribute('data-voice-state', 'error');
  await expect(page.getByRole('button', { name: /Try voice again/ })).toBeEnabled();
  await page.getByRole('button', { name: 'View written feedback' }).click();
  await expect(page.locator('#written-feedback')).toBeVisible();
});

test('voice can be retried after an unavailable connection without losing the report', async ({ page }) => {
  await page.goto('/tests/harnesses/review.html?exercise=squat&voice=recovery');
  await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/playback.mp4');
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  const voice = page.getByRole('region', { name: 'Spoken feedback' });
  await expect(voice).toHaveAttribute('data-voice-state', 'error');
  await expect(page.getByRole('button', { name: /Try voice again/ })).toBeEnabled();
  await page.getByRole('button', { name: 'View written feedback' }).click();
  await expect(page.locator('#written-feedback')).toBeVisible();
  await page.evaluate(() => { (window as any).reviewVoiceAvailable = true; });
  await page.getByRole('button', { name: /Try voice again/ }).click();
  await expect(voice).toHaveAttribute('data-voice-state', 'ready');
  expect(await page.evaluate(() => (window as any).reviewSpeechCalls.length)).toBe(1);
});

test('Stop during the initial connection check prevents a late automatic reading', async ({ page }) => {
  await page.goto('/tests/harnesses/review.html?exercise=squat&voice=slow');
  await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/playback.mp4');
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  const voice = page.getByRole('region', { name: 'Spoken feedback' });
  await expect(voice).toHaveAttribute('data-voice-state', 'checking');
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseReviewVoice)).toBe('function');
  await page.getByRole('button', { name: /Stop voice/ }).click();
  await page.evaluate(() => (window as any).releaseReviewVoice());
  await expect.poll(() => page.evaluate(() => (window as any).reviewVoiceChecks)).toBe(1);
  await expect(voice).toHaveAttribute('data-voice-state', 'paused');
  expect(await page.evaluate(() => (window as any).reviewSpeechCalls.length)).toBe(0);
  await page.getByRole('button', { name: /Play feedback/ }).click();
  await expect(voice).toHaveAttribute('data-voice-state', 'ready');
});
