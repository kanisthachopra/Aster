import { test, expect, type Page } from '@playwright/test';

const profile = { id: 'test-only', authorizedId: 'visitor_test', callsign: 'Mira', timezone: 'Asia/Singapore', onboardingComplete: true, recoveryEmail: null as string | null, emailVerified: false };
const command = 'aaaa1111aaaa-bbbb2222bbbb-cccc3333cccc';
type Request = { action: string; body: Record<string, unknown> };
test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => console.error('Account harness error:', error.message));
  page.on('requestfailed', request => console.error('Account harness request failed:', request.url(), request.failure()?.errorText));
});
async function mock(page: Page, loginError = false) {
  const requests: Request[] = [];
  let failLogin = loginError;
  await page.route('**/api/outpost?*', async route => {
    const action = new URL(route.request().url()).searchParams.get('action')!;
    requests.push({ action, body: route.request().postDataJSON() });
    if (action === 'login' && failLogin) { failLogin = false; await route.fulfill({ status: 401, json: { message: 'That ID and password do not match. Try again.' } }); return; }
    const json = ['register', 'recover-command', 'recover-email/verify'].includes(action) ? { profile, recoveryCommand: command }
      : action === 'recovery-rotate' ? { recoveryCommand: command }
        : action === 'email/verify' ? { profile: { ...profile, recoveryEmail: 'test@example.com', emailVerified: true } }
          : action.endsWith('/send') ? { message: 'If the account is eligible, a code is on its way.' } : { profile };
    await route.fulfill({ json });
  });
  return requests;
}
async function passwords(page: Page, first = 'Authorization password') {
  await page.getByLabel(first, { exact: true }).fill('test-only-password-123');
  await page.getByLabel('Confirm your password', { exact: true }).fill('test-only-password-123');
}
async function events(page: Page) { return page.evaluate(() => (window as unknown as { accountEvents: { event: string }[] }).accountEvents); }

test('registration protects the recovery kit and authenticates once without closing the next screen', async ({ page }) => {
  const requests = await mock(page);
  await page.goto('/tests/harnesses/account.html');
  await page.getByLabel('Authorized ID', { exact: true }).fill('visitor_test');
  await page.getByLabel('Callsign', { exact: true }).fill('Mira');
  await passwords(page);
  await page.getByRole('button', { name: 'Create my outpost ID' }).click();
  await expect(page.getByText('aaaa1111aaaa', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/account-kit.png' });
  await expect(page.getByRole('button', { name: 'My kit is safe. Continue' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toContainText('Save your recovery command');
  await expect(page.getByRole('alert')).toBeFocused();
  expect(await events(page)).toEqual([]);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'My kit is safe. Continue' }).click();
  expect(await events(page)).toEqual([{ event: 'authenticated', id: 'visitor_test' }]);
  expect(requests[0].action).toBe('register');
  expect(requests[0].body.timezone).toBeTruthy();
});

test('failed login is announced and can be corrected without losing the ID', async ({ page }) => {
  const requests = await mock(page, true);
  await page.goto('/tests/harnesses/account.html?mode=login');
  await page.screenshot({path:'artifacts/account-login-refined.png'});
  await page.getByLabel('Authorized ID', { exact: true }).fill('visitor_test');
  await page.getByLabel('Authorization password', { exact: true }).fill('wrong-test-password');
  await page.getByRole('button', { name: 'Sign in to the outpost' }).click();
  await expect(page.getByRole('alert')).toContainText('do not match');
  await expect(page.getByLabel('Authorized ID', { exact: true })).toHaveValue('visitor_test');
  await page.getByLabel('Authorization password', { exact: true }).fill('correct-test-password');
  await page.getByRole('button', { name: 'Sign in to the outpost' }).click();
  await expect.poll(() => events(page)).toEqual([{ event: 'authenticated', id: 'visitor_test' }]);
  expect(requests.map(row => row.action)).toEqual(['login', 'login']);
});

test('sign-in remains readable and the submit action stays visible on a smaller laptop',async({page})=>{
  await mock(page);
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/tests/harnesses/account.html?mode=login');
  await expect(page.getByRole('button',{name:'Sign in to the outpost'})).toBeInViewport();
  await expect(page.getByLabel('Authorization password',{exact:true})).toBeInViewport();
  await page.screenshot({path:'artifacts/account-login-laptop.png'});
});

test('command recovery accepts a complete uppercase paste and requires a new saved kit', async ({ page }) => {
  const requests = await mock(page);
  await page.goto('/tests/harnesses/account.html?mode=login');
  await page.getByRole('button', { name: 'Lost your access? Recover your account' }).click();
  await page.getByLabel('Authorized ID', { exact: true }).fill('visitor_test');
  await page.getByLabel('Part 1', { exact: true }).evaluate((input, value) => { const data = new DataTransfer(); data.setData('text', value); input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); }, command.toUpperCase());
  await expect(page.getByLabel('Part 3', { exact: true })).toHaveValue('CCCC3333CCCC');
  await passwords(page, 'New authorization password');
  await page.getByRole('button', { name: 'Restore my journey' }).click();
  await expect(page.getByText('aaaa1111aaaa', { exact: true })).toBeVisible();
  expect(requests[0]).toMatchObject({ action: 'recover-command', body: { command: command.toUpperCase() } });
  expect(await events(page)).toEqual([]);
});

test('email availability is explicit and cannot strand a recovery flow', async ({ page }) => {
  await mock(page);
  await page.goto('/tests/harnesses/account.html?email=off');
  await page.getByText('Add a citizen contact', { exact: false }).click();
  await expect(page.getByText('Email delivery isn’t connected yet.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Recovery email', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign in instead' }).click();
  await page.getByRole('button', { name: 'Lost your access? Recover your account' }).click();
  await expect(page.getByRole('button', { name: 'Use my verified email instead' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign in to the outpost' })).toBeVisible();
});

test('verified email restores access and produces a fresh recovery kit', async ({ page }) => {
  const requests = await mock(page);
  await page.goto('/tests/harnesses/account.html?mode=login');
  await page.getByRole('button', { name: 'Lost your access? Recover your account' }).click();
  await page.getByRole('button', { name: 'Use my verified email instead' }).click();
  await page.getByLabel('Authorized ID', { exact: true }).fill('visitor_test');
  await page.getByRole('button', { name: 'Send my recovery code' }).click();
  await page.getByLabel('Code from your email').fill('123456');
  await passwords(page, 'New authorization password');
  await page.getByRole('button', { name: 'Restore my journey' }).click();
  await expect(page.getByText('aaaa1111aaaa', { exact: true })).toBeVisible();
  expect(requests.map(row => row.action)).toEqual(['recover-email/send', 'recover-email/verify']);
});

test('account management verifies email and rotates the private command without leaving the panel', async ({ page }) => {
  const requests = await mock(page);
  await page.goto('/tests/harnesses/account.html?mode=manage');
  await page.getByLabel('Recovery email', { exact: true }).fill('test@example.com');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await page.getByLabel('Code from your email').fill('123456');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.getByText('✓ Verified: test@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Replace my recovery command' }).click();
  await page.getByLabel('Current password', { exact: true }).fill('test-only-password-123');
  await page.getByRole('button', { name: 'Create a new command' }).click();
  await expect(page.getByText('aaaa1111aaaa', { exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Done. Back to my account' }).click();
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/account-manage.png' });
  expect((await events(page)).map(row => row.event)).toEqual(['authenticated']);
  expect(requests.map(row => row.action)).toEqual(['email/send', 'email/verify', 'recovery-rotate']);
});
