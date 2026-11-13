/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cart } from '@commercetools/platform-sdk';

const {
  mockRequireActiveCart,
  mockClearCartSession,
  mockSetLastOrderSession,
  mockGetStorefrontContext,
  cartGetExecute,
  cartPost,
  cartPostExecute,
  paymentPost,
  paymentPostExecute,
  orderPost,
  orderPostExecute,
  shippingGetExecute,
  paymentByKeyExecute,
  paymentDeleteExecute,
  paymentDelete,
} = vi.hoisted(() => {
  const cartPostExecute = vi.fn();
  const paymentPostExecute = vi.fn();
  const orderPostExecute = vi.fn();
  const shippingGetExecute = vi.fn();
  const paymentByKeyExecute = vi.fn();
  const paymentDeleteExecute = vi.fn();
  const paymentDelete = vi.fn((args: unknown) => ({
    execute: () => paymentDeleteExecute(args),
  }));
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
    mockSetLastOrderSession: vi.fn(),
    mockGetStorefrontContext: vi.fn(),
    cartGetExecute: vi.fn(),
    cartPost,
    cartPostExecute,
    paymentPost,
    paymentPostExecute,
    orderPost,
    orderPostExecute,
    shippingGetExecute,
    paymentByKeyExecute,
    paymentDeleteExecute,
    paymentDelete,
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
      withKey: ({ key }: { key: string }) => ({
        get: () => ({ execute: () => paymentByKeyExecute(key) }),
      }),
      withId: ({ ID }: { ID: string }) => ({
        delete: (args: unknown) => paymentDelete({ ID, ...(args as object) }),
      }),
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
}));

vi.mock('./cart-session', () => ({
  clearCartSession: mockClearCartSession,
}));

vi.mock('./last-order-session', () => ({
  setLastOrderSession: mockSetLastOrderSession,
}));

vi.mock('./order-number', () => ({
  createOrderNumber: () => 'ZT-20261113-0000ABCD',
}));

vi.mock('./storefront-context', () => ({
  getStorefrontContext: mockGetStorefrontContext,
}));

