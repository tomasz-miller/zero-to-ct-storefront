/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUpdateLineItemQuantity, mockRemoveLineItem } = vi.hoisted(() => ({
  mockUpdateLineItemQuantity: vi.fn(),
  mockRemoveLineItem: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  updateLineItemQuantity: mockUpdateLineItemQuantity,
  removeLineItem: mockRemoveLineItem,
  CartAccessError: class CartAccessError extends Error {},
  CartNotFoundError: class CartNotFoundError extends Error {},
}));

import { DELETE, PATCH } from './route';

function createPatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/cart/items/line-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ lineItemId: 'line-1' }) };

describe('PATCH /api/cart/items/[lineItemId]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockUpdateLineItemQuantity.mockReset();
    mockRemoveLineItem.mockReset();
  });

  it('returns 400 for invalid quantity', async () => {
    const response = await PATCH(createPatchRequest({ quantity: 0 }), context);

    expect(response.status).toBe(400);
  });

  it('returns updated cart on success', async () => {
    mockUpdateLineItemQuantity.mockResolvedValue({ id: 'cart-1' });

    const response = await PATCH(createPatchRequest({ quantity: 3 }), context);

    expect(response.status).toBe(200);
    expect(mockUpdateLineItemQuantity).toHaveBeenCalledWith('line-1', 3);
    const body = await response.json();
    expect(body.cart.id).toBe('cart-1');
  });

  it('returns 404 when cart is not found', async () => {
    const { CartNotFoundError } = await import('@/lib/commercetools/cart');
    mockUpdateLineItemQuantity.mockRejectedValue(new CartNotFoundError());

    const response = await PATCH(createPatchRequest({ quantity: 2 }), context);

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/cart/items/[lineItemId]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockUpdateLineItemQuantity.mockReset();
    mockRemoveLineItem.mockReset();
  });

  it('returns cart after removing line item', async () => {
    mockRemoveLineItem.mockResolvedValue({ id: 'cart-1' });

    const response = await DELETE(
      new NextRequest('http://localhost/api/cart/items/line-1', {
        method: 'DELETE',
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mockRemoveLineItem).toHaveBeenCalledWith('line-1');
  });

  it('returns 403 when cart access is denied', async () => {
    const { CartAccessError } = await import('@/lib/commercetools/cart');
    mockRemoveLineItem.mockRejectedValue(new CartAccessError());

    const response = await DELETE(
      new NextRequest('http://localhost/api/cart/items/line-1', {
        method: 'DELETE',
      }),
      context,
    );

    expect(response.status).toBe(403);
  });
});
