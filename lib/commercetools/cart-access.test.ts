/**
 * @vitest-environment node
 */
import type { Cart } from '@commercetools/platform-sdk';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({
  commercetoolsEnv: {
    projectKey: 'demo-project',
  },
}));

vi.mock('./api-root', () => ({
  apiRoot: {},
}));

vi.mock('./customer-session', () => ({
  getCustomerSession: vi.fn(),
}));

import { canAccessCart } from './cart';

function cart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart-1',
    version: 1,
    anonymousId: 'anon-1',
    ...overrides,
  } as Cart;
}

describe('canAccessCart', () => {
  const session = { anonymousId: 'anon-1', cartId: 'cart-1' };

  it('allows guest cart when anonymousId matches', () => {
    expect(canAccessCart(cart(), session)).toBe(true);
  });

  it('allows customer cart when customer session matches', () => {
    expect(
      canAccessCart(cart({ customerId: 'cust-1', anonymousId: undefined }), session, 'cust-1'),
    ).toBe(true);
  });

  it('denies customer cart when logged out', () => {
    expect(
      canAccessCart(cart({ customerId: 'cust-1', anonymousId: 'anon-old' }), session),
    ).toBe(false);
  });

  it('denies guest cart when anonymousId mismatches', () => {
    expect(canAccessCart(cart({ anonymousId: 'anon-other' }), session)).toBe(false);
  });
});
