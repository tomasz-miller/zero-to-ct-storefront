/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cart } from '@commercetools/platform-sdk';

const {
  mockRequireActiveCart,
  mockClearCartSession,
  mockGetStorefrontContext,
  cartGetExecute,
  cartPost,
  cartPostExecute,
  paymentPost,
  paymentPostExecute,
  orderPost,
  orderPostExecute,
  shippingGetExecute,
} = vi.hoisted(() => {
  const cartPostExecute = vi.fn();
  const paymentPostExecute = vi.fn();
  const orderPostExecute = vi.fn();
  const shippingGetExecute = vi.fn();
  const cartPost = vi.fn((args: unknown) => ({
    execute: () => cartPostExecute(args),
  }));
  const paymentPost = vi.fn((args: unknown) => ({
    execute: () => paymentPostExecute(args),
  }));
  const orderPost = vi.fn((args: unknown) => ({
    execute: () => orderPostExecute(args),
  }));

  return {
    mockRequireActiveCart: vi.fn(),
    mockClearCartSession: vi.fn(),
    mockGetStorefrontContext: vi.fn(),
    cartGetExecute: vi.fn(),
    cartPost,
    cartPostExecute,
    paymentPost,
    paymentPostExecute,
    orderPost,
    orderPostExecute,
    shippingGetExecute,
  };
});

vi.mock('./api-root', () => ({
  apiRoot: {
    carts: () => ({
      withId: () => ({
        get: () => ({ execute: cartGetExecute }),
        post: cartPost,
      }),
    }),
    payments: () => ({
      post: paymentPost,
    }),
    orders: () => ({
      post: orderPost,
    }),
    shippingMethods: () => ({
      matchingCart: () => ({
        get: () => ({ execute: shippingGetExecute }),
      }),
    }),
  },
}));

vi.mock('./cart', () => ({
  requireActiveCart: mockRequireActiveCart,
  CartAccessError: class CartAccessError extends Error {
    constructor(message = 'Cart access denied') {
      super(message);
      this.name = 'CartAccessError';
    }
  },
  CartNotFoundError: class CartNotFoundError extends Error {
    constructor(message = 'Cart not found') {
      super(message);
      this.name = 'CartNotFoundError';
    }
  },
}));

vi.mock('./cart-session', () => ({
  clearCartSession: mockClearCartSession,
}));

vi.mock('./storefront-context', () => ({
  getStorefrontContext: mockGetStorefrontContext,
}));

import { CartAccessError, CartNotFoundError } from './cart';
import {
  MOCK_PAYMENT_DELAY_MS,
  MockCheckoutError,
  MockPaymentsDisabledError,
  isMockPaymentsEnabled,
  mockCheckoutFailure,
  placeMockPayment,
  prepareMockCheckout,
} from './mock-payment';

const address = {
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  streetName: 'Demo Street',
  streetNumber: '1',
  postalCode: '10115',
  city: 'Berlin',
};

function createCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart-1',
    version: 3,
    cartState: 'Active',
    customerEmail: 'ada@example.com',
    shippingAddress: { country: 'DE' },
    lineItems: [{ id: 'line-1' }],
    totalPrice: {
      centAmount: 1000,
      currencyCode: 'EUR',
      type: 'centPrecision',
      fractionDigits: 2,
    },
    taxedPrice: {
      totalNet: {
        centAmount: 1000,
        currencyCode: 'EUR',
        type: 'centPrecision',
        fractionDigits: 2,
      },
      totalGross: {
        centAmount: 1190,
        currencyCode: 'EUR',
        type: 'centPrecision',
        fractionDigits: 2,
      },
      taxPortions: [],
      totalTax: {
        centAmount: 190,
        currencyCode: 'EUR',
        type: 'centPrecision',
        fractionDigits: 2,
      },
    },
    ...overrides,
  } as Cart;
}

