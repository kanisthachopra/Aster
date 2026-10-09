import { expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeEnabled();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByRole('button', { name: /Skip opening/ }).click();
  await page.getByRole('button', { name: /New to this world/ }).click();
}
async function tour(page: Page) {
  await expect(page.getByRole('heading', { name: 'Let me show you around.' })).toBeVisible();
  for (let step = 1; step <= 4; step++) {
    await expect(page.getByLabel(`Introduction ${step} of 5`)).toBeVisible();
    await page.getByRole('button', { name: /Got it. Keep going/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Make the place feel like yours.' })).toBeVisible();
  await page.getByRole('button', { name: /Choose my first station/ }).click();
}
export async function park(page: Page) {
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
export async function moveTo(page: Page, x: number, z: number, tolerance = 1.6) {
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
