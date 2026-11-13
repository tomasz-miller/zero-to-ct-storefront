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

import {
  NoDefaultAddressError,
  UnauthorizedError,
} from '@/lib/commercetools/domain-errors';

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

  it.each([
    [new UnauthorizedError(), 401, 'Sign in required'],
    [
      new NoDefaultAddressError(),
      400,
      'No default address configured on your account',
    ],
    [new Error('ct'), 500, 'Something went wrong. Please try again.'],
  ])('maps %s', async (error, status, message) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApplyDefaultAddressesToCart.mockRejectedValue(error);

    const response = await POST();

    expect(response.status).toBe(status);
    expect((await response.json()).error).toBe(message);
  });
});
