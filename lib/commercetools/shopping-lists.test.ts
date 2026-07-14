/**
 * @vitest-environment node
 */
import type { ShoppingList } from '@commercetools/platform-sdk';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({
  commercetoolsEnv: {
    projectKey: 'demo-project',
  },
}));

vi.mock('./api-root', () => ({
  apiRoot: {},
}));

import { canAccessShoppingList } from './shopping-lists';

function list(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    id: 'list-1',
    version: 1,
    anonymousId: 'anon-1',
    lineItems: [],
    ...overrides,
  } as ShoppingList;
}

describe('canAccessShoppingList', () => {
  const session = { anonymousId: 'anon-1', shoppingListId: 'list-1' };

  it('allows guest list when anonymousId matches', () => {
    expect(canAccessShoppingList(list(), session)).toBe(true);
  });

  it('allows customer list when customer session matches', () => {
    expect(
      canAccessShoppingList(
        list({ customer: { typeId: 'customer', id: 'cust-1' }, anonymousId: undefined }),
        session,
        'cust-1',
      ),
    ).toBe(true);
  });

  it('denies customer list when logged out', () => {
    expect(
      canAccessShoppingList(
        list({ customer: { typeId: 'customer', id: 'cust-1' }, anonymousId: 'anon-old' }),
        session,
      ),
    ).toBe(false);
  });

  it('denies guest list when anonymousId mismatches', () => {
    expect(canAccessShoppingList(list({ anonymousId: 'anon-other' }), session)).toBe(false);
  });
});
