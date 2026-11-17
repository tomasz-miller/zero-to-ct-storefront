/**
 * @vitest-environment node
 */
import type { ShoppingList } from '@commercetools/platform-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({
  commercetoolsEnv: {
    projectKey: 'demo-project',
  },
}));

const {
  mockShoppingListsGet,
  mockShoppingListsPost,
  queryExecute,
  createExecute,
  withIdGet,
  withIdPost,
  withIdDelete,
  withIdExecute,
  mockProductProjections,
  mockGetWishlistSession,
  mockSetWishlistSession,
  mockClearWishlistSession,
  mockCreateWishlistAnonymousId,
  mockRotateWishlistSessionAnonymousId,
  mockGetCustomerSession,
  mockAddLineItem,
} = vi.hoisted(() => {
  type RequestArgs = { queryArgs?: Record<string, unknown>; body?: unknown };
  const queryExecute = vi.fn();
  const createExecute = vi.fn();
  const withIdExecute = vi.fn();
  return {
    queryExecute,
    createExecute,
    withIdExecute,
    mockShoppingListsGet: vi.fn<(args: RequestArgs) => { execute: typeof queryExecute }>(
      () => ({ execute: queryExecute }),
    ),
    mockShoppingListsPost: vi.fn<(args: RequestArgs) => { execute: typeof createExecute }>(
      () => ({ execute: createExecute }),
    ),
    withIdGet: vi.fn<(args: RequestArgs) => { execute: typeof withIdExecute }>(
      () => ({ execute: withIdExecute }),
    ),
    withIdPost: vi.fn<(args: RequestArgs) => { execute: typeof withIdExecute }>(
      () => ({ execute: withIdExecute }),
    ),
    withIdDelete: vi.fn<(args: RequestArgs) => { execute: typeof withIdExecute }>(
      () => ({ execute: withIdExecute }),
    ),
    mockProductProjections: vi.fn(), // must never be called after this task
    mockGetWishlistSession: vi.fn(),
    mockSetWishlistSession: vi.fn(),
    mockClearWishlistSession: vi.fn(),
    mockCreateWishlistAnonymousId: vi.fn(() => 'anon-new'),
    mockRotateWishlistSessionAnonymousId: vi.fn(),
    mockGetCustomerSession: vi.fn(),
    mockAddLineItem: vi.fn(async () => ({ itemCount: 1 })),
  };
});

vi.mock('./api-root', () => ({
  apiRoot: {
    shoppingLists: () => ({
      get: mockShoppingListsGet,
      post: mockShoppingListsPost,
      withId: () => ({ get: withIdGet, post: withIdPost, delete: withIdDelete }),
    }),
    productProjections: mockProductProjections,
  },
}));

vi.mock('./wishlist-session', () => ({
  getWishlistSession: mockGetWishlistSession,
  setWishlistSession: mockSetWishlistSession,
  clearWishlistSession: mockClearWishlistSession,
  createWishlistAnonymousId: mockCreateWishlistAnonymousId,
  rotateWishlistSessionAnonymousId: mockRotateWishlistSessionAnonymousId,
}));

vi.mock('./customer-session', () => ({
  getCustomerSession: mockGetCustomerSession,
}));

vi.mock('./storefront-context', () => ({
  getStorefrontContext: async () => ({ locale: 'en-GB', currency: 'EUR', country: 'DE' }),
}));

vi.mock('./cart', () => ({ addLineItem: mockAddLineItem }));

import { WishlistLineItemNotFoundError } from './domain-errors';
import {
  addWishlistItem,
  canAccessShoppingList,
  getWishlist,
  moveWishlistItemToCart,
  reconcileWishlistOnAuth,
  removeWishlistItem,
} from './shopping-lists';

beforeEach(() => {
  mockGetCustomerSession.mockResolvedValue(null);
  queryExecute.mockReset();
  createExecute.mockReset();
  withIdExecute.mockReset();
});

function ctError(statusCode: number, code = 'Error', message = 'ct') {
  return Object.assign(new Error(message), {
    statusCode,
    code,
    body: { statusCode, message, errors: [{ code, message }] },
  });
}

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

