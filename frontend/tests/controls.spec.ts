import { test, expect, type Page } from '@playwright/test';

async function harness(page: Page, policy: 'native' | 'denied' | 'raw-unsupported' | 'late' = 'native') {
  await page.route('**/controls-harness', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0"><canvas width="1000" height="700" style="background:#123"></canvas></body></html>' }));
  await page.goto('/controls-harness');
  await page.evaluate(async (policy) => {
    // Import the real authored controller, in a lightweight browser test document.
    // @ts-expect-error Vite serves this module directly in the test browser.
    const { MouseLook } = await import('/src/game/MouseLook.ts');
    const canvas = document.querySelector('canvas')!;
    const state = document.documentElement.dataset;
    state.dx = '0'; state.dy = '0'; state.mode = 'off'; state.enabled = 'yes'; state.requests = '0';
    if (policy === 'denied') canvas.requestPointerLock = () => Promise.reject(new DOMException('Embedded capture denied', 'NotAllowedError'));
    if (policy === 'raw-unsupported') canvas.requestPointerLock = (options?: PointerLockOptions) => {
      state.requests = String(Number(state.requests) + 1);
      if (options?.unadjustedMovement) return Promise.reject(new DOMException('Raw input unavailable', 'NotSupportedError'));
      Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => canvas });
      document.dispatchEvent(new Event('pointerlockchange'));
      return Promise.resolve();
    };
    if (policy === 'late') {
      canvas.requestPointerLock = () => new Promise<void>(resolve => {
        window.setTimeout(() => {
          Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => canvas });
          document.dispatchEvent(new Event('pointerlockchange')); resolve();
        }, 300);
      });
      document.exitPointerLock = () => {
        state.exited = 'yes';
        Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null });
      };
    }
    const controls = new MouseLook(canvas, () => state.enabled === 'yes', (dx: number, dy: number) => {
      state.dx = String(Number(state.dx) + dx); state.dy = String(Number(state.dy) + dy);
    }, (mode: string) => { state.mode = mode; });
    setInterval(() => controls.update(1 / 60), 16);
  }, policy);
}

test('FPS capture turns immediately using relative input without reaching a screen edge', async ({ page }) => {
  await harness(page);
  await page.mouse.click(450, 350);
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'locked');
  await page.mouse.move(480, 370, { steps: 3 });
  await expect.poll(() => page.locator('html').getAttribute('data-dx')).not.toBe('0');
  await expect.poll(() => page.locator('html').getAttribute('data-dy')).not.toBe('0');
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'off');
  await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBe(null);
});

test('embedded fallback is deliberate drag only, never edge panning; overlays stop it', async ({ page }) => {
  await harness(page, 'denied');
  await page.mouse.move(450, 350); await page.mouse.down();
  await page.mouse.move(480, 350, { steps: 3 });
  await expect(page.locator('html')).toHaveAttribute('data-dx', '30');
  await page.mouse.up();
  await page.mouse.move(999, 350); await page.waitForTimeout(350);
  await expect(page.locator('html')).toHaveAttribute('data-dx', '30');
  await page.mouse.move(450, 350); await page.mouse.down();
  await page.evaluate(() => { document.documentElement.dataset.enabled = 'no'; });
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'off');
  await page.mouse.move(490, 350); await page.mouse.up();
  await expect(page.locator('html')).toHaveAttribute('data-dx', '30');
});

test('unsupported raw input retries normal pointer capture', async ({ page }) => {
  await harness(page, 'raw-unsupported');
  await page.mouse.click(450, 350);
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'locked');
  await expect(page.locator('html')).toHaveAttribute('data-requests', '2');
});

test('late pointer-lock success cannot recapture the mouse after Escape', async ({ page }) => {
  await harness(page, 'late');
  await page.mouse.click(450, 350);
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-exited', 'yes');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'off');
  await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBe(null);
});
