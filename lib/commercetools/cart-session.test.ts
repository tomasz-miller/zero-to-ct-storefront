import { describe, expect, it } from 'vitest';

import { parseCartSession } from './cart-session';

describe('parseCartSession', () => {
  it('parses valid session cookie payload', () => {
    expect(
      parseCartSession(
        JSON.stringify({
          anonymousId: 'anon-1',
          cartId: 'cart-1',
        }),
      ),
    ).toEqual({ anonymousId: 'anon-1', cartId: 'cart-1' });
  });

  it('returns null for invalid payload', () => {
    expect(parseCartSession(undefined)).toBeNull();
    expect(parseCartSession('not-json')).toBeNull();
    expect(parseCartSession(JSON.stringify({ cartId: 'only-cart' }))).toBeNull();
  });
});
