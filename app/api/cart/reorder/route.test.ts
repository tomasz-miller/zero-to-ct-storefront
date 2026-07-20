/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockReorderOrder } = vi.hoisted(() => ({
  mockReorderOrder: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  CartAccessError: class CartAccessError extends Error {},
  CartNotFoundError: class CartNotFoundError extends Error {},
  OutOfStockError: class OutOfStockError extends Error {
    constructor(message = 'This product is out of stock') {
      super(message);
      this.name = 'OutOfStockError';
    }
  },
}));

vi.mock('@/lib/commercetools/cart-reorder', () => ({
  reorderOrder: mockReorderOrder,
  NothingToReorderError: class NothingToReorderError extends Error {
    constructor(message = 'No available items from this order could be added to the cart') {
      super(message);
      this.name = 'NothingToReorderError';
    }
  },
  ReorderUnauthorizedError: class ReorderUnauthorizedError extends Error {
    constructor(message = 'Sign in required to reorder') {
      super(message);
      this.name = 'ReorderUnauthorizedError';
    }
  },
}));

vi.mock('@/lib/commercetools/customer-api', () => ({
  CustomerOrderNotFoundError: class CustomerOrderNotFoundError extends Error {
    constructor() {
      super('Order not found');
      this.name = 'CustomerOrderNotFoundError';
    }
  },
}));

import { OutOfStockError } from '@/lib/commercetools/cart';
import {
  NothingToReorderError,
  ReorderUnauthorizedError,
} from '@/lib/commercetools/cart-reorder';
import { CustomerOrderNotFoundError } from '@/lib/commercetools/customer-api';

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/cart/reorder', {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
    expect(body.error).toMatch(/orderId/i);
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
