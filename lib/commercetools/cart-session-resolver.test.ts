/**
 * @vitest-environment node
 */
import type { Cart } from '@commercetools/platform-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCartFixture } from '@/test/fixtures/cart';

const {
  mockExecute,
  mockCartGet,
  mockCartPost,
  mockCartsGet,
  mockCartsPost,
  mockWithId,
  mockGetCartSession,
  mockSetCartSession,
  mockGetCustomerSession,
  mockClearCartSession,
  mockCreateAnonymousId,
  mockGetProductAvailabilityBySku,
  mockGetStorefrontContext,
  marketCartMap,
  mockGetCartIdForCountry,
  mockRememberCartForCountry,
  mockForgetCartForCountry,
} = vi.hoisted(() => {
  const marketCartMap: {
    anonymousId: string;
    carts: Partial<Record<'DE' | 'GB' | 'US', string>>;
  } = {
    anonymousId: '',
    carts: {},
  };

  return {
    mockExecute: vi.fn(),
    mockCartGet: vi.fn(() => ({ execute: mockExecute })),
    mockCartPost: vi.fn(() => ({ execute: mockExecute })),
    mockCartsGet: vi.fn(() => ({ execute: mockExecute })),
    mockCartsPost: vi.fn(() => ({ execute: mockExecute })),
    mockWithId: vi.fn(() => ({
      get: mockCartGet,
      post: mockCartPost,
    })),
    mockGetCartSession: vi.fn(),
    mockSetCartSession: vi.fn(),
    mockGetCustomerSession: vi.fn(),
    mockClearCartSession: vi.fn(),
    mockCreateAnonymousId: vi.fn(() => 'anon-new'),
    mockGetProductAvailabilityBySku: vi.fn(async () => ({
      isOnStock: true,
      status: 'in_stock' as 'in_stock' | 'low_stock' | 'out_of_stock',
    })),
    mockGetStorefrontContext: vi.fn(async () => ({
      currency: 'EUR',
      country: 'DE',
      locale: 'de-DE',
    })),
    marketCartMap,
    mockGetCartIdForCountry: vi.fn(
      async (country: 'DE' | 'GB' | 'US') => marketCartMap.carts[country],
    ),
    mockRememberCartForCountry: vi.fn(
      async (country: 'DE' | 'GB' | 'US', cartId: string) => {
        marketCartMap.carts[country] = cartId;
      },
    ),
    mockForgetCartForCountry: vi.fn(async (country: 'DE' | 'GB' | 'US') => {
      delete marketCartMap.carts[country];
    }),
  };
});

vi.mock('./storefront-context', () => ({
  getStorefrontContext: mockGetStorefrontContext,
  getCatalogContext: async () => ({
    currency: 'EUR',
    country: 'DE',
    locale: 'en-GB',
  }),
}));

vi.mock('./products', () => ({
  getProductAvailabilityBySku: mockGetProductAvailabilityBySku,
}));

vi.mock('./cart-session', () => ({
  getCartSession: mockGetCartSession,
  setCartSession: mockSetCartSession,
  clearCartSession: mockClearCartSession,
  createAnonymousId: mockCreateAnonymousId,
}));

vi.mock('./customer-session', () => ({
  getCustomerSession: mockGetCustomerSession,
}));

vi.mock('./market-cart-session', () => ({
  getCartIdForCountry: mockGetCartIdForCountry,
  rememberCartForCountry: mockRememberCartForCountry,
  forgetCartForCountry: mockForgetCartForCountry,
}));

vi.mock('./api-root', () => ({
  apiRoot: {
    carts: vi.fn(() => ({
      get: mockCartsGet,
      post: mockCartsPost,
      withId: mockWithId,
    })),
  },
}));

import {
  addLineItem,
  addLineItems,
  findCustomerCart,
  findCustomerCartForMarket,
  getCartForCheckout,
  getOwnedGuestCartRef,
  OutOfStockError,
  realignCartForStorefront,
  reconcileCartOnAuth,
  restoreCustomerCartSession,
} from './cart';

function emptyGuestCart(overrides: Partial<Cart> = {}): Cart {
  return createCartFixture({
    id: 'cart-guest',
    anonymousId: 'anon-new',
    country: 'DE',
    lineItems: [],
    discountCodes: [],
    totalPrice: {
      type: 'centPrecision',
      currencyCode: 'EUR',
      centAmount: 0,
      fractionDigits: 2,
    },
    ...overrides,
  });
}

