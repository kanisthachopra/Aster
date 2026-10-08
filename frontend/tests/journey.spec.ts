import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';

async function start(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeEnabled();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByRole('button', { name: /Skip opening/ }).click();
  await page.getByRole('button', { name: /New to this world/ }).click();
}
async function tour(page: Page) {
  await expect(page.getByRole('heading', { name: 'Let me show you around.' })).toBeVisible();
  for (const title of ['Let’s work on something real.', 'One useful review at a time.', 'You bring the energy.', 'A little room to play.']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Got it. Keep going/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Make the place feel like yours.' })).toBeVisible();
  await page.getByRole('button', { name: /Choose my first station/ }).click();
}
async function park(page: Page) {
  await start(page);
  await page.getByRole('button', { name: /Preview dome arrival/ }).click();
  await expect(page.getByRole('heading', { name: 'What should I call you?' })).toBeVisible({ timeout: 50000 });
  await page.getByRole('button', { name: /Continue as traveller/ }).click();
  await tour(page);
}
async function hold(page: Page, key: string, milliseconds: number) {
  await page.keyboard.down(key); await page.waitForTimeout(milliseconds); await page.keyboard.up(key);
}
async function faceNorth(page: Page, tolerance = 1) {
  // Arrival intentionally keeps the camera facing ORBIT; navigation must respect that heading.
  if (tolerance < 1) {
    // Relative mouse input allows finer alignment than a frame-sized keyboard turn.
    await page.locator('.world-canvas').click({ position: { x: 700, y: 450 } });
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    let pointerX = 700;
    for (let i = 0; i < 12; i++) {
      const bearing = Number((await page.getByTestId('heading').textContent())!.replace('°', ''));
      const signed = ((bearing + 180) % 360) - 180;
      if (Math.abs(signed) <= tolerance) { await page.keyboard.press('Escape'); return; }
      pointerX -= signed * Math.PI / 180 / .0022;
      await page.mouse.move(pointerX, 450);
      await page.waitForTimeout(180);
    }
    await page.keyboard.press('Escape');
    throw new Error('Could not align captured mouse look north');
  }
  for (let i = 0; i < 30; i++) {
    const bearing = Number((await page.getByTestId('heading').textContent())!.replace('°', ''));
    const signed = ((bearing + 180) % 360) - 180;
    if (Math.abs(signed) <= tolerance) return;
    await hold(page, signed > 0 ? 'ArrowLeft' : 'ArrowRight', Math.min(350, Math.max(8, Math.abs(signed) * Math.PI / 180 / 1.1 * 1000)));
    await page.waitForTimeout(160);
  }
  throw new Error('Could not orient the player north');
}
async function moveTo(page: Page, x: number, z: number, tolerance = 1.6) {
  await faceNorth(page, tolerance < 1 ? .5 : 1);
  for (const [axis, target, positive, negative] of [['x', x, 'd', 'a'], ['z', z, 'w', 's']] as const) {
    for (let i = 0; i < 45; i++) {
      const value = Number(await page.getByTestId('map-player').getAttribute(`data-${axis}`));
      if (Math.abs(target - value) < tolerance) break;
      await hold(page, target > value ? positive : negative, Math.min(1500, Math.max(180, Math.abs(target - value) / 5 * 1000)));
      await page.waitForTimeout(150);
      if (i === 44) throw new Error(`Could not reach ${axis}=${target}`);
    }
  }
}

test('silent title, three stations and rejected footage cannot earn activity', async ({ page }) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    Object.defineProperty(window, 'AudioContext', { value: class extends NativeAudio {
      constructor(options?: AudioContextOptions) {
        super(options); document.documentElement.dataset.audioContexts = String(Number(document.documentElement.dataset.audioContexts || '0') + 1);
      }
    } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeEnabled();
  await expect(page.locator('html')).not.toHaveAttribute('data-audio-contexts');
  await page.screenshot({ path: 'artifacts/title.png' });
  await park(page);
  await page.screenshot({ path: 'artifacts/robot.png' });
  await page.getByRole('button', { name: /02.*GROUNDWORK.*Push-ups/ }).click();
  await moveTo(page, 0, 70);
  await expect(page.getByRole('button', { name: /Enter push-ups station/ })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Push-ups', exact: true })).toBeVisible();
  const fileInput = page.getByLabel('Choose exercise video');
  await fileInput.setInputFiles({ name: 'not-video.txt', mimeType: 'text/plain', buffer: Buffer.from('not a recording') });
  await expect(page.getByRole('alert')).toContainText('Choose an MP4');

  // No person exists in this synthetic pattern. It must never create a successful workout.
  await fileInput.setInputFiles('tests/fixtures/playback.mp4');
  await expect(page.getByLabel('Push-ups recording preview')).toBeVisible();
  await expect(page.getByText('2.0s', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  await expect(page.getByRole('heading', { name: 'Here’s where the view falls short.' })).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/No activity or energy awarded/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Finish review & return/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Missions/ })).toContainText('0');

  await page.getByRole('button', { name: /Leave station/ }).click();
  await expect(page.getByRole('button', { name: /Missions/ })).toContainText('0');

  // Navigate to both remaining stations; exercise identity follows the actual location.
  await moveTo(page, 0, 48);
  await moveTo(page, -18, 54);
  await expect(page.getByRole('button', { name: /Enter pull-ups station/ })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Pull-ups', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Leave station/ }).click();
  await moveTo(page, 0, 48);
  await moveTo(page, 18, 54);
  await expect(page.getByRole('button', { name: /Enter squats station/ })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Squats', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'artifacts/park.png' });
  // Walk beside the push-up handles when checking the rear boundary.
  await moveTo(page, 5, 80);
  await hold(page, 'w', 2500);
  expect(Number(await page.getByTestId('map-player').getAttribute('data-z'))).toBeLessThanOrEqual(82.5);
  expect(errors).toEqual([]);
});

test('real video evidence, acknowledgement, earned missions and journal media deletion', async ({ page }) => {
  test.skip(!existsSync('artifacts/real-exercise.mp4'), 'Optional public exercise fixture absent. See README and artifacts/real-exercise-provenance.md; model-negative and navigation tests still run.');
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await park(page);
  await page.getByRole('button', { name: /02.*GROUNDWORK.*Push-ups/ }).click();
  await moveTo(page, 0, 70);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Push-ups', exact: true })).toBeVisible();
  const fileInput = page.getByLabel('Choose exercise video');
  // Public-domain Navy demonstration: real full-body push-ups, never mocked pose output.
  await fileInput.setInputFiles('artifacts/real-exercise.mp4');
  await expect(page.getByText('7.0s', { exact: true })).toBeVisible();
  const inferenceStarted = Date.now();
  await page.getByRole('button', { name: /Analyze movement/ }).click();
  await expect(page.getByRole('heading', { name: 'Here’s what I could measure.' })).toBeVisible({ timeout: 120000 });
  console.log(`Real clip inference completed in ${((Date.now() - inferenceStarted) / 1000).toFixed(1)} seconds`);
  await expect(page.locator('.finding-card')).not.toHaveCount(0);
  await page.getByLabel('Movement analysis results').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/analysis-results.png', fullPage: true });
  await expect(page.getByRole('button', { name: /Missions/ })).toContainText('0');
  const finish = page.getByRole('button', { name: /Finish review & return/ });
  await expect(finish).toBeDisabled();
  const evidence = page.getByRole('button', { name: /View evidence at/ }).first();
  await evidence.click();
  await expect(page.getByLabel('Measured pose landmarks for this sampled frame')).toBeVisible();
  await expect(page.getByLabel('Push-ups recording preview')).toBeInViewport();
  await page.screenshot({ path: 'artifacts/analysis-evidence.png', fullPage: true });
  await page.getByLabel('Push-ups recording preview').evaluate((video: HTMLVideoElement) => { video.currentTime += .11; });
  await expect(page.getByLabel('Measured pose landmarks for this sampled frame')).toHaveCount(0);
  await evidence.click();
  await expect(page.getByLabel('Measured pose landmarks for this sampled frame')).toBeVisible();
  await page.getByLabel('I’ve reviewed these observations and their limits.').check();
  await expect(finish).toBeEnabled();
  await expect(page.getByRole('button', { name: /Missions/ })).toContainText('0');
  await finish.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/First mission complete/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Missions/ })).toContainText('5');
  await page.getByRole('button', { name: /Missions/ }).click();
  await expect(page.getByText('THIS WEEK / 1 OF 5 ACTIVITY DAYS')).toBeVisible();
  await expect(page.locator('.mission-stats').getByText('5', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Journal/ }).click();
  await page.locator('.journal-entry > summary').click();
  await expect(page.getByLabel('Journal source recording')).toBeVisible();
  const findings = await page.locator('.journal-finding').count();
  expect(findings).toBeGreaterThan(0);
  await page.getByText('Master Control · manage this entry', { exact: true }).click();
  await page.getByRole('button', { name: 'Remove recording', exact: true }).click();
  await page.getByRole('alert').getByRole('button', { name: 'Remove recording', exact: true }).click();
  await expect(page.getByLabel('Journal source recording')).toHaveCount(0);
  await expect(page.getByText('Source recording removed. Retained observations remain below.')).toBeVisible();
  await expect(page.locator('.journal-finding')).toHaveCount(findings);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Missions/ })).toContainText('5');

  expect(errors).toEqual([]);
});

