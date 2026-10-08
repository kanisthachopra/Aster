import { test, expect } from '@playwright/test';
import { CollisionWorld } from '../src/game/Collision';

test('solid obstacles stop large moves, slide tangentially and respect body height', () => {
  const rocks = new CollisionWorld();
  rocks.add({ id: 'boulder', kind: 'circle', x: 0, z: 0, radius: 2, bottom: 0, top: 4 });
  expect(rocks.move({ x: 0, z: -5 }, { x: 0, z: 5 }, 0).z).toBeLessThan(-2.3);
  const slide = rocks.move({ x: 1, z: -4 }, { x: 4, z: 2 }, 0);
  expect(Math.hypot(slide.x, slide.z)).toBeGreaterThanOrEqual(2.34);
  expect(slide.x).toBeGreaterThan(2);
  // The maximum ordinary jump cannot phase through a tall rock.
  expect(rocks.move({ x: 0, z: -5 }, { x: 0, z: 5 }, 1.04).z).toBeLessThan(-2.3);

  const rail = new CollisionWorld();
  rail.add({ id: 'low-rail', kind: 'box', x: 0, z: 0, halfX: 2, halfZ: .08, bottom: 0, top: 1 });
  expect(rail.move({ x: 0, z: -3 }, { x: 0, z: 3 }, 0).z).toBeLessThan(-.4);
  expect(rail.move({ x: 0, z: -3 }, { x: 0, z: 3 }, 1.2).z).toBeGreaterThan(2.9);
  expect(rail.move({ x: -3, z: 1 }, { x: 3, z: 1 }, 0).x).toBeGreaterThan(2.9);
});

test('solid rotated fixtures use their orientation and recover initial overlap', () => {
  const world = new CollisionWorld();
  world.add({ id: 'turned-console', kind: 'box', x: 0, z: 0, halfX: 2, halfZ: .2, yaw: Math.PI / 2, bottom: 0, top: 2 });
  expect(world.move({ x: -3, z: 0 }, { x: 3, z: 0 }, 0).x).toBeLessThan(-.5);
  expect(world.move({ x: -3, z: 3 }, { x: 3, z: 3 }, 0).x).toBeGreaterThan(2.9);
  const recovered = world.move({ x: 0, z: 0 }, { x: .01, z: 0 }, 0);
  expect(Math.abs(recovered.x)).toBeGreaterThanOrEqual(.53);
});

test('world recreation console blocks walking and E opens its playable interface', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Begin expedition/ }).click({ timeout: 60000 });
  await page.getByRole('button', { name: /Skip opening/ }).click();
  await page.getByRole('button', { name: /New to this world/ }).click();
  await page.getByRole('button', { name: /Preview dome arrival/ }).click();
  await page.getByRole('button', { name: /Continue as traveller/ }).click({ timeout: 60000 });
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /Got it. Keep going/ }).click();
  await page.getByRole('button', { name: /Choose my first station/ }).click();
  await page.getByRole('button', { name: /02.*GROUNDWORK.*Push-ups/ }).click();
  // Set the approach point, then exercise the actual keyboard controller, collision and event path.
  await page.evaluate(async () => {
    const engineURL = performance.getEntriesByType('resource').find(entry => entry.name.includes('@babylonjs_core_Engines_engine.js'))?.name;
    if (!engineURL) throw new Error('World engine module was not loaded');
    const { Engine } = await import(/* @vite-ignore */ engineURL);
    const camera = Engine.Instances[0].scenes[0].activeCamera;
    camera.position.set(24, 1.85, 35); camera.rotation.set(0, 0, 0);
  });
  await page.keyboard.down('w'); await page.waitForTimeout(2300); await page.keyboard.up('w');
  const stoppedAt = Number(await page.getByTestId('map-player').getAttribute('data-z'));
  expect(stoppedAt).toBeGreaterThan(37.8);
  expect(stoppedAt).toBeLessThanOrEqual(38.1);
  await expect(page.getByRole('button', { name: /Play Signal lab/ })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Recreation deck.' })).toBeVisible();
  expect(errors).toEqual([]);
});
