/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockRemoveWishlistItem } = vi.hoisted(() => ({
  mockRemoveWishlistItem: vi.fn(),
}));

vi.mock('@/lib/commercetools/shopping-lists', () => ({
  removeWishlistItem: mockRemoveWishlistItem,
  WishlistAccessError: class WishlistAccessError extends Error {},
  WishlistLineItemNotFoundError: class WishlistLineItemNotFoundError extends Error {},
  WishlistNotFoundError: class WishlistNotFoundError extends Error {},
}));

import { DELETE } from './route';

const context = { params: Promise.resolve({ lineItemId: 'line-1' }) };

describe('DELETE /api/wishlist/items/[lineItemId]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockRemoveWishlistItem.mockReset();
  });

  it('returns wishlist after removing item', async () => {
    mockRemoveWishlistItem.mockResolvedValue({
      id: 'list-1',
      skus: [],
      lineItems: [],
    });

    const response = await DELETE(new Request('http://localhost'), context);

    expect(response.status).toBe(200);
    expect(mockRemoveWishlistItem).toHaveBeenCalledWith('line-1');
  });

  it('returns 404 when wishlist item is missing', async () => {
    const { WishlistLineItemNotFoundError } = await import(
      '@/lib/commercetools/shopping-lists'
    );
    mockRemoveWishlistItem.mockRejectedValue(new WishlistLineItemNotFoundError());

    const response = await DELETE(new Request('http://localhost'), context);

    expect(response.status).toBe(404);
  });

  it('returns 403 when wishlist access is denied', async () => {
    const { WishlistAccessError } = await import(
      '@/lib/commercetools/shopping-lists'
    );
    mockRemoveWishlistItem.mockRejectedValue(new WishlistAccessError());

    const response = await DELETE(new Request('http://localhost'), context);

    expect(response.status).toBe(403);
  });
});
