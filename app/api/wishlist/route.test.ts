/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGetWishlist } = vi.hoisted(() => ({
  mockGetWishlist: vi.fn(),
}));

vi.mock('@/lib/commercetools/shopping-lists', () => ({
  getWishlist: mockGetWishlist,
}));

import { GET } from './route';

describe('GET /api/wishlist', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetWishlist.mockReset();
  });

  it('returns null wishlist when no session exists', async () => {
    mockGetWishlist.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.wishlist).toBeNull();
  });

  it('returns mapped wishlist', async () => {
    mockGetWishlist.mockResolvedValue({
      id: 'list-1',
      version: 1,
      itemCount: 1,
      skus: ['SKU-001'],
      lineItems: [],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.wishlist.itemCount).toBe(1);
  });
});
