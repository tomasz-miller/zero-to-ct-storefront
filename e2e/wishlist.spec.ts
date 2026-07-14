import { expect, test } from '@playwright/test';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(90_000);
});

async function getProductSku(
  request: import('@playwright/test').APIRequestContext,
): Promise<string> {
  const response = await request.get('/api/products?limit=12');
  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as {
    products: Array<{ sku?: string }>;
  };

  const product = body.products.find((item) => item.sku);
  if (!product?.sku) {
    throw new Error('No product with SKU found in catalog');
  }

  return product.sku;
}

test.describe('Wishlist flow', () => {
  test('guest can save item and view wishlist page', async ({ page, request }) => {
    await getProductSku(request);

    await page.goto('/');

    const saveButton = page
      .getByRole('button', { name: 'Save to wishlist' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(
      page.getByRole('link', { name: /Wishlist, \d+ item/ }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/wishlist');

    await expect(page.getByRole('heading', { name: 'Your wishlist' })).toBeVisible();
    await expect(page.getByRole('listitem').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move to cart' }).first()).toBeVisible();
  });

  test('guest can remove wishlist item', async ({ page, request }) => {
    await getProductSku(request);

    await page.goto('/');

    const saveButton = page
      .getByRole('button', { name: 'Save to wishlist' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await saveButton.click();
    await expect(
      page.getByRole('link', { name: /Wishlist, \d+ item/ }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/wishlist');
    await page.getByRole('button', { name: 'Remove' }).first().click();

    await expect(page.getByText('Your wishlist is empty')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('move to cart updates cart badge', async ({ page }) => {
    await page.goto('/');

    const saveButton = page
      .getByRole('button', { name: 'Save to wishlist' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await saveButton.click();
    await expect(
      page.getByRole('link', { name: /Wishlist, \d+ item/ }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/wishlist');
    await page.getByRole('button', { name: 'Move to cart' }).first().click();

    await expect(page.getByRole('link', { name: /Cart, \d+ item/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Your wishlist is empty')).toBeVisible({
      timeout: 15_000,
    });
  });
});
