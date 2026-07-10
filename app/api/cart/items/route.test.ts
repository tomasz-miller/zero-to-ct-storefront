/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockAddLineItem } = vi.hoisted(() => ({
  mockAddLineItem: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  addLineItem: mockAddLineItem,
  CartAccessError: class CartAccessError extends Error {},
  CartNotFoundError: class CartNotFoundError extends Error {},
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/cart/items', {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
      price: { centAmount: 1999, currencyCode: 'EUR' },
      totalPrice: { centAmount: 1999, currencyCode: 'EUR' },
    },
  ],
  itemCount: 1,
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
    expect(body.error).toMatch(/sku/i);
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
});
