import { expect, test } from '@playwright/test';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(90_000);
});

async function registerAndOpenAccount(page: import('@playwright/test').Page) {
  const unique = Date.now();
  const email = `account+${unique}@example.com`;
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

  return { email, password };
}

test.describe('Account flow', () => {
  test('redirects unauthenticated users from account page', async ({ page }) => {
    await page.goto('/account');

    await expect(page).toHaveURL(/\/?(\?login=1)?$/);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('register, view profile, and see empty order history', async ({ page }) => {
    const { email } = await registerAndOpenAccount(page);

    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveValue('Demo');
    await expect(page.getByLabel('Email')).toHaveValue(email);
    await expect(page.getByText('No orders yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse products' })).toBeVisible();
  });

  test('updates profile details', async ({ page }) => {
    await registerAndOpenAccount(page);

    await page.getByLabel('First name').fill('Updated');
    await page.getByLabel('Last name').fill('Customer');
    await page.getByRole('button', { name: 'Save profile' }).click();

    await expect(page.getByText('Profile updated.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel('First name')).toHaveValue('Updated');
    await expect(page.getByText('Updated Customer')).toBeVisible();
  });

  test('manages addresses', async ({ page }) => {
    await registerAndOpenAccount(page);

    await page.getByRole('button', { name: 'Add address' }).click();
    const addressDialog = page.getByRole('dialog');
    await expect(addressDialog.getByRole('heading', { name: 'Add address' })).toBeVisible();

    await addressDialog.getByLabel('Street').fill('Test Street');
    await addressDialog.getByLabel('Number').fill('10');
    await addressDialog.getByLabel('Postal code').fill('10115');
    await addressDialog.getByLabel('City').fill('Berlin');
    await addressDialog.getByLabel('Country').fill('DE');
    await addressDialog.getByLabel('Default shipping address').check();
    await addressDialog.getByRole('button', { name: 'Add address' }).click();

    await expect(page.getByText('Address added.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Test Street 10, 10115 Berlin, DE')).toBeVisible();
    await expect(page.getByText('Default shipping')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Edit address' })).toBeVisible();
    await page.getByRole('dialog').getByLabel('City').fill('Hamburg');
    await page.getByRole('button', { name: 'Save address' }).click();

    await expect(page.getByText('Address updated.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Test Street 10, 10115 Hamburg, DE')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Address removed.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText('Test Street 10, 10115 Hamburg, DE'),
    ).not.toBeVisible();
  });

  test('changes password and requires sign in again', async ({ page }) => {
    const { email, password } = await registerAndOpenAccount(page);
    const newPassword = 'NewPassword123!';

    await page.getByLabel('Current password').fill(password);
    await page.getByLabel('New password').fill(newPassword);
    await page.getByLabel('Confirm new password').fill(newPassword);
    await page.getByRole('button', { name: 'Change password' }).click();

    await expect(
      page.getByText('Password updated. Sign in again with your new password.'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  });

  test('shows order detail when account has orders', async ({ page }) => {
    await registerAndOpenAccount(page);

    const orderLink = page.locator('table a[href^="/account/orders/"]').first();
    const hasOrders = await orderLink.isVisible().catch(() => false);

    test.skip(!hasOrders, 'No orders on test account — detail page covered by unit tests');

    await orderLink.click();

    await expect(page).toHaveURL(/\/account\/orders\//);
    await expect(page.getByRole('heading', { name: /^Order / })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Order again' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to account' })).toBeVisible();
  });

  test('reorders from order detail into the cart when account has orders', async ({
    page,
  }) => {
    await registerAndOpenAccount(page);

    const orderLink = page.locator('table a[href^="/account/orders/"]').first();
    const hasOrders = await orderLink.isVisible().catch(() => false);

    test.skip(!hasOrders, 'No orders on test account — reorder covered by unit tests');

    await orderLink.click();
    await page.getByRole('button', { name: 'Order again' }).click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByRole('heading', { name: /cart/i })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Your cart is empty');
  });
});
