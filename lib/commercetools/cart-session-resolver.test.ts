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
} = vi.hoisted(() => ({
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
  mockGetProductAvailabilityBySku: vi.fn(async () => ({ isOnStock: true })),
}));

vi.mock('./storefront-context', () => ({
  getStorefrontContext: () => ({ currency: 'EUR', country: 'DE', locale: 'de-DE' }),
  getCatalogContext: () => ({ currency: 'EUR', country: 'DE', locale: 'en-GB' }),
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

vi.mock('./api-root', () => ({
  apiRoot: {
    carts: vi.fn(() => ({
      get: mockCartsGet,
      post: mockCartsPost,
      withId: mockWithId,
    })),
  },
}));

import { addLineItem, findCustomerCart, getCartForCheckout, OutOfStockError, reconcileCartOnAuth, restoreCustomerCartSession } from './cart';

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
    mockGetProductAvailabilityBySku.mockResolvedValue({ isOnStock: true });
  });

  it('throws OutOfStockError before cart mutation when sku is unavailable', async () => {
    mockGetProductAvailabilityBySku.mockResolvedValueOnce({ isOnStock: false });

    await expect(addLineItem('SKU-OOS', 1)).rejects.toThrow(OutOfStockError);
    expect(mockCartsPost).not.toHaveBeenCalled();
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
        where: 'customerId="cust-1" and cartState="Active"',
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

  it('merges anonymous cart line items into an existing customer cart', async () => {
    mockGetCustomerSession.mockResolvedValue({ customerId: 'cust-1' });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-guest',
    });

    const guestCart = createCartFixture({
      id: 'cart-guest',
      anonymousId: 'anon-1',
      country: 'DE',
      lineItems: [
        {
          ...createCartFixture().lineItems[0],
          id: 'guest-line-1',
          quantity: 2,
          variant: {
            ...createCartFixture().lineItems[0].variant,
            sku: 'SKU-NEW',
          },
        },
      ],
      discountCodes: [],
    });
    const customerCart = emptyGuestCart({
      id: 'cart-customer',
      customerId: 'cust-1',
      anonymousId: undefined,
      lineItems: [
        {
          ...createCartFixture().lineItems[0],
          id: 'cust-line-1',
          quantity: 1,
          variant: {
            ...createCartFixture().lineItems[0].variant,
            sku: 'SKU-EXISTING',
          },
        },
      ],
    });
    const mergedCart = createCartFixture({
      id: 'cart-customer',
      customerId: 'cust-1',
      country: 'DE',
      anonymousId: undefined,
    });
    const cartWithItem = createCartFixture({
      id: 'cart-customer',
      customerId: 'cust-1',
      country: 'DE',
      anonymousId: undefined,
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: { results: [customerCart] } })
      .mockResolvedValueOnce({ body: mergedCart })
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: mergedCart })
      .mockResolvedValueOnce({ body: cartWithItem });

    await addLineItem('SKU-1', 1);

    expect(mockWithId).toHaveBeenCalledWith({ ID: 'cart-customer' });
    expect(mockCartPost).toHaveBeenCalledWith({
      body: {
        version: customerCart.version,
        actions: [{ action: 'addLineItem', sku: 'SKU-NEW', quantity: 2 }],
      },
    });
    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-1',
      cartId: 'cart-customer',
    });
  });

  it('merges duplicate SKUs by summing quantities', async () => {
    mockGetCustomerSession.mockResolvedValue({ customerId: 'cust-1' });
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-guest',
    });

    const sharedSku = 'SKU-SHARED';
    const guestCart = createCartFixture({
      id: 'cart-guest',
      anonymousId: 'anon-1',
      country: 'DE',
      lineItems: [
        {
          ...createCartFixture().lineItems[0],
          id: 'guest-line-1',
          quantity: 2,
          variant: {
            ...createCartFixture().lineItems[0].variant,
            sku: sharedSku,
          },
        },
      ],
      discountCodes: [],
    });
    const customerCart = emptyGuestCart({
      id: 'cart-customer',
      customerId: 'cust-1',
      anonymousId: undefined,
      lineItems: [
        {
          ...createCartFixture().lineItems[0],
          id: 'cust-line-1',
          quantity: 3,
          variant: {
            ...createCartFixture().lineItems[0].variant,
            sku: sharedSku,
          },
        },
      ],
    });
    const mergedCart = createCartFixture({
      id: 'cart-customer',
      customerId: 'cust-1',
      country: 'DE',
      anonymousId: undefined,
    });
    const cartWithItem = createCartFixture({
      id: 'cart-customer',
      customerId: 'cust-1',
      country: 'DE',
      anonymousId: undefined,
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: { results: [customerCart] } })
      .mockResolvedValueOnce({ body: mergedCart })
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: mergedCart })
      .mockResolvedValueOnce({ body: cartWithItem });

    await addLineItem('SKU-1', 1);

    expect(mockCartPost).toHaveBeenCalledWith({
      body: {
        version: customerCart.version,
        actions: [
          {
            action: 'changeLineItemQuantity',
            lineItemId: 'cust-line-1',
            quantity: 5,
          },
        ],
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

  it('reconcileCartOnAuth assigns guest cart to customer', async () => {
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-stale',
      cartId: 'cart-guest',
    });

    const guestCart = emptyGuestCart({ id: 'cart-guest', anonymousId: 'anon-old' });
    const assignedCart = emptyGuestCart({
      id: 'cart-guest',
      customerId: 'cust-1',
      anonymousId: undefined,
    });

    mockExecute
      .mockResolvedValueOnce({ body: guestCart })
      .mockResolvedValueOnce({ body: { results: [] } })
      .mockResolvedValueOnce({ body: assignedCart });

    await reconcileCartOnAuth('cust-1');

    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-new',
      cartId: 'cart-guest',
    });
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
  });
});
