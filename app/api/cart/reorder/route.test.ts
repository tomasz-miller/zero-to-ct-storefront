/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockReorderOrder } = vi.hoisted(() => ({
  mockReorderOrder: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart-reorder', () => ({
  reorderOrder: mockReorderOrder,
}));

import {
  CustomerOrderNotFoundError,
  NothingToReorderError,
  OutOfStockError,
  ReorderUnauthorizedError,
} from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

import { POST } from './route';

function createRequest(body: unknown) {
  return jsonRequest('http://localhost/api/cart/reorder', body);
}

const sampleCart = {
  id: 'cart-1',
  version: 2,
  currency: 'EUR',
  lineItems: [],
  itemCount: 3,
  discountCodes: [],
  subtotal: { centAmount: 3000, currencyCode: 'EUR' },
  total: { centAmount: 3000, currencyCode: 'EUR' },
};

describe('POST /api/cart/reorder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockReorderOrder.mockReset();
  });

  it('returns 400 when orderId is missing', async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.field).toBe('orderId');
  });

  it('rejects a path-traversal order id with 400', async () => {
    expect(
      (await POST(jsonRequest('http://localhost/api/cart/reorder', { orderId: '..' }))).status,
    ).toBe(400);
    expect(mockReorderOrder).not.toHaveBeenCalled();
  });

  it('returns 401 when the customer is not signed in', async () => {
    mockReorderOrder.mockRejectedValue(new ReorderUnauthorizedError());

    const response = await POST(createRequest({ orderId: 'order-1' }));

    expect(response.status).toBe(401);
  });

  it('returns 404 when the order is missing', async () => {
    mockReorderOrder.mockRejectedValue(new CustomerOrderNotFoundError());

    const response = await POST(createRequest({ orderId: 'missing' }));

    expect(response.status).toBe(404);
  });

  it('returns 409 when nothing can be reordered', async () => {
    mockReorderOrder.mockRejectedValue(new NothingToReorderError());

    const response = await POST(createRequest({ orderId: 'order-1' }));

    expect(response.status).toBe(409);
  });

  it('returns 409 when a line item becomes out of stock', async () => {
    mockReorderOrder.mockRejectedValue(new OutOfStockError());

    const response = await POST(createRequest({ orderId: 'order-1' }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/out of stock/i);
  });

  it('returns cart and counts on success', async () => {
    mockReorderOrder.mockResolvedValue({
      cart: sampleCart,
      added: 2,
      skipped: 1,
    });

    const response = await POST(createRequest({ orderId: 'order-1' }));

    expect(response.status).toBe(200);
    expect(mockReorderOrder).toHaveBeenCalledWith('order-1');

    const body = await response.json();
    expect(body.cart.id).toBe('cart-1');
    expect(body.added).toBe(2);
    expect(body.skipped).toBe(1);
  });
});
