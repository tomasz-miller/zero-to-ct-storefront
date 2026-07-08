import { expect, test } from '@playwright/test';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(60_000);
});

test.describe('API smoke', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.projectKey).toBeTruthy();
  });

  test('GET /api/products returns product list', async ({ request }) => {
    const response = await request.get('/api/products?limit=3');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeLessThanOrEqual(3);
    expect(typeof body.total).toBe('number');
  });
});
