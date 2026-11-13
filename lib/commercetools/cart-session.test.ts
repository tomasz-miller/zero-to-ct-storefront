import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { parseCartSession } from './cart-session';

describe('parseCartSession', () => {
  it('parses valid session cookie payload', () => {
    expect(parseCartSession({ anonymousId: 'anon-1', cartId: 'cart-1' })).toEqual({
      anonymousId: 'anon-1',
      cartId: 'cart-1',
    });
  });

  it('returns null for invalid payload', () => {
    expect(parseCartSession(undefined)).toBeNull();
    expect(parseCartSession('not-json')).toBeNull();
    expect(parseCartSession({ cartId: 'only-cart' })).toBeNull();
  });
});
