/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockMoveWishlistItemToCart } = vi.hoisted(() => ({
  mockMoveWishlistItemToCart: vi.fn(),
}));

vi.mock('@/lib/commercetools/shopping-lists', () => ({
  moveWishlistItemToCart: mockMoveWishlistItemToCart,
}));

import {
  CartNotFoundError,
  WishlistLineItemNotFoundError,
} from '@/lib/commercetools/domain-errors';

import { POST } from './route';

const context = { params: Promise.resolve({ lineItemId: 'line-1' }) };

describe('POST /api/wishlist/items/[lineItemId]/move-to-cart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockMoveWishlistItemToCart.mockReset();
  });

  it('returns cart and wishlist on success', async () => {
    mockMoveWishlistItemToCart.mockResolvedValue({
      cart: { id: 'cart-1' },
      wishlist: { id: 'list-1', skus: [] },
    });

    const response = await POST(new Request('http://localhost'), context);

    expect(response.status).toBe(200);
    expect(mockMoveWishlistItemToCart).toHaveBeenCalledWith('line-1');
    const body = await response.json();
    expect(body.cart.id).toBe('cart-1');
  });

  it('returns 404 when wishlist item is missing', async () => {
    mockMoveWishlistItemToCart.mockRejectedValue(
      new WishlistLineItemNotFoundError(),
    );

    const response = await POST(new Request('http://localhost'), context);

    expect(response.status).toBe(404);
  });

  it('returns 404 when cart is not found', async () => {
    mockMoveWishlistItemToCart.mockRejectedValue(new CartNotFoundError());

    const response = await POST(new Request('http://localhost'), context);

    expect(response.status).toBe(404);
  });
});
