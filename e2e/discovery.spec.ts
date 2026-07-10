import { expect, test } from '@playwright/test';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(60_000);
});

test.describe('Discovery flow', () => {
  test('homepage shows best sellers with product links', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Best Sellers' })).toBeVisible();
    const productLinks = page.locator('a[href^="/product/"]');
    await expect(productLinks.first()).toBeVisible();
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test('search returns results for "bed"', async ({ page }) => {
    await page.goto('/search');

    await page.getByLabel('Search products').fill('bed');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(/\/search\?q=bed/);
    await expect(page.getByText(/result/i)).toBeVisible();
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  });

  test('product detail page shows title and add to cart', async ({ page }) => {
    await page.goto('/product/orion-double-bed');

    await expect(page.getByRole('img', { name: /orion double bed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
  });
});
