import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { parseWishlistSession } from './wishlist-session';

describe('parseWishlistSession', () => {
  it('parses valid session cookie payload', () => {
    expect(
      parseWishlistSession({ anonymousId: 'anon-1', shoppingListId: 'list-1' }),
    ).toEqual({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
  });

  it('returns null for invalid payload', () => {
    expect(parseWishlistSession(undefined)).toBeNull();
    expect(parseWishlistSession('not-json')).toBeNull();
    expect(parseWishlistSession({ shoppingListId: 'only-list' })).toBeNull();
  });
});