describe('wishlist lookup errors', () => {
  it('getWishlist rethrows a 503 and keeps the wishlist cookie', async () => {
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockRejectedValueOnce(ctError(503));
    await expect(getWishlist()).rejects.toMatchObject({ statusCode: 503 });
    expect(mockClearWishlistSession).not.toHaveBeenCalled();
  });

  it('getWishlist returns null and clears the cookie on 404', async () => {
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockRejectedValueOnce(ctError(404, 'ResourceNotFound'));
    await expect(getWishlist()).resolves.toBeNull();
    expect(mockClearWishlistSession).toHaveBeenCalledTimes(1);
  });

  it('reconcileWishlistOnAuth resolves and keeps the wishlist cookie when the guest-list GET fails with 503', async () => {
    // Call counts carry over between tests in this file (no mock reset configured), so clear the session spies first.
    mockClearWishlistSession.mockClear();
    mockSetWishlistSession.mockClear();
    mockRotateWishlistSessionAnonymousId.mockClear();
    mockShoppingListsGet.mockClear();
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockRejectedValueOnce(ctError(503));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(reconcileWishlistOnAuth('cust-1')).resolves.toBeUndefined();

    expect(mockClearWishlistSession).not.toHaveBeenCalled();
    expect(mockSetWishlistSession).not.toHaveBeenCalled();
    expect(mockRotateWishlistSessionAnonymousId).not.toHaveBeenCalled();
    expect(queryExecute).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[wishlist] reconcileWishlistOnAuth failed',
      expect.anything(),
    );
    consoleError.mockRestore();
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

describe('expanded shopping lists', () => {
  const listWith = (lineItems: unknown[], extra = {}) => ({
    id: 'list-1',
    version: 4,
    anonymousId: 'anon-1',
    lineItems,
    ...extra,
  });
  const expanded = {
    id: 'li-1',
    productId: 'p1',
    variantId: 1,
    variant: { id: 1, sku: 'SKU-1', images: [] },
    productSlug: { 'en-GB': 'p-1' },
    name: { 'en-GB': 'P1' },
  };

  it('reads the wishlist with variant and productSlug expanded and no projection call', async () => {
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockResolvedValue({ body: listWith([expanded]) });
    await getWishlist();
    expect(withIdGet).toHaveBeenCalledWith({
      queryArgs: { expand: ['lineItems[*].variant', 'lineItems[*].productSlug'] },
    });
    expect(mockProductProjections).not.toHaveBeenCalled();
  });

  it('passes the expand on every shopping-list POST', async () => {
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockResolvedValue({ body: listWith([expanded]) });
    await addWishlistItem('SKU-2');
    await removeWishlistItem('li-1');
    expect(withIdPost).toHaveBeenCalledTimes(2);
    for (const [args] of withIdPost.mock.calls) {
      expect(args.queryArgs?.expand).toEqual(['lineItems[*].variant', 'lineItems[*].productSlug']);
    }
  });

  it('moveWishlistItemToCart uses the expanded sku without a projection call', async () => {
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockResolvedValue({ body: listWith([expanded]) });
    await moveWishlistItemToCart('li-1');
    expect(mockAddLineItem).toHaveBeenCalledWith('SKU-1', 1);
    expect(mockProductProjections).not.toHaveBeenCalled();
  });

  it('moveWishlistItemToCart throws WishlistLineItemNotFoundError when the expanded variant has no sku', async () => {
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockResolvedValue({ body: listWith([{ ...expanded, variant: undefined }]) });
    await expect(moveWishlistItemToCart('li-1')).rejects.toBeInstanceOf(
      WishlistLineItemNotFoundError,
    );
    expect(mockAddLineItem).not.toHaveBeenCalled();
  });

  it('merge skips items already in the customer list by productId and variantId', async () => {
    // guest list-1 (anonymous) has (p1,1) and (p2,3); customer list-c (version 4) has (p1,1)
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockResolvedValueOnce({
      body: listWith([{ ...expanded }, { ...expanded, id: 'li-2', productId: 'p2', variantId: 3 }]),
    });
    queryExecute.mockResolvedValueOnce({
      body: { results: [listWith([{ ...expanded }], { id: 'list-c', customer: { id: 'cust-1' } })] },
    });
    withIdExecute.mockResolvedValue({ body: listWith([], { id: 'list-c' }) });
    await reconcileWishlistOnAuth('cust-1');
    expect(withIdPost).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          version: 4,
          actions: [{ action: 'addLineItem', productId: 'p2', variantId: 3, quantity: 1 }],
        },
      }),
    );
    expect(withIdDelete).toHaveBeenCalledTimes(1);
  });

  it('merge keeps the guest list when the update fails', async () => {
    // same setup as above, but the customer-list update rejects
    mockGetWishlistSession.mockResolvedValue({ anonymousId: 'anon-1', shoppingListId: 'list-1' });
    withIdExecute.mockResolvedValueOnce({
      body: listWith([{ ...expanded, id: 'li-2', productId: 'p2', variantId: 3 }]),
    });
    queryExecute.mockResolvedValueOnce({
      body: { results: [listWith([], { id: 'list-c', customer: { id: 'cust-1' } })] },
    });
    withIdExecute.mockRejectedValueOnce(ctError(500));
    await reconcileWishlistOnAuth('cust-1');
    expect(withIdDelete).not.toHaveBeenCalled();
    expect(mockRotateWishlistSessionAnonymousId).toHaveBeenCalledTimes(1);
  });
});
