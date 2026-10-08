import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { narrateReport, narrateFinding } from '../src/analysis/narration';
import { summarize } from '../src/analysis/measurements';

test('spoken reviews preserve findings and uncertainty without inventing a form verdict', () => {
  const report = summarize([], 'squat', 3, 640, 480);
  const spoken = narrateReport(report);
  expect(spoken).toContain("couldn't get a dependable movement measurement");
  for (const finding of report.findings) {
    expect(spoken).toContain(narrateFinding(finding));
    expect(narrateFinding(finding)).toContain(finding.suggestion);
  }
  expect(spoken).toContain(report.limitations[0]);
  expect(spoken).not.toMatch(/your form is (correct|incorrect)|80% confident/);
  expect(narrateFinding({ id: 'range', title: 'Bend', timestamp: 2.5, observation: 'At 2.5s, the visible elbow spans 80–150°. The middle 80% of samples are included.', suggestion: 'Compare these positions.' })).toBe('At 2.5 seconds, the visible elbow spans 80 to 150 degrees. The middle 80 percent of samples are included. Compare these positions.');
});

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
  await expect(page.getByRole('button', { name: 'Listen to review' })).toBeEnabled();
  const spoken = await page.evaluate(() => (window as any).reviewSpeechCalls);
  expect(spoken).toHaveLength(1);
  const observation = await page.locator('.finding-card p').first().textContent();
  expect(spoken[0]).toContain(observation!.match(/visible (left|right) elbow/)![0]);
  expect(spoken[0]).toContain(observation!.match(/about (\d+)°/)![1] + ' degrees');
  await page.getByRole('button', { name: /^Listen ·/ }).first().click();
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
  await expect(page.getByRole('heading', { name: 'Here’s where the view falls short.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Spoken feedback' })).toContainText('Spoken feedback is not connected');
});
