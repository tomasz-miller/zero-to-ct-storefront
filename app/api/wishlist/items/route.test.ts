/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockAddWishlistItem } = vi.hoisted(() => ({
  mockAddWishlistItem: vi.fn(),
}));

vi.mock('@/lib/commercetools/shopping-lists', () => ({
  addWishlistItem: mockAddWishlistItem,
  WishlistAccessError: class WishlistAccessError extends Error {},
  WishlistNotFoundError: class WishlistNotFoundError extends Error {},
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/wishlist/items', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const sampleWishlist = {
  id: 'list-1',
  version: 1,
  itemCount: 1,
  skus: ['SKU-001'],
  lineItems: [
    {
      id: 'line-1',
      productId: 'prod-1',
      name: 'Sample product',
      slug: 'sample-product',
      sku: 'SKU-001',
      variantId: 1,
      quantity: 1,
    },
  ],
};

describe('POST /api/wishlist/items', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockAddWishlistItem.mockReset();
  });

  it('returns 400 when sku is missing', async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/sku/i);
  });

  it('returns wishlist on successful add', async () => {
    mockAddWishlistItem.mockResolvedValue(sampleWishlist);

    const response = await POST(createRequest({ sku: 'SKU-001' }));

    expect(response.status).toBe(200);
    expect(mockAddWishlistItem).toHaveBeenCalledWith('SKU-001');

    const body = await response.json();
    expect(body.wishlist.id).toBe('list-1');
    expect(body.wishlist.skus).toEqual(['SKU-001']);
  });
});
