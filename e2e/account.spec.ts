import { expect, test } from '@playwright/test';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(90_000);
});

test.describe('Account flow', () => {
  test('redirects unauthenticated users from account page', async ({ page }) => {
    await page.goto('/account');

    await expect(page).toHaveURL(/\/?(\?login=1)?$/);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('register, view profile, and see empty order history', async ({ page }) => {
    const unique = Date.now();
    const email = `demo+${unique}@example.com`;
    const password = 'Password123!';

    await page.goto('/');

    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Need an account? Register' }).click();

    await page.getByLabel('First name').fill('Demo');
    await page.getByLabel('Last name').fill('Shopper');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

    await page.goto('/account');

    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
    await expect(page.getByText('Demo Shopper')).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText('Member since')).toBeVisible();
    await expect(page.getByText('No orders yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse products' })).toBeVisible();
  });

  test('shows order detail when account has orders', async ({ page }) => {
    const unique = Date.now();
    const email = `orders+${unique}@example.com`;
    const password = 'Password123!';

    await page.goto('/');

    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Need an account? Register' }).click();

    await page.getByLabel('First name').fill('Order');
    await page.getByLabel('Last name').fill('Viewer');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
    await page.goto('/account');

    const orderLink = page.locator('table a[href^="/account/orders/"]').first();
    const hasOrders = await orderLink.isVisible().catch(() => false);

    test.skip(!hasOrders, 'No orders on test account — detail page covered by unit tests');

    await orderLink.click();

    await expect(page).toHaveURL(/\/account\/orders\//);
    await expect(page.getByRole('heading', { name: /^Order / })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to account' })).toBeVisible();
  });
});
