import { expect, test } from '@playwright/test';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(60_000);
});

test.describe('Multi-market switcher', () => {
  test('switches the catalog from Germany to the United Kingdom', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('button', {
        name: 'Change market, currently Germany',
      }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Change market, currently Germany' })
      .click();
    await page.getByRole('menuitemradio', { name: 'United Kingdom · GBP' }).click();

    await expect(
      page.getByRole('button', {
        name: 'Change market, currently United Kingdom',
      }),
    ).toBeVisible();
    await expect(page.getByText(/£/).first()).toBeVisible();
  });

  test('parks the cart on market switch and restores it when switching back', async ({
    page,
  }) => {
    await page.goto('/');

    const addToCart = page
      .getByRole('button', { name: 'Add to cart' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();
    await expect(addToCart).toBeEnabled();
    await addToCart.click();
    await expect(page.getByRole('link', { name: /Cart, \d+ item/ })).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole('button', { name: 'Change market, currently Germany' })
      .click();
    await page.getByRole('menuitemradio', { name: 'United Kingdom · GBP' }).click();

    await expect(page.getByRole('heading', { name: 'Switch store?' })).toBeVisible();
    await page.getByRole('button', { name: 'Yes' }).click();

    await expect(
      page.getByRole('button', {
        name: 'Change market, currently United Kingdom',
      }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/cart');
    await expect(
      page.getByRole('heading', { name: 'Your cart is empty' }),
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole('button', {
        name: 'Change market, currently United Kingdom',
      })
      .click();
    await page.getByRole('menuitemradio', { name: 'Germany · EUR' }).click();

    await expect(
      page.getByRole('button', {
        name: 'Change market, currently Germany',
      }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
    await expect(page.getByRole('listitem').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
