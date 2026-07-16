/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGetGuestCart } = vi.hoisted(() => ({
  mockGetGuestCart: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  getGuestCart: mockGetGuestCart,
}));

import { GET } from './route';

describe('GET /api/cart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetGuestCart.mockReset();
  });

  it('returns cart on success', async () => {
    mockGetGuestCart.mockResolvedValue({
      id: 'cart-1',
      totalLineItemQuantity: 2,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cart.id).toBe('cart-1');
  });

  it('returns 500 when fetch fails', async () => {
    mockGetGuestCart.mockRejectedValue(new Error('CT down'));

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/failed to fetch cart/i);
  });
});
