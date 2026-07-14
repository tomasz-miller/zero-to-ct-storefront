import { describe, expect, it } from 'vitest';

import { parseWishlistSession } from './wishlist-session';

describe('parseWishlistSession', () => {
  it('parses valid session cookie payload', () => {
    expect(
      parseWishlistSession(
        JSON.stringify({
          anonymousId: 'anon-1',
          shoppingListId: 'list-1',
        }),
      ),
    ).toEqual({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
  });

  it('returns null for invalid payload', () => {
    expect(parseWishlistSession(undefined)).toBeNull();
    expect(parseWishlistSession('not-json')).toBeNull();
    expect(parseWishlistSession(JSON.stringify({ shoppingListId: 'only-list' }))).toBeNull();
  });
});
