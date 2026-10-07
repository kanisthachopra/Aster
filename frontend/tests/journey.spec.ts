import { test, expect, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeEnabled();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByRole('button', { name: /Skip opening/ }).click();
  await page.getByRole('button', { name: /New to this world/ }).click();
}
async function park(page: Page) {
  await start(page);
  await page.getByRole('button', { name: /Preview dome arrival/ }).click();
  await expect(page.getByRole('heading', { name: 'What should I call you?' })).toBeVisible({ timeout: 35000 });
  await page.getByRole('button', { name: /Continue as traveller/ }).click();
}
async function moveTo(page: Page, x: number, z: number) {
  // Navigate the real world via keys, observing the same survey coordinates the map renders.
  for (const [axis, target, positive, negative] of [['x', x, 'd', 'a'], ['z', z, 'w', 's']] as const) {
    for (let i = 0; i < 45; i++) {
      const value = Number(await page.getByTestId('map-player').getAttribute(`data-${axis}`));
      if (Math.abs(target - value) < 1.6) break;
      await hold(page, target > value ? positive : negative, Math.min(1500, Math.max(300, Math.abs(target - value) / 5 * 1000)));
      await page.waitForTimeout(150);
      if (i === 44) throw new Error(`Could not reach ${axis}=${target}`);
    }
  }
}
async function hold(page: Page, key: string, milliseconds: number) {
  await page.keyboard.down(key); await page.waitForTimeout(milliseconds); await page.keyboard.up(key);
}

test('silent title, real movement, three capture choices and clean local file handling', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
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
  await page.screenshot({ path: 'artifacts/review.png' });
  const fileInput = page.getByLabel('Choose exercise video');
  await fileInput.setInputFiles({ name: 'not-video.txt', mimeType: 'text/plain', buffer: Buffer.from('not a recording') });
  await expect(page.getByRole('alert')).toContainText('Choose an MP4');

  // Synthetic fixture is only for browser playback; never submitted as exercise evidence.
  await fileInput.setInputFiles('tests/fixtures/playback.mp4');
  await expect(page.getByLabel('Push-ups recording preview')).toBeVisible();
  await page.locator('video').evaluate((video: HTMLVideoElement) => video.play());
  await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(.1);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('2.0s', { exact: true })).toBeVisible();
  await expect(page.getByText('Local preview only')).toBeVisible();
  await expect(page.getByRole('button', { name: /Leave station/ })).toBeEnabled();
  await page.getByRole('button', { name: /Leave station/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Your station will be here', { exact: false })).toBeVisible();

  // Move between actual world positions to prove station identity isn't just menu text.
  await moveTo(page, -18, 58);
  await expect(page.getByRole('button', { name: /Enter pull-ups station/ })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Pull-ups', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await moveTo(page, 18, 58);
  await expect(page.getByRole('button', { name: /Enter squats station/ })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Squats', exact: true })).toBeVisible();
  await expect(page.getByText('No completion recorded in this preview.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'artifacts/park.png' });
  await moveTo(page, 0, 80);
  await hold(page, 'w', 2500);
  expect(Number(await page.getByTestId('map-player').getAttribute('data-z'))).toBeLessThanOrEqual(82.5);
  expect(errors).toEqual([]);
});

test('settings persist; returning-user branch never collects pretend credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /02.*Settings/ }).click();
  await page.getByLabel('Music volume').fill('0');
  await page.getByLabel('Reduced motion').check();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: /02.*Settings/ }).click();
  await expect(page.getByLabel('Music volume')).toHaveValue('0');
  await expect(page.getByLabel('Reduced motion')).toBeChecked();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByRole('button', { name: /Skip opening/ }).click();
  await page.getByRole('button', { name: /Already a user/ }).click();
  await expect(page.getByText('No credentials are collected here.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('exploration discovers the dome and reaches it without a bypass', async ({ page }) => {
  test.setTimeout(150000);
  await start(page);
  await expect(page.getByRole('heading', { name: /Find what.*out there/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/expedition.png' });
  await moveTo(page, 0, -20);
  await expect(page.getByRole('heading', { name: 'A shelter in the distance.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/dome-exterior.png' });
  await hold(page, 'w', 5200);
  await expect(page.getByText('HABITAT DISCOVERED', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/third-person.png' });
  await expect(page.getByText('RESTORING HABITAT POWER', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/power-up.png' });
  await expect(page.getByRole('heading', { name: 'What should I call you?' })).toBeVisible({ timeout: 35000 });
  await page.getByLabel('Your callsign').fill('Nova');
  await page.getByRole('button', { name: /Meet your guide/ }).click();
  await expect(page.getByText(/Nova, a whole moon/)).toBeVisible();
});

test('mouse look survives denied pointer capture, works without dragging and releases for UI', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = () => Promise.reject(new DOMException('Embedded browser denied capture', 'NotAllowedError'));
  });
  await start(page);
  const heading = page.getByTestId('heading');
  const original = await heading.textContent();
  await page.locator('canvas').click({ position: { x: 700, y: 450 } });
  await expect(page.getByText(/MOUSE.*Screen edges turn/)).toBeVisible();
  await page.mouse.move(850, 450, { steps: 10 });
  await expect(heading).not.toHaveText(original!);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const released = await heading.textContent();
  await page.mouse.move(700, 450);
  await expect(heading).toHaveText(released!);
  await page.locator('canvas').click({ position: { x: 700, y: 450 } });
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.mouse.move(400, 500);
  await page.keyboard.press('Escape');
  await expect(page.getByText('CLICK WORLD / Start mouse look')).toBeVisible();
});

test('normal browser mouse look rotates the world and Escape releases it', async ({ page }) => {
  await start(page);
  const heading = page.getByTestId('heading');
  const before = await heading.textContent();
  await page.locator('canvas').click({ position: { x: 700, y: 450 } });
  await expect(page.getByText(/MOUSE \/ Look/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe('CANVAS');
  await page.mouse.move(820, 470, { steps: 6 });
  await expect(heading).not.toHaveText(before!);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
});
