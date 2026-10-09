import { test, expect } from '@playwright/test';

test('portrait recordings retain proportions and keep the analysis action visible', async ({ page }) => {
  await page.goto('/tests/harnesses/review.html?exercise=squat');
  await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/portrait.mp4');
  await expect(page.getByRole('button', { name: /Analyze movement/ })).toBeInViewport();
  await expect(page.getByRole('button', { name: /Analyze movement/ })).toBeEnabled();
  const layout = await page.getByLabel('Squats recording preview').evaluate((video: HTMLVideoElement) => {
    const box = video.getBoundingClientRect();
    return { ratio: box.width / box.height, source: video.videoWidth / video.videoHeight, height: box.height };
  });
  expect(layout.height).toBeLessThanOrEqual(321);
  expect(layout.ratio).toBeCloseTo(layout.source, 2);
  await expect(page.getByRole('img', { name: /Suggested side view for squats/ })).toBeHidden();
  await page.getByText('How should I record?', { exact: true }).click();
  await expect(page.getByRole('img', { name: /Suggested side view for squats/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/portrait-recording-guide.png' });
});
