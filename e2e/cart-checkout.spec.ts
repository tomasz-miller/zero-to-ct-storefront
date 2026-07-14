import { expect, test } from '@playwright/test';

import {
  DEMO_CART_DISCOUNT_BOGO_SKU,
  DEMO_CART_DISCOUNT_CODE,
  DEMO_PRODUCT_DISCOUNTED_CENT_AMOUNT,
  DEMO_PRODUCT_DISCOUNT_CURRENCY,
  DEMO_PRODUCT_DISCOUNT_SKU,
  DEMO_PRODUCT_DISCOUNT_SLUG,
  DEMO_PRODUCT_ORIGINAL_CENT_AMOUNT,
} from '../lib/commercetools/demo-promotions';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(90_000);
});

async function getProductSkuWithStock(
  request: import('@playwright/test').APIRequestContext,
): Promise<{ sku: string; name: string }> {
  const response = await request.get('/api/products?limit=12');
  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as {
    products: Array<{ sku?: string; name: string }>;
  };

  const product = body.products.find((item) => item.sku);
  if (!product?.sku) {
    throw new Error('No product with SKU found in catalog');
  }

  return { sku: product.sku, name: product.name };
}

test.describe('Cart and checkout flow', () => {
  test('add to cart from homepage updates cart badge', async ({ page }) => {
    await page.goto('/');

    const addButton = page
      .getByRole('button', { name: 'Add to cart' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await expect(addButton).toBeEnabled();
    await addButton.click();

    await expect(page.getByRole('link', { name: /Cart, \d+ item/ })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('cart page shows line item after add to cart', async ({ page }) => {
    await page.goto('/');

    const addButton = page
      .getByRole('button', { name: 'Add to cart' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await addButton.click();
    await expect(page.getByRole('link', { name: /Cart, \d+ item/ })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/cart');

    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
    await expect(page.getByRole('listitem').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Proceed to checkout' }),
    ).toBeVisible();
  });

  test('checkout page loads order summary and embed container', async ({ page }) => {
    await page.goto('/');

    const addButton = page
      .getByRole('button', { name: 'Add to cart' })
      .filter({ hasNot: page.locator('[disabled]') })
      .first();

    await addButton.click();
    await expect(page.getByRole('link', { name: /Cart, \d+ item/ })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/cart');
    await page.getByRole('link', { name: 'Proceed to checkout' }).click();

    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await expect(page.getByText('Order summary')).toBeVisible();
    await expect(page.locator('[data-ctc]')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/no_payment_integrations|error_loading_all_payment_integrations/i),
    ).not.toBeVisible();
  });
});

test.describe('Cart API', () => {
  test('POST /api/cart/items adds a line item', async ({ request }) => {
    const { sku } = await getProductSkuWithStock(request);

    const response = await request.post('/api/cart/items', {
      data: { sku, quantity: 1 },
    });

    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      cart: { lineItems: Array<{ sku?: string }> };
    };

    expect(body.cart.lineItems.length).toBeGreaterThanOrEqual(1);
    expect(body.cart.lineItems.some((item) => item.sku === sku)).toBe(true);
  });

  test('POST /api/cart/items returns 400 without sku', async ({ request }) => {
    const response = await request.post('/api/cart/items', {
      data: { quantity: 1 },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/sku/i);
  });
});

test.describe('Promotions', () => {
  test('product discount is visible on PDP', async ({ page }) => {
    await page.goto(`/product/${DEMO_PRODUCT_DISCOUNT_SLUG}`);

    await expect(page.getByText('€424.15')).toBeVisible();
    await expect(page.getByText('€499.00')).toBeVisible();
  });

  test('discount code BOGO applies to qualifying cart', async ({ page }) => {
    await page.request.post('/api/cart/items', {
      data: { sku: DEMO_CART_DISCOUNT_BOGO_SKU, quantity: 2 },
    });

    const applyResponse = await page.request.post('/api/cart/discount-code', {
      data: { code: DEMO_CART_DISCOUNT_CODE },
    });
    expect(applyResponse.ok()).toBeTruthy();

    const body = (await applyResponse.json()) as {
      cart: {
        discountCodes: Array<{ code: string; state: string }>;
        total: { centAmount: number };
      };
    };

    expect(
      body.cart.discountCodes.some(
        (entry) =>
          entry.code === DEMO_CART_DISCOUNT_CODE && entry.state === 'MatchesCart',
      ),
    ).toBe(true);
    expect(body.cart.total.centAmount).toBeLessThan(7999 * 2);

    await page.goto('/cart');
    await expect(page.getByRole('listitem').filter({ hasText: DEMO_CART_DISCOUNT_CODE })).toBeVisible();
    await expect(page.getByText('Savings')).toBeVisible();
  });

  test('discounted product price is returned by products API', async ({ page }) => {
    const response = await page.request.get('/api/products?limit=120');
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      products: Array<{
        sku?: string;
        price?: { centAmount: number; originalCentAmount?: number };
      }>;
    };

    const product = body.products.find(
      (item) => item.sku === DEMO_PRODUCT_DISCOUNT_SKU,
    );
    expect(product?.price?.centAmount).toBe(DEMO_PRODUCT_DISCOUNTED_CENT_AMOUNT);
    expect(product?.price?.originalCentAmount).toBe(
      DEMO_PRODUCT_ORIGINAL_CENT_AMOUNT,
    );
    expect(product?.price?.centAmount).toBeLessThan(
      DEMO_PRODUCT_ORIGINAL_CENT_AMOUNT,
    );
    expect(DEMO_PRODUCT_DISCOUNT_CURRENCY).toBe('EUR');
  });
});
