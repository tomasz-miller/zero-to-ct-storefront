/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockApplyDefaultAddressesToCart } = vi.hoisted(() => ({
  mockApplyDefaultAddressesToCart: vi.fn(),
}));

vi.mock('@/lib/commercetools/checkout-cart-addresses', () => ({
  applyDefaultAddressesToCart: mockApplyDefaultAddressesToCart,
}));

vi.mock('@/lib/commercetools/cart', () => ({
  CartAccessError: class CartAccessError extends Error {},
  CartNotFoundError: class CartNotFoundError extends Error {
    constructor(message = 'Cart not found') {
      super(message);
      this.name = 'CartNotFoundError';
    }
  },
  NoDefaultAddressError: class NoDefaultAddressError extends Error {
    constructor(message = 'No default address configured on your account') {
      super(message);
      this.name = 'NoDefaultAddressError';
    }
  },
}));

import { POST } from './route';

describe('POST /api/checkout/default-address', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockApplyDefaultAddressesToCart.mockReset();
  });

  it('returns the updated cart on success', async () => {
    mockApplyDefaultAddressesToCart.mockResolvedValue({
      id: 'cart-1',
      itemCount: 1,
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cart: { id: 'cart-1', itemCount: 1 },
    });
  });

  it('returns 401 when the customer is not signed in', async () => {
    const { CartAccessError } = await import('@/lib/commercetools/cart');
    mockApplyDefaultAddressesToCart.mockRejectedValue(
      new CartAccessError('Sign in required'),
    );

    const response = await POST();

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe('Sign in required');
  });

  it('returns 400 when no default address is configured', async () => {
    const { NoDefaultAddressError } = await import('@/lib/commercetools/cart');
    mockApplyDefaultAddressesToCart.mockRejectedValue(
      new NoDefaultAddressError(),
    );

    const response = await POST();

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/default address/i);
  });
});