test('settings persist; returning-user branch never collects pretend credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /02.*Settings/ }).click();
  await page.getByLabel('Music volume').fill('0');
  await page.getByLabel('Mouse sensitivity').fill('1.5');
  await page.getByLabel('Reduced motion').check();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: /02.*Settings/ }).click();
  await expect(page.getByLabel('Music volume')).toHaveValue('0');
  await expect(page.getByLabel('Mouse sensitivity')).toHaveValue('1.5');
  await expect(page.getByLabel('Reduced motion')).toBeChecked();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByRole('button', { name: /Skip opening/ }).click();
  await page.getByRole('button', { name: /Already a user/ }).click();
  await expect(page.getByText('No credentials are collected here.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('exploration discovers the dome, plays the connected arrival and introduces the outpost', async ({ page }) => {
  test.setTimeout(240000);
  await start(page);
  await expect(page.getByRole('heading', { name: /Find what.*out there/ })).toBeVisible();
  await page.getByRole('button', { name: 'Expand survey map' }).click();
  await expect(page.getByRole('button', { name: 'Minimize survey map' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('LANDING', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/expedition.png' });
  await page.getByRole('button', { name: 'Minimize survey map' }).click();
  // Use open ground between solid rocks, rather than the former route through them.
  for (const [x, z] of [[-74, -76], [-74, -16], [-42, -16], [-42, 8]]) await moveTo(page, x, z, .6);
  await expect(page.getByRole('heading', { name: 'A shelter in the distance.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/dome-exterior.png' });
  for (const [x, z] of [[-20, 8], [-20, 12]]) await moveTo(page, x, z, .6);
  await page.keyboard.down('d');
  try { await expect(page.getByText('HABITAT DISCOVERED', { exact: true })).toBeVisible({ timeout: 15000 }); }
  finally { await page.keyboard.up('d'); }
  await expect(page.getByText('HABITAT DISCOVERED', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/third-person.png' });
  await expect(page.getByText('RESTORING HABITAT POWER', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/power-up.png' });
  await expect(page.getByRole('heading', { name: 'What should I call you?' })).toBeVisible({ timeout: 50000 });
  await page.getByLabel('Your callsign').fill('Nova');
  await page.getByRole('button', { name: /Meet your guide/ }).click();
  await tour(page);
  await expect(page.getByText(/Nova, pick something/)).toBeVisible();
});