function matchingShippingMethods() {
  return {
    body: {
      results: [
        {
          id: 'ship-1',
          name: 'Standard',
          localizedName: { 'en-GB': 'Standard delivery' },
          zoneRates: [
            {
              shippingRates: [
                {
                  isMatching: true,
                  price: { centAmount: 490, currencyCode: 'EUR' },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

describe('mock payments', () => {
  beforeEach(() => {
    vi.stubEnv('CTP_MOCK_PAYMENTS', 'true');
    mockRequireActiveCart.mockReset();
    mockClearCartSession.mockReset();
    mockGetStorefrontContext.mockReset();
    cartGetExecute.mockReset();
    cartPost.mockClear();
    cartPostExecute.mockReset();
    paymentPost.mockClear();
    paymentPostExecute.mockReset();
    orderPost.mockClear();
    orderPostExecute.mockReset();
    shippingGetExecute.mockReset();
    mockGetStorefrontContext.mockResolvedValue({
      country: 'DE',
      currency: 'EUR',
      locale: 'en-GB',
    });
    mockClearCartSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is disabled unless the env flag is exactly true', () => {
    expect(isMockPaymentsEnabled()).toBe(true);
    vi.stubEnv('CTP_MOCK_PAYMENTS', 'false');
    expect(isMockPaymentsEnabled()).toBe(false);
  });

  it('saves the market country on the cart and returns matching shipping methods', async () => {
    const cart = createCart();
    mockRequireActiveCart.mockResolvedValue(cart);
    cartGetExecute.mockResolvedValue({ body: cart });
    cartPostExecute.mockResolvedValue({ body: { ...cart, version: 4 } });
    shippingGetExecute.mockResolvedValue(matchingShippingMethods());

    const result = await prepareMockCheckout(address);

    expect(result.shippingMethods).toEqual([
      {
        id: 'ship-1',
        name: 'Standard delivery',
        price: { centAmount: 490, currencyCode: 'EUR' },
      },
    ]);
    expect(result.total).toEqual({ centAmount: 1190, currencyCode: 'EUR' });

    const update = cartPost.mock.calls[0]?.[0] as {
      body: {
        actions: Array<{
          action: string;
          address?: { country?: string };
        }>;
      };
    };
    expect(update.body.actions.map((action) => action.action)).toEqual([
      'setCustomerEmail',
      'setShippingAddress',
      'setBillingAddress',
    ]);
    expect(update.body.actions[1]?.address?.country).toBe('DE');
    expect(update.body.actions[2]?.address?.country).toBe('DE');
  });

  it('clears a shipping method already on the cart until the shopper chooses one', async () => {
    const cart = createCart({
      shippingInfo: {
        shippingMethodName: 'Standard Shipping',
        shippingMethod: { typeId: 'shipping-method', id: 'ship-1' },
        shippingMethodState: 'MatchesCart',
        price: {
          centAmount: 50000,
          currencyCode: 'EUR',
          type: 'centPrecision',
          fractionDigits: 2,
        },
        shippingRate: {
          price: {
            centAmount: 50000,
            currencyCode: 'EUR',
            type: 'centPrecision',
            fractionDigits: 2,
          },
          tiers: [],
        },
      },
    });
    mockRequireActiveCart.mockResolvedValue(cart);
    cartGetExecute.mockResolvedValue({ body: cart });
    cartPostExecute
      .mockResolvedValueOnce({ body: { ...cart, version: 4 } })
      .mockResolvedValueOnce({ body: createCart({ version: 5 }) });
    shippingGetExecute.mockResolvedValue(matchingShippingMethods());

    const result = await prepareMockCheckout(address);

    const clear = cartPost.mock.calls[1]?.[0] as {
      body: { actions: Array<{ action: string; shippingMethod?: unknown }> };
    };
    expect(clear.body.actions).toEqual([{ action: 'setShippingMethod' }]);
    expect(result.total).toEqual({ centAmount: 1190, currencyCode: 'EUR' });
  });

  it('explains a missing tax rate for the market country', async () => {
    const cart = createCart();
    mockRequireActiveCart.mockResolvedValue(cart);
    cartGetExecute.mockResolvedValue({ body: cart });
    cartPostExecute.mockRejectedValue({
      statusCode: 400,
      body: {
        errors: [
          {
            code: 'MissingTaxRateForCountry',
            message: 'Tax category is missing a tax rate for country DE.',
          },
        ],
      },
    });

    await expect(prepareMockCheckout(address)).rejects.toThrow(
      'This project has no tax rate for the selected market country.',
    );
  });

  it('charges the gross total after a provider delay and creates a paid order', async () => {
    const cart = createCart();
    const withShipping = createCart({ version: 4 });
    const withPayment = createCart({ version: 5 });
    const sleep = vi.fn().mockResolvedValue(undefined);
    mockRequireActiveCart.mockResolvedValue(cart);
    cartGetExecute.mockResolvedValue({ body: cart });
    shippingGetExecute.mockResolvedValue(matchingShippingMethods());
    cartPostExecute
      .mockResolvedValueOnce({ body: withShipping })
      .mockResolvedValueOnce({ body: withPayment });
    paymentPostExecute.mockResolvedValue({ body: { id: 'pay-1' } });
    orderPostExecute.mockResolvedValue({ body: { id: 'order-1' } });

    const result = await placeMockPayment({ shippingMethodId: 'ship-1' }, { sleep });

    expect(sleep).toHaveBeenCalledWith(MOCK_PAYMENT_DELAY_MS);
    expect(result).toEqual({ orderId: 'order-1' });

    const paymentDraft = paymentPost.mock.calls[0]?.[0] as {
      body: {
        amountPlanned: { centAmount: number };
        paymentMethodInfo: { paymentInterface: string; method: string };
        transactions: Array<{ type: string; state: string; amount: { centAmount: number } }>;
      };
    };
    expect(paymentDraft.body.amountPlanned.centAmount).toBe(1190);
    expect(paymentDraft.body.paymentMethodInfo).toEqual({
      paymentInterface: 'mock',
      method: 'card',
    });
    expect(paymentDraft.body.transactions[0]).toMatchObject({
      type: 'Charge',
      state: 'Success',
      amount: { centAmount: 1190, currencyCode: 'EUR' },
    });

    const orderDraft = orderPost.mock.calls[0]?.[0] as {
      body: { version: number; paymentState: string; cart: { id: string } };
    };
    expect(orderDraft.body).toMatchObject({
      version: 5,
      paymentState: 'Paid',
      cart: { typeId: 'cart', id: 'cart-1' },
    });
    expect(mockClearCartSession).toHaveBeenCalledOnce();
  });

  it('does not create a second payment when the cart already has a mock charge', async () => {
    const paidCart = createCart({
      paymentInfo: {
        payments: [
          {
            typeId: 'payment',
            id: 'pay-existing',
            obj: {
              id: 'pay-existing',
              paymentMethodInfo: { paymentInterface: 'mock' },
              amountPlanned: {
                centAmount: 1190,
                currencyCode: 'EUR',
                type: 'centPrecision',
                fractionDigits: 2,
              },
            },
          },
        ],
      },
    } as Partial<Cart>);
    const sleep = vi.fn().mockResolvedValue(undefined);
    mockRequireActiveCart.mockResolvedValue(paidCart);
    cartGetExecute.mockResolvedValue({ body: paidCart });
    shippingGetExecute.mockResolvedValue({ body: { results: [] } });
    orderPostExecute.mockResolvedValue({ body: { id: 'order-2' } });

    await placeMockPayment({}, { sleep });

    expect(paymentPost).not.toHaveBeenCalled();
    expect(cartPost).not.toHaveBeenCalled();
    expect(orderPost).toHaveBeenCalledOnce();
  });

  it('replaces a mock payment when the charged amount changed', async () => {
    const paidCart = createCart({
      paymentInfo: {
        payments: [
          {
            typeId: 'payment',
            id: 'pay-existing',
            obj: {
              id: 'pay-existing',
              paymentMethodInfo: { paymentInterface: 'mock' },
              amountPlanned: {
                centAmount: 500,
                currencyCode: 'EUR',
                type: 'centPrecision',
                fractionDigits: 2,
              },
            },
          },
        ],
      },
    } as Partial<Cart>);
    const sleep = vi.fn().mockResolvedValue(undefined);
    mockRequireActiveCart.mockResolvedValue(paidCart);
    cartGetExecute.mockResolvedValue({ body: paidCart });
    shippingGetExecute.mockResolvedValue({ body: { results: [] } });
    cartPostExecute.mockResolvedValue({ body: createCart({ version: 6 }) });
    paymentPostExecute.mockResolvedValue({ body: { id: 'pay-new' } });
    orderPostExecute.mockResolvedValue({ body: { id: 'order-3' } });

    await placeMockPayment({}, { sleep });

    const update = cartPost.mock.calls[0]?.[0] as {
      body: { actions: Array<{ action: string }> };
    };
    expect(update.body.actions.map((action) => action.action)).toEqual([
      'removePayment',
      'addPayment',
    ]);
    expect(paymentPost).toHaveBeenCalledOnce();
  });

  it('requires an email and shipping address before payment', async () => {
    const cart = createCart({
      customerEmail: undefined,
      shippingAddress: undefined,
    });
    const sleep = vi.fn().mockResolvedValue(undefined);
    mockRequireActiveCart.mockResolvedValue(cart);
    cartGetExecute.mockResolvedValue({ body: cart });

    await expect(placeMockPayment({}, { sleep })).rejects.toThrow(
      'Save your email and shipping address before paying',
    );
    expect(sleep).not.toHaveBeenCalled();
  });

  it('requires a matching shipping method when the project has one', async () => {
    const cart = createCart();
    mockRequireActiveCart.mockResolvedValue(cart);
    cartGetExecute.mockResolvedValue({ body: cart });
    shippingGetExecute.mockResolvedValue(matchingShippingMethods());

    await expect(placeMockPayment({}, { sleep: vi.fn() })).rejects.toBeInstanceOf(
      MockCheckoutError,
    );
    expect(cartPost).not.toHaveBeenCalled();
  });

  it('refuses to run when the flag is off', async () => {
    vi.stubEnv('CTP_MOCK_PAYMENTS', '');

    await expect(prepareMockCheckout(address)).rejects.toBeInstanceOf(
      MockPaymentsDisabledError,
    );
    expect(mockRequireActiveCart).not.toHaveBeenCalled();
  });
});

describe('mockCheckoutFailure', () => {
  it('maps known checkout errors to HTTP statuses', () => {
    expect(
      mockCheckoutFailure(new MockPaymentsDisabledError()),
    ).toEqual({ status: 404, error: 'Mock payments are disabled' });
    expect(mockCheckoutFailure(new MockCheckoutError('Email is required'))).toEqual({
      status: 400,
      error: 'Email is required',
    });
    expect(mockCheckoutFailure(new CartNotFoundError('Cart is empty'))).toEqual({
      status: 400,
      error: 'Cart is empty',
    });
    expect(mockCheckoutFailure(new CartAccessError())).toEqual({
      status: 403,
      error: 'Cart access denied',
    });
    expect(mockCheckoutFailure(new Error('boom'))).toBeNull();
  });
});
