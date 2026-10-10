import { test, expect } from '@playwright/test';

for (const [exercise, height] of [['pullup', 'roughly around hip or chest height'], ['pushup', 'near your body height'], ['squat', 'roughly around hip height']]) {
  test(`${exercise} guide explains placement, framing and existing clips`, async ({ page }) => {
    await page.goto(`/tests/harnesses/recording-guide.html?exercise=${exercise}&reduce`);
    await expect(page.getByRole('tabpanel')).toContainText(height);
    await expect(page.getByText('Already have a clip?')).toBeVisible();
    await expect(page.getByText('Try it as it is.', { exact: false })).toBeVisible();
    await page.getByRole('tab', { name: '02 Check both ends' }).click();
    await page.getByRole('button', { name: 'Position 2', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Position 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `artifacts/recording-guide-${exercise}.png` });
    await page.getByRole('tab', { name: '03 Record a short set' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('2–120 second clip');
    await expect(page.getByRole('tabpanel')).toContainText('one person and one exercise');
  });
}

test('animation pauses in place and resumes; orientation and narration are explicit', async ({ page }) => {
  await page.goto('/tests/harnesses/recording-guide.html?exercise=pushup');
  const figure = page.locator('[data-joint="head"]');
  const moving = await figure.evaluate(element => element.getAnimations()[0].playState);
  expect(moving).toBe('running');
  await page.getByRole('button', { name: 'Pause recording example' }).click();
  const frozen = await figure.evaluate(element => element.getAnimations()[0].currentTime);
  await page.waitForTimeout(300);
  expect(await figure.evaluate(element => element.getAnimations()[0].currentTime)).toBe(frozen);
  await page.getByRole('tab', { name: '02 Check both ends' }).click();
  await page.getByRole('button', { name: 'Position 2', exact: true }).click();
  await expect(page.getByTestId('recording-caption')).toContainText('Bottom position');
  await page.getByRole('button', { name: 'Portrait', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Portrait', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('PORTRAIT WORKS TOO', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { guideSpeech: string[] }).guideSpeech)).toEqual([]);
  await page.getByRole('button', { name: 'Read these tips' }).click();
  expect(await page.evaluate(() => (window as unknown as { guideSpeech: string[] }).guideSpeech[0])).toContain('Check the top and bottom positions');
  await page.getByRole('button', { name: 'Play recording example' }).click();
  await expect.poll(() => figure.evaluate(element => element.getAnimations()[0].playState)).toBe('running');
});

test('OS reduced motion and keyboard steps retain a usable static example on narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/tests/harnesses/recording-guide.html?exercise=squat');
  await expect(page.getByText('Motion is off.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause recording example' })).toHaveCount(0);
  expect(await page.locator('[data-joint="head"]').evaluate(element => element.getAnimations()[0].playState)).toBe('paused');
  const first = page.getByRole('tab', { name: '01 Place the camera' });
  await first.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '02 Check both ends' })).toBeFocused();
  await expect(page.getByRole('tab', { name: '02 Check both ends' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Position 2', exact: true }).click();
  await expect(page.getByTestId('recording-caption')).toContainText('Lowered');
  const overflow = await page.locator('.recording-guide').evaluate(element => element.scrollWidth > element.clientWidth + 1);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/recording-guide-narrow.png' });
});
