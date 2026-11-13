/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockRemoveWishlistItem } = vi.hoisted(() => ({
  mockRemoveWishlistItem: vi.fn(),
}));

vi.mock('@/lib/commercetools/shopping-lists', () => ({
  removeWishlistItem: mockRemoveWishlistItem,
}));

import {
  WishlistAccessError,
  WishlistLineItemNotFoundError,
} from '@/lib/commercetools/domain-errors';

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
    mockRemoveWishlistItem.mockRejectedValue(new WishlistLineItemNotFoundError());

    const response = await DELETE(new Request('http://localhost'), context);

    expect(response.status).toBe(404);
  });

  it('returns 403 when wishlist access is denied', async () => {
    mockRemoveWishlistItem.mockRejectedValue(new WishlistAccessError());

    const response = await DELETE(new Request('http://localhost'), context);

    expect(response.status).toBe(403);
  });
});