import {
  MOCK_PAYMENT_DELAY_MS,
  MockCheckoutConflictError,
  MockCheckoutError,
  MockPaymentsDisabledError,
  isMockPaymentsEnabled,
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

function ctError(statusCode: number, code: string, message = 'm') {
  return Object.assign(new Error(message), {
    statusCode,
    body: { statusCode, message, errors: [{ code, message }] },
  });
}

// The arrangement of the 'charges the gross total after a provider delay and creates a paid order' test.
function arrangeReadyCart(): Cart {
  const cart = createCart();
  mockRequireActiveCart.mockResolvedValue(cart);
  cartGetExecute.mockResolvedValue({ body: cart });
  shippingGetExecute.mockResolvedValue(matchingShippingMethods());
  cartPostExecute
    .mockResolvedValueOnce({ body: createCart({ version: 4 }) })
    .mockResolvedValueOnce({ body: createCart({ version: 5 }) });
  paymentPostExecute.mockResolvedValue({ body: { id: 'pay-1' } });
  orderPostExecute.mockResolvedValue({ body: { id: 'order-1' } });
  return cart;
}

// The arrangement of the 'replaces a mock payment when the charged amount changed' test,
// with version 2 on the expanded pay-existing payment so the delete can send it.
function arrangeChangedAmountCart(): Cart {
  const paidCart = createCart({
    paymentInfo: {
      payments: [
        {
          typeId: 'payment',
          id: 'pay-existing',
          obj: {
            id: 'pay-existing',
            version: 2,
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
  mockRequireActiveCart.mockResolvedValue(paidCart);
  cartGetExecute.mockResolvedValue({ body: paidCart });
  shippingGetExecute.mockResolvedValue({ body: { results: [] } });
  cartPostExecute.mockResolvedValue({ body: createCart({ version: 6 }) });
  paymentPostExecute.mockResolvedValue({ body: { id: 'pay-new' } });
  orderPostExecute.mockResolvedValue({ body: { id: 'order-3' } });
  paymentDeleteExecute.mockResolvedValue({ body: {} });
  return paidCart;
}

describe('mock payments', () => {
  beforeEach(() => {
    vi.stubEnv('CTP_MOCK_PAYMENTS', 'true');
    vi.stubEnv('CTP_PROJECT_KEY', 'demo');
    vi.stubEnv('CTP_MOCK_PAYMENTS_PROJECT_KEY', 'demo');
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
    paymentByKeyExecute.mockReset();
    paymentDeleteExecute.mockReset();
    paymentDelete.mockClear();
    mockGetStorefrontContext.mockResolvedValue({
      country: 'DE',
      currency: 'EUR',
      locale: 'en-GB',
    });
    mockClearCartSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('is disabled unless the env flag is exactly true', () => {
    expect(isMockPaymentsEnabled()).toBe(true);
    vi.stubEnv('CTP_MOCK_PAYMENTS', 'false');
    expect(isMockPaymentsEnabled()).toBe(false);
  });

  it('stays disabled unless the project key opt-in matches', () => {
    expect(isMockPaymentsEnabled({ CTP_MOCK_PAYMENTS: 'true', CTP_PROJECT_KEY: 'p', CTP_MOCK_PAYMENTS_PROJECT_KEY: 'p' } as never)).toBe(true);
    expect(isMockPaymentsEnabled({ CTP_MOCK_PAYMENTS: 'true', CTP_PROJECT_KEY: 'p', CTP_MOCK_PAYMENTS_PROJECT_KEY: 'other' } as never)).toBe(false);
    expect(isMockPaymentsEnabled({ CTP_MOCK_PAYMENTS: 'true', CTP_PROJECT_KEY: 'p' } as never)).toBe(false);
    expect(isMockPaymentsEnabled({ CTP_MOCK_PAYMENTS: 'false', CTP_PROJECT_KEY: 'p', CTP_MOCK_PAYMENTS_PROJECT_KEY: 'p' } as never)).toBe(false);
  });

  it('creates the payment with a deterministic key', async () => {
    arrangeReadyCart();
    await placeMockPayment({ shippingMethodId: 'ship-1' }, { sleep: vi.fn().mockResolvedValue(undefined) });
    expect(paymentPost.mock.calls[0]?.[0]).toMatchObject({ body: { key: 'mock-cart-1-1190-EUR' } });
  });

  it('reuses an existing payment when the key already exists', async () => {
    const cartWithPayment = createCart({ version: 5, paymentInfo: { payments: [{ typeId: 'payment', id: 'pay-1' }] } } as Partial<Cart>);
    mockRequireActiveCart.mockResolvedValue(createCart());
    cartGetExecute.mockResolvedValueOnce({ body: createCart() }).mockResolvedValue({ body: cartWithPayment });
    shippingGetExecute.mockResolvedValue({ body: { results: [] } });
    paymentPostExecute.mockRejectedValue(ctError(400, 'DuplicateField'));
    paymentByKeyExecute.mockResolvedValue({ body: { id: 'pay-1', version: 1 } });
    orderPostExecute.mockResolvedValue({ body: { id: 'order-1' } });
    await placeMockPayment({}, { sleep: vi.fn().mockResolvedValue(undefined) });
    const actions = cartPost.mock.calls.flatMap(([args]) => (args as { body: { actions: Array<{ action: string }> } }).body.actions.map((a) => a.action));
    expect(actions).not.toContain('addPayment');
    expect(orderPost).toHaveBeenCalledOnce();
  });

  it('reloads the cart after the provider delay', async () => {
    mockRequireActiveCart.mockResolvedValue(createCart());
    cartGetExecute.mockResolvedValueOnce({ body: createCart({ version: 3 }) }).mockResolvedValue({ body: createCart({ version: 7 }) });
    shippingGetExecute.mockResolvedValue({ body: { results: [] } });
    cartPostExecute.mockResolvedValue({ body: createCart({ version: 8 }) });
    paymentPostExecute.mockResolvedValue({ body: { id: 'pay-1' } });
    orderPostExecute.mockResolvedValue({ body: { id: 'order-1' } });
    await placeMockPayment({}, { sleep: vi.fn().mockResolvedValue(undefined) });
    expect(cartGetExecute).toHaveBeenCalledTimes(2);
    expect((cartPost.mock.calls[0]?.[0] as { body: { version: number } }).body.version).toBe(7);
  });

  it('maps a concurrent modification on order creation to MockCheckoutConflictError', async () => {
    arrangeReadyCart();
    orderPostExecute.mockRejectedValue(ctError(409, 'ConcurrentModification'));
    const err = await placeMockPayment({ shippingMethodId: 'ship-1' }, { sleep: vi.fn().mockResolvedValue(undefined) }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MockCheckoutConflictError);
    expect(err).toMatchObject({ status: 409 });
  });

  it('does not forward commercetools 400 messages', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    arrangeReadyCart();
    orderPostExecute.mockRejectedValue(ctError(400, 'InvalidOperation', 'internal detail'));
    const err = await placeMockPayment({ shippingMethodId: 'ship-1' }, { sleep: vi.fn().mockResolvedValue(undefined) }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MockCheckoutError);
    expect((err as Error).message).toBe('Checkout could not be completed. Please review your details and try again.');
  });

  it('deletes the replaced mock payment', async () => {
    arrangeChangedAmountCart();
    await placeMockPayment({}, { sleep: vi.fn().mockResolvedValue(undefined) });
    expect(paymentDelete).toHaveBeenCalledWith({ ID: 'pay-existing', queryArgs: { version: 2 } });
  });

  it('logs and continues when deleting the replaced payment fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    arrangeChangedAmountCart();
    paymentDeleteExecute.mockRejectedValue(ctError(409, 'ConcurrentModification'));
    await expect(placeMockPayment({}, { sleep: vi.fn().mockResolvedValue(undefined) })).resolves.toMatchObject({ orderId: 'order-3' });
    expect(JSON.stringify(warn.mock.calls)).toContain('pay-existing');
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
    const cart = arrangeReadyCart();
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await placeMockPayment({ shippingMethodId: 'ship-1' }, { sleep });

    expect(sleep).toHaveBeenCalledWith(MOCK_PAYMENT_DELAY_MS);
    expect(orderPost).toHaveBeenCalledWith({ body: expect.objectContaining({ orderNumber: 'ZT-20261113-0000ABCD' }) });
    expect(mockSetLastOrderSession).toHaveBeenCalledWith({ orderNumber: 'ZT-20261113-0000ABCD', cartId: cart.id });
    expect(result).toEqual({ orderId: 'order-1', orderNumber: 'ZT-20261113-0000ABCD' });

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
    arrangeChangedAmountCart();
    const sleep = vi.fn().mockResolvedValue(undefined);

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
