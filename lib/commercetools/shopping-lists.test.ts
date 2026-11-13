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

const {
  mockShoppingListsGet,
  queryExecute,
  withIdGet,
  withIdPost,
  withIdExecute,
  mockGetWishlistSession,
  mockSetWishlistSession,
  mockClearWishlistSession,
  mockRotateWishlistSessionAnonymousId,
  mockGetCustomerSession,
} = vi.hoisted(() => {
  const queryExecute = vi.fn();
  const withIdExecute = vi.fn();
  return {
    queryExecute,
    withIdExecute,
    mockShoppingListsGet: vi.fn<
      (args: { queryArgs: Record<string, unknown> }) => {
        execute: typeof queryExecute;
      }
    >(() => ({
      execute: queryExecute,
    })),
    withIdGet: vi.fn(() => ({ execute: withIdExecute })),
    withIdPost: vi.fn<
      (args: { body: unknown }) => { execute: typeof withIdExecute }
    >(() => ({
      execute: withIdExecute,
    })),
    mockGetWishlistSession: vi.fn(),
    mockSetWishlistSession: vi.fn(),
    mockClearWishlistSession: vi.fn(),
    mockRotateWishlistSessionAnonymousId: vi.fn(),
    mockGetCustomerSession: vi.fn(),
  };
});

vi.mock('./api-root', () => ({
  apiRoot: {
    shoppingLists: vi.fn(() => ({
      get: mockShoppingListsGet,
      withId: vi.fn(() => ({ get: withIdGet, post: withIdPost })),
    })),
  },
}));

vi.mock('./wishlist-session', () => ({
  getWishlistSession: mockGetWishlistSession,
  setWishlistSession: mockSetWishlistSession,
  clearWishlistSession: mockClearWishlistSession,
  rotateWishlistSessionAnonymousId: mockRotateWishlistSessionAnonymousId,
  createWishlistAnonymousId: () => 'anon-new',
}));

vi.mock('./customer-session', () => ({
  getCustomerSession: mockGetCustomerSession,
}));

import {
  canAccessShoppingList,
  reconcileWishlistOnAuth,
} from './shopping-lists';

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

describe('customer wishlist lookup', () => {
  it('passes the customer id only as a variable', async () => {
    const injected = 'x") or anonymousId = ("y';
    mockGetWishlistSession.mockResolvedValueOnce({
      anonymousId: 'anon-1',
      shoppingListId: 'list-1',
    });
    mockGetCustomerSession.mockResolvedValue(null);
    withIdExecute
      .mockResolvedValueOnce({ body: list() }) // guest list owned by anon-1
      .mockResolvedValueOnce({
        body: list({ customer: { typeId: 'customer', id: injected } }),
      }); // setCustomer transfer
    queryExecute.mockResolvedValueOnce({ body: { results: [] } });

    await reconcileWishlistOnAuth(injected);

    expect(mockShoppingListsGet).toHaveBeenCalledWith({
      queryArgs: expect.objectContaining({
        where: 'customer(id = :customerId)',
        'var.customerId': injected,
      }),
    });
    expect(mockSetWishlistSession).toHaveBeenCalledWith({
      anonymousId: 'anon-new',
      shoppingListId: 'list-1',
    });
  });
});
