/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockAddLineItem } = vi.hoisted(() => ({
  mockAddLineItem: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  addLineItem: mockAddLineItem,
}));

import { OutOfStockError } from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

import { POST } from './route';

const URL_ITEMS = 'http://localhost/api/cart/items';

function createRequest(body: unknown) {
  return jsonRequest(URL_ITEMS, body);
}

const sampleCart = {
  id: 'cart-1',
  version: 1,
  currency: 'EUR',
  lineItems: [
    {
      id: 'line-1',
      productId: 'prod-1',
      name: 'Sample product',
      sku: 'SKU-001',
      quantity: 1,
      unitPrice: { centAmount: 1999, currencyCode: 'EUR' },
      price: { centAmount: 1999, currencyCode: 'EUR' },
      totalPrice: { centAmount: 1999, currencyCode: 'EUR' },
    },
  ],
  itemCount: 1,
  discountCodes: [],
  subtotal: { centAmount: 1999, currencyCode: 'EUR' },
  total: { centAmount: 1999, currencyCode: 'EUR' },
};

describe('POST /api/cart/items', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockAddLineItem.mockReset();
  });

  it('returns 400 when sku is missing', async () => {
    const response = await POST(createRequest({ quantity: 1 }));

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.field).toBe('sku');
  });

  it('returns 400 for invalid quantity', async () => {
    const response = await POST(createRequest({ sku: 'SKU-001', quantity: 0 }));

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/quantity/i);
  });

  it('returns cart on successful add', async () => {
    mockAddLineItem.mockResolvedValue(sampleCart);

    const response = await POST(createRequest({ sku: 'SKU-001', quantity: 1 }));

    expect(response.status).toBe(200);
    expect(mockAddLineItem).toHaveBeenCalledWith('SKU-001', 1);

    const body = await response.json();
    expect(body.cart.id).toBe('cart-1');
    expect(body.cart.lineItems).toHaveLength(1);
  });

  it('returns 409 when product is out of stock', async () => {
    mockAddLineItem.mockRejectedValue(new OutOfStockError());

    const response = await POST(createRequest({ sku: 'SKU-OOS', quantity: 1 }));

    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toMatch(/out of stock/i);
  });

  it.each([
    [{ sku: 'A', quantity: 1.5 }],
    [{ sku: 'A', quantity: 100 }],
    [{ sku: 1 }],
    [null],
  ])('returns 400 for %j', async (body) => {
    expect((await POST(jsonRequest(URL_ITEMS, body))).status).toBe(400);
    expect(mockAddLineItem).not.toHaveBeenCalled();
  });

  it('returns 415 without a JSON content type', async () => {
    expect(
      (
        await POST(
          jsonRequest(URL_ITEMS, { sku: 'A' }, { headers: { 'content-type': 'text/plain' } }),
        )
      ).status,
    ).toBe(415);
  });

  it('maps OutOfStockError to 409 with its message', async () => {
    mockAddLineItem.mockRejectedValue(new OutOfStockError());
    const res = await POST(jsonRequest(URL_ITEMS, { sku: 'A' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'This product is out of stock',
      code: 'OutOfStock',
    });
  });

  it('returns a generic 500 without the error message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAddLineItem.mockRejectedValue(new Error('ct detail'));
    const res = await POST(jsonRequest(URL_ITEMS, { sku: 'A' }));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(body)).not.toContain('ct detail');
  });
});
