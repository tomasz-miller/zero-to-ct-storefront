import { expect, test } from '@playwright/test';

import {
  DEMO_IN_STOCK_SKU,
  DEMO_IN_STOCK_SLUG,
  DEMO_OUT_OF_STOCK_SKU,
} from '../lib/commercetools/demo-inventory';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(60_000);
});

type CatalogProduct = {
  sku?: string;
  slug: string;
  name: string;
  availability?: {
    isOnStock: boolean;
    availableQuantity?: number;
    status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  };
};

async function listCatalogProducts(
  request: import('@playwright/test').APIRequestContext,
): Promise<CatalogProduct[]> {
  const response = await request.get('/api/products?limit=120');
  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as { products: CatalogProduct[] };
  return body.products;
}

async function findInStockProduct(
  request: import('@playwright/test').APIRequestContext,
): Promise<CatalogProduct | undefined> {
  const products = await listCatalogProducts(request);
  return products.find(
    (product) => product.sku && product.availability?.status === 'in_stock',
  );
}

async function findOutOfStockProduct(
  request: import('@playwright/test').APIRequestContext,
): Promise<CatalogProduct | undefined> {
  const products = await listCatalogProducts(request);
  return products.find(
    (product) => product.sku && product.availability?.status === 'out_of_stock',
  );
}

async function findLowStockProduct(
  request: import('@playwright/test').APIRequestContext,
): Promise<CatalogProduct | undefined> {
  const products = await listCatalogProducts(request);
  return products.find(
    (product) => product.sku && product.availability?.status === 'low_stock',
  );
}

test.describe('Inventory availability', () => {
  test('products API includes availability on each product', async ({ request }) => {
    const products = await listCatalogProducts(request);
    expect(products.length).toBeGreaterThan(0);

    for (const product of products.slice(0, 5)) {
      expect(product.availability).toBeDefined();
      expect(typeof product.availability?.isOnStock).toBe('boolean');
      expect(product.availability?.status).toMatch(
        /^(in_stock|low_stock|out_of_stock)$/,
      );
    }
  });

  test('low-stock PDP shows Only X left badge when catalog has low stock', async ({
    page,
    request,
  }) => {
    const product = await findLowStockProduct(request);

    test.skip(!product?.sku, 'No low-stock product in catalog');

    await page.goto(`/product/${product!.slug}`);

    const quantity = product!.availability?.availableQuantity;
    const expected =
      typeof quantity === 'number' ? `Only ${quantity} left` : 'Low stock';

    await expect(page.getByText(expected).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
  });

  test('in-stock PDP shows availability badge and enabled add to cart', async ({
    page,
    request,
  }) => {
    const product = (await findInStockProduct(request)) ?? {
      slug: DEMO_IN_STOCK_SLUG,
      sku: DEMO_IN_STOCK_SKU,
      name: 'Charlie Armchair',
    };

    await page.goto(`/product/${product.slug}`);

    await expect(page.getByText('In stock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
  });

  test('out-of-stock PDP disables add to cart', async ({ page, request }) => {
    const product = await findOutOfStockProduct(request);

    test.skip(
      !product?.sku,
      `No out-of-stock product found; tried fixture SKU ${DEMO_OUT_OF_STOCK_SKU}`,
    );

    await page.goto(`/product/${product!.slug}`);

    await expect(page.getByText('Out of stock').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Out of stock' }),
    ).toBeDisabled();
  });

  test('POST /api/cart/items returns 409 for out-of-stock SKU', async ({
    request,
  }) => {
    const product = await findOutOfStockProduct(request);

    test.skip(
      !product?.sku,
      `No out-of-stock product found; tried fixture SKU ${DEMO_OUT_OF_STOCK_SKU}`,
    );

    const response = await request.post('/api/cart/items', {
      data: { sku: product!.sku, quantity: 1 },
    });

    expect(response.status()).toBe(409);

    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/out of stock/i);
  });

  test('out-of-stock PLP card shows badge when catalog includes OOS product', async ({
    page,
    request,
  }) => {
    const product = await findOutOfStockProduct(request);

    test.skip(!product?.sku, 'No out-of-stock product in catalog');

    await page.goto(`/search?q=${encodeURIComponent(product!.name)}`);

    const card = page
      .locator('article')
      .filter({ has: page.getByRole('link', { name: new RegExp(product!.name, 'i') }) });

    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText('Out of stock')).toBeVisible();
    await expect(
      card.getByRole('button', { name: 'Out of stock' }),
    ).toBeDisabled();
  });
});

test.describe('Mobile cart drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens cart drawer from header and shows line items', async ({ page }) => {
    await page.goto('/');

    const addButton = page
      .getByRole('button', { name: 'Add to cart' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await addButton.click();

    await page.getByRole('button', { name: /Cart/i }).click();

    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
    await expect(page.getByRole('listitem').first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('link', { name: 'Proceed to checkout' }),
    ).toBeVisible();
  });
});