describe('cart session resolver', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    marketCartMap.anonymousId = '';
    marketCartMap.carts = {};
    mockGetProductAvailabilityBySku.mockResolvedValue({
      isOnStock: true,
      status: 'in_stock',
    });
    mockGetStorefrontContext.mockResolvedValue({
      currency: 'EUR',
      country: 'DE',
      locale: 'de-DE',
    });
  });

  it('throws OutOfStockError before cart mutation when sku is unavailable', async () => {
    mockGetProductAvailabilityBySku.mockResolvedValueOnce({
      isOnStock: false,
      status: 'out_of_stock',
    });

    await expect(addLineItem('SKU-OOS', 1)).rejects.toThrow(OutOfStockError);
    expect(mockCartsPost).not.toHaveBeenCalled();
  });

  it('addLineItems batch-adds with a single cart update', async () => {
    mockGetCustomerSession.mockResolvedValue(null);
    mockGetCartSession.mockResolvedValue(null);

    const guestCart = emptyGuestCart();
    const cartWithItems = createCartFixture({
      id: 'cart-guest',
      anonymousId: 'anon-new',
      country: 'DE',
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: cartWithItems });

    await addLineItems([
      { sku: 'SKU-1', quantity: 2 },
      { sku: 'SKU-2', quantity: 1 },
    ]);

    expect(mockCartPost).toHaveBeenCalledWith({
      body: {
        version: guestCart.version,
        actions: [
          { action: 'addLineItem', sku: 'SKU-1', quantity: 2 },
          { action: 'addLineItem', sku: 'SKU-2', quantity: 1 },
        ],
      },
      queryArgs: {
        expand: ['discountCodes[*].discountCode'],
      },
    });
  });

  it('addLineItems skips availability checks when requested', async () => {
    mockGetCustomerSession.mockResolvedValue(null);
    mockGetCartSession.mockResolvedValue(null);

    const guestCart = emptyGuestCart();
    const cartWithItems = createCartFixture({
      id: 'cart-guest',
      anonymousId: 'anon-new',
      country: 'DE',
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: cartWithItems });

    await addLineItems([{ sku: 'SKU-1', quantity: 1 }], {
      checkAvailability: false,
    });

    expect(mockGetProductAvailabilityBySku).not.toHaveBeenCalled();
  });

  it('creates a guest cart when no customer session exists', async () => {
    mockGetCustomerSession.mockResolvedValue(null);
    mockGetCartSession.mockResolvedValue(null);

    const guestCart = emptyGuestCart();
    const cartWithItem = createCartFixture({
      id: 'cart-guest',
      anonymousId: 'anon-new',
      country: 'DE',
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: cartWithItem });

    await addLineItem('SKU-1', 1);

    expect(mockCartsPost).toHaveBeenCalledWith({
      body: expect.objectContaining({
        anonymousId: 'anon-new',
        country: 'DE',
        currency: 'EUR',
      }),
    });
    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-new',
      cartId: 'cart-guest',
    });
  });

  it('creates a customer cart when logged in without a cart cookie', async () => {
    mockGetCustomerSession.mockResolvedValue({ customerId: 'cust-1' });
    mockGetCartSession.mockResolvedValue(null);

    const customerCart = emptyGuestCart({
      id: 'cart-customer',
      customerId: 'cust-1',
      anonymousId: undefined,
    });
    const cartWithItem = createCartFixture({
      id: 'cart-customer',
      customerId: 'cust-1',
      country: 'DE',
      anonymousId: undefined,
    });

    mockExecute
      .mockResolvedValueOnce({ body: { results: [] } })
      .mockResolvedValueOnce({ body: customerCart })
      .mockResolvedValueOnce({ body: customerCart })
      .mockResolvedValueOnce({ body: cartWithItem });

    await addLineItem('SKU-1', 1);

    expect(mockCartsGet).toHaveBeenCalledWith({
      queryArgs: expect.objectContaining({
        where:
          'customerId = :customerId and cartState = "Active" and country = :country and totalPrice(currencyCode = :currency)',
        'var.customerId': 'cust-1',
        'var.country': 'DE',
        'var.currency': 'EUR',
      }),
    });
    expect(mockCartsPost).toHaveBeenCalledWith({
      body: expect.objectContaining({
        customerId: 'cust-1',
      }),
    });
    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-new',
      cartId: 'cart-customer',
    });
  });

  it('assigns customerId to an anonymous cart owned by a logged-in user', async () => {
    mockGetCustomerSession.mockResolvedValue({ customerId: 'cust-1' });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-guest',
    });

    const guestCart = emptyGuestCart({ id: 'cart-guest', anonymousId: 'anon-1' });
    const assignedCart = emptyGuestCart({
      id: 'cart-guest',
      customerId: 'cust-1',
      anonymousId: undefined,
    });
    const cartWithItem = createCartFixture({
      id: 'cart-guest',
      customerId: 'cust-1',
      country: 'DE',
      anonymousId: undefined,
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: { results: [] } })
      .mockResolvedValueOnce({ body: assignedCart })
      .mockResolvedValueOnce({ body: assignedCart })
      .mockResolvedValueOnce({ body: cartWithItem });

    await addLineItem('SKU-1', 1);

    expect(mockCartPost).toHaveBeenCalledWith({
      body: {
        version: guestCart.version,
        actions: [{ action: 'setCustomerId', customerId: 'cust-1' }],
      },
    });
  });

  it('resolves customerId on checkout for logged-in user with anonymous cart', async () => {
    mockGetCustomerSession.mockResolvedValue({ customerId: 'cust-1' });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-guest',
    });

    const guestCart = createCartFixture({
      id: 'cart-guest',
      anonymousId: 'anon-1',
      country: 'DE',
    });
    const assignedCart = createCartFixture({
      id: 'cart-guest',
      customerId: 'cust-1',
      country: 'DE',
      anonymousId: undefined,
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: { results: [] } })
      .mockResolvedValueOnce({ body: assignedCart })
      .mockResolvedValueOnce({ body: assignedCart });

    const result = await getCartForCheckout();

    expect(mockCartPost).toHaveBeenCalledWith({
      body: {
        version: guestCart.version,
        actions: [{ action: 'setCustomerId', customerId: 'cust-1' }],
      },
    });
    expect(result.cart.id).toBe('cart-guest');
  });

  it('never assigns or merges a guest cart whose anonymousId differs from the session (signed in)', async () => {
    mockGetCustomerSession.mockResolvedValue({ customerId: 'cust-1' });
    mockGetCartSession.mockResolvedValue({ anonymousId: 'anon-attacker', cartId: 'cart-victim' });
    const customerCart = emptyGuestCart({ id: 'cart-customer', customerId: 'cust-1', anonymousId: undefined });
    mockExecute
      .mockResolvedValueOnce({ body: emptyGuestCart({ id: 'cart-victim', anonymousId: 'anon-victim' }) })
      .mockResolvedValueOnce({ body: { results: [customerCart] } })
      .mockResolvedValue({ body: customerCart });
    await addLineItem('SKU-1', 1);
    expect(mockWithId).not.toHaveBeenCalledWith({ ID: 'cart-victim' }, expect.anything());
    expect(JSON.stringify(mockCartPost.mock.calls)).not.toContain('setCustomerId');
    expect(mockSetCartSession).toHaveBeenCalledWith({ anonymousId: 'anon-attacker', cartId: 'cart-customer' });
  });

  it.each([
    ['customer cart', { customerId: 'cust-9' }],
    ['other anonymousId', { anonymousId: 'anon-other' }],
    ['Ordered cart', { cartState: 'Ordered' as const }],
  ])('getOwnedGuestCartRef returns null for a %s', async (_label, overrides) => {
    mockGetCartSession.mockResolvedValueOnce({ anonymousId: 'anon-1', cartId: 'cart-guest' });
    mockExecute.mockResolvedValueOnce({ body: emptyGuestCart({ anonymousId: 'anon-1', ...overrides }) });
    await expect(getOwnedGuestCartRef()).resolves.toBeNull();
  });

  it('getOwnedGuestCartRef returns the ref for an active guest cart with the session anonymousId', async () => {
    mockGetCartSession.mockResolvedValueOnce({ anonymousId: 'anon-1', cartId: 'cart-guest' });
    mockExecute.mockResolvedValueOnce({ body: emptyGuestCart({ anonymousId: 'anon-1' }) });
    await expect(getOwnedGuestCartRef()).resolves.toEqual({ cartId: 'cart-guest', anonymousId: 'anon-1' });
  });

  it('reconcileCartOnAuth restores the customer cart and never touches mapped guest carts', async () => {
    marketCartMap.carts = { GB: 'cart-parked' };
    mockExecute.mockResolvedValueOnce({ body: { results: [emptyGuestCart({ id: 'cart-customer', customerId: 'cust-1' })] } });
    await reconcileCartOnAuth('cust-1');
    expect(mockWithId).not.toHaveBeenCalledWith({ ID: 'cart-parked' });
    expect(mockCartPost).not.toHaveBeenCalled();
    expect(mockSetCartSession).toHaveBeenCalledWith(expect.objectContaining({ cartId: 'cart-customer' }));
  });

  it('findCustomerCart returns the newest active customer cart', async () => {
    const customerCart = emptyGuestCart({
      id: 'cart-customer',
      customerId: 'cust-1',
      anonymousId: undefined,
    });
    mockExecute.mockResolvedValueOnce({ body: { results: [customerCart] } });

    await expect(findCustomerCart('cust-1')).resolves.toEqual(customerCart);
  });

  it('findCustomerCartForMarket filters by country and currency', async () => {
    const customerCart = emptyGuestCart({
      id: 'cart-gb',
      customerId: 'cust-1',
      anonymousId: undefined,
      country: 'GB',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'GBP',
        centAmount: 0,
        fractionDigits: 2,
      },
    });
    mockExecute.mockResolvedValueOnce({ body: { results: [customerCart] } });

    await expect(
      findCustomerCartForMarket('cust-1', 'GB', 'GBP'),
    ).resolves.toEqual(customerCart);

    expect(mockCartsGet).toHaveBeenCalledWith({
      queryArgs: expect.objectContaining({
        where:
          'customerId = :customerId and cartState = "Active" and country = :country and totalPrice(currencyCode = :currency)',
        'var.customerId': 'cust-1',
        'var.country': 'GB',
        'var.currency': 'GBP',
      }),
    });
  });

  it('findCustomerCartForMarket passes an injected customerId only as a variable', async () => {
    const injected = 'x" or customerEmail="a@b.c" or customerId="y';
    mockExecute.mockResolvedValueOnce({ body: { results: [] } });

    await findCustomerCartForMarket(injected, 'GB', 'GBP');

    expect(mockCartsGet).toHaveBeenCalledWith({
      queryArgs: expect.objectContaining({
        where:
          'customerId = :customerId and cartState = "Active" and country = :country and totalPrice(currencyCode = :currency)',
        'var.customerId': injected,
      }),
    });
  });

  it('findCustomerCartForMarket ignores a result owned by another customer', async () => {
    mockExecute.mockResolvedValueOnce({
      body: { results: [createCartFixture({ customerId: 'cust-2' })] },
    });

    await expect(
      findCustomerCartForMarket('cust-1', 'GB', 'GBP'),
    ).resolves.toBeNull();
  });

  it('restoreCustomerCartSession sets cookie when customer cart exists', async () => {
    const customerCart = emptyGuestCart({
      id: 'cart-customer',
      customerId: 'cust-1',
      anonymousId: undefined,
    });
    mockExecute.mockResolvedValueOnce({ body: { results: [customerCart] } });

    await restoreCustomerCartSession('cust-1');

    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-new',
      cartId: 'cart-customer',
    });
    expect(mockRememberCartForCountry).toHaveBeenCalledWith('DE', 'cart-customer');
  });

  it('parks a guest cart and creates a new cart for the target market', async () => {
    mockGetStorefrontContext.mockResolvedValue({
      currency: 'GBP',
      country: 'GB',
      locale: 'en-GB',
    });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-old',
    });
    mockGetCustomerSession.mockResolvedValue(null);

    const oldCart = createCartFixture({
      id: 'cart-old',
      anonymousId: 'anon-1',
      country: 'DE',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 49900,
        fractionDigits: 2,
      },
    });
    const newCart = emptyGuestCart({
      id: 'cart-new',
      anonymousId: 'anon-1',
      country: 'GB',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'GBP',
        centAmount: 0,
        fractionDigits: 2,
      },
    });

    mockExecute
      .mockResolvedValueOnce({ body: oldCart })
      .mockResolvedValueOnce({ body: newCart });

    await expect(realignCartForStorefront()).resolves.toEqual({
      cartRecreated: true,
      cartRestored: false,
      itemCount: 0,
      previousHadItems: true,
    });

    expect(mockRememberCartForCountry).toHaveBeenCalledWith('DE', 'cart-old');
    expect(mockCartsPost).toHaveBeenCalledWith({
      body: expect.objectContaining({
        anonymousId: 'anon-1',
        country: 'GB',
        currency: 'GBP',
      }),
    });
    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-1',
      cartId: 'cart-new',
    });
  });

  it('restores a parked guest cart when switching back to that market', async () => {
    mockGetStorefrontContext.mockResolvedValue({
      currency: 'EUR',
      country: 'DE',
      locale: 'en-GB',
    });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-gb',
    });
    mockGetCustomerSession.mockResolvedValue(null);
    marketCartMap.anonymousId = 'anon-1';
    marketCartMap.carts = { DE: 'cart-de', GB: 'cart-gb' };

    const gbCart = emptyGuestCart({
      id: 'cart-gb',
      anonymousId: 'anon-1',
      country: 'GB',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'GBP',
        centAmount: 0,
        fractionDigits: 2,
      },
    });
    const deCart = createCartFixture({
      id: 'cart-de',
      anonymousId: 'anon-1',
      country: 'DE',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 49900,
        fractionDigits: 2,
      },
    });

    mockExecute
      .mockResolvedValueOnce({ body: gbCart })
      .mockResolvedValueOnce({ body: deCart });

    await expect(realignCartForStorefront()).resolves.toEqual({
      cartRecreated: false,
      cartRestored: true,
      itemCount: 2,
      previousHadItems: false,
    });

    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-1',
      cartId: 'cart-de',
    });
    expect(mockCartsPost).not.toHaveBeenCalled();
  });

  it('realigns a customer cart with items by creating a new market cart', async () => {
    mockGetStorefrontContext.mockResolvedValue({
      currency: 'GBP',
      country: 'GB',
      locale: 'en-GB',
    });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-session',
      cartId: 'cart-customer-old',
    });
    mockGetCustomerSession.mockResolvedValue({ customerId: 'cust-1' });

    const oldCart = createCartFixture({
      id: 'cart-customer-old',
      customerId: 'cust-1',
      anonymousId: undefined,
      country: 'DE',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 49900,
        fractionDigits: 2,
      },
    });
    const newCart = emptyGuestCart({
      id: 'cart-customer-new',
      customerId: 'cust-1',
      anonymousId: undefined,
      country: 'GB',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'GBP',
        centAmount: 0,
        fractionDigits: 2,
      },
    });

    mockExecute
      .mockResolvedValueOnce({ body: oldCart })
      .mockResolvedValueOnce({ body: { results: [] } })
      .mockResolvedValueOnce({ body: newCart });

    await expect(realignCartForStorefront()).resolves.toEqual({
      cartRecreated: true,
      cartRestored: false,
      itemCount: 0,
      previousHadItems: true,
    });

    expect(mockCartsPost).toHaveBeenCalledWith({
      body: expect.objectContaining({
        customerId: 'cust-1',
        country: 'GB',
        currency: 'GBP',
      }),
    });
    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-session',
      cartId: 'cart-customer-new',
    });
  });

  it('propagates commercetools errors from realignCartForStorefront', async () => {
    mockGetStorefrontContext.mockResolvedValue({
      currency: 'GBP',
      country: 'GB',
      locale: 'en-GB',
    });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-old',
    });
    mockGetCustomerSession.mockResolvedValue(null);

    const oldCart = createCartFixture({
      id: 'cart-old',
      anonymousId: 'anon-1',
      country: 'DE',
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 49900,
        fractionDigits: 2,
      },
    });

    mockExecute
      .mockResolvedValueOnce({ body: oldCart })
      .mockRejectedValueOnce(new Error('CT unavailable'));

    await expect(realignCartForStorefront()).rejects.toThrow('CT unavailable');
  });
});
