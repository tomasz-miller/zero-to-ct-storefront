import 'server-only';

import type {
  Cart,
  CartUpdateAction,
  Money,
  ShippingMethod,
} from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import {
  CartAccessError,
  CartNotFoundError,
  requireActiveCart,
} from './cart';
import { clearCartSession } from './cart-session';
import { pickLocalized } from './product-mappers';
import { getStorefrontContext } from './storefront-context';

export const MOCK_PAYMENT_DELAY_MS = 2000;
export const MOCK_PAYMENT_INTERFACE = 'mock';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CART_EXPAND = ['paymentInfo.payments[*]'] as const;

export class MockPaymentsDisabledError extends Error {
  constructor(message = 'Mock payments are disabled') {
    super(message);
    this.name = 'MockPaymentsDisabledError';
  }
}

export class MockCheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockCheckoutError';
  }
}

export type MockCheckoutAddressInput = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  streetName?: unknown;
  streetNumber?: unknown;
  postalCode?: unknown;
  city?: unknown;
};

export type MockPayableTotal = {
  centAmount: number;
  currencyCode: string;
};

export type MockShippingMethodOption = {
  id: string;
  name: string;
  price: MockPayableTotal;
};

type MockCheckoutAddress = {
  email: string;
  firstName: string;
  lastName: string;
  streetName: string;
  streetNumber?: string;
  postalCode: string;
  city: string;
};

type PlaceMockPaymentInput = {
  shippingMethodId?: string;
};

type PlaceMockPaymentDeps = {
  sleep?: (ms: number) => Promise<void>;
};

type CommercetoolsErrorBody = {
  message?: string;
  errors?: Array<{ code?: string; message?: string }>;
};

export function isMockPaymentsEnabled(): boolean {
  return process.env.CTP_MOCK_PAYMENTS === 'true';
}

export function mockCheckoutFailure(
  error: unknown,
): { status: number; error: string } | null {
  if (error instanceof MockPaymentsDisabledError) {
    return { status: 404, error: error.message };
  }

  if (error instanceof MockCheckoutError || error instanceof CartNotFoundError) {
    return { status: 400, error: error.message };
  }

  if (error instanceof CartAccessError) {
    return { status: 403, error: 'Cart access denied' };
  }

  return null;
}

export async function prepareMockCheckout(
  input: MockCheckoutAddressInput,
): Promise<{
  shippingMethods: MockShippingMethodOption[];
  total: MockPayableTotal;
}> {
  assertMockPaymentsEnabled();

  const address = parseAddress(input);
  const { country, locale } = await getStorefrontContext();
  const cart = await loadExpandedActiveCart();
  let updated = await updateCart(cart, [
    { action: 'setCustomerEmail', email: address.email },
    {
      action: 'setShippingAddress',
      address: toCartAddress(address, country),
    },
    {
      action: 'setBillingAddress',
      address: toCartAddress(address, country),
    },
  ]);
  const shippingMethods = await listMatchingShippingMethods(updated.id, locale);

  if (shippingMethods.length > 0 && updated.shippingInfo?.shippingMethod) {
    updated = await updateCart(updated, [{ action: 'setShippingMethod' }]);
  }

  return {
    shippingMethods,
    total: chargeAmount(updated),
  };
}

export async function applyMockShippingMethod(
  shippingMethodId: string,
): Promise<{ total: MockPayableTotal }> {
  assertMockPaymentsEnabled();

  const { locale } = await getStorefrontContext();
  let cart = await loadExpandedActiveCart();
  assertCartReadyForPayment(cart);
  cart = await setShippingMethodIfNeeded(cart, shippingMethodId, locale);

  return { total: chargeAmount(cart) };
}

export async function placeMockPayment(
  input: PlaceMockPaymentInput,
  deps: PlaceMockPaymentDeps = {},
): Promise<{ orderId: string }> {
  assertMockPaymentsEnabled();

  const { locale } = await getStorefrontContext();
  let cart = await loadExpandedActiveCart();
  assertCartReadyForPayment(cart);
  const shippingMethodId = input.shippingMethodId?.trim();

  if (shippingMethodId) {
    cart = await setShippingMethodIfNeeded(cart, shippingMethodId, locale);
  } else {
    const methods = await listMatchingShippingMethods(cart.id, locale);
    if (methods.length > 0) {
      throw new MockCheckoutError('Select a shipping method');
    }
  }

  await (deps.sleep ?? delay)(MOCK_PAYMENT_DELAY_MS);
  cart = await ensureMockPayment(cart);

  const order = await executeCommercetools(() =>
    apiRoot
      .orders()
      .post({
        body: {
          cart: { typeId: 'cart', id: cart.id },
          version: cart.version,
          paymentState: 'Paid',
        },
      })
      .execute(),
  );

  await clearCartSession();

  return { orderId: order.body.id };
}

function assertMockPaymentsEnabled(): void {
  if (!isMockPaymentsEnabled()) {
    throw new MockPaymentsDisabledError();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseAddress(input: MockCheckoutAddressInput): MockCheckoutAddress {
  const email = requiredText(input.email, 'Email');
  if (!EMAIL_PATTERN.test(email)) {
    throw new MockCheckoutError('Enter a valid email');
  }

  const streetNumber = optionalText(input.streetNumber);

  return {
    email,
    firstName: requiredText(input.firstName, 'First name'),
    lastName: requiredText(input.lastName, 'Last name'),
    streetName: requiredText(input.streetName, 'Street'),
    streetNumber,
    postalCode: requiredText(input.postalCode, 'Postal code'),
    city: requiredText(input.city, 'City'),
  };
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new MockCheckoutError(`${label} is required`);
  }

  return value.trim();
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toCartAddress(address: MockCheckoutAddress, country: string) {
  return {
    email: address.email,
    firstName: address.firstName,
    lastName: address.lastName,
    streetName: address.streetName,
    streetNumber: address.streetNumber,
    postalCode: address.postalCode,
    city: address.city,
    country,
  };
}

async function loadExpandedActiveCart(): Promise<Cart> {
  const cart = await requireActiveCart();
  const response = await executeCommercetools(() =>
    apiRoot
      .carts()
      .withId({ ID: cart.id })
      .get({
        queryArgs: {
          expand: [...CART_EXPAND],
        },
      })
      .execute(),
  );

  if (response.body.lineItems.length === 0) {
    throw new CartNotFoundError('Cart is empty');
  }

  if (response.body.cartState !== 'Active') {
    throw new CartNotFoundError('Cart is not active');
  }

  return response.body;
}

async function updateCart(
  cart: Cart,
  actions: CartUpdateAction[],
): Promise<Cart> {
  const response = await executeCommercetools(() =>
    apiRoot
      .carts()
      .withId({ ID: cart.id })
      .post({
        body: {
          version: cart.version,
          actions,
        },
        queryArgs: {
          expand: [...CART_EXPAND],
        },
      })
      .execute(),
  );

  return response.body;
}

async function listMatchingShippingMethods(
  cartId: string,
  locale: string,
): Promise<MockShippingMethodOption[]> {
  const response = await executeCommercetools(() =>
    apiRoot
      .shippingMethods()
      .matchingCart()
      .get({
        queryArgs: { cartId },
      })
      .execute(),
  );

  return response.body.results.flatMap((method) => {
    const price = matchingRatePrice(method);
    if (!price) {
      return [];
    }

    return [
      {
        id: method.id,
        name: pickLocalized(method.localizedName, locale) ?? method.name,
        price,
      },
    ];
  });
}

function matchingRatePrice(
  method: ShippingMethod,
): MockShippingMethodOption['price'] | undefined {
  for (const zoneRate of method.zoneRates) {
    const match = zoneRate.shippingRates.find((rate) => rate.isMatching);
    if (match) {
      return {
        centAmount: match.price.centAmount,
        currencyCode: match.price.currencyCode,
      };
    }
  }

  const fallback = method.zoneRates[0]?.shippingRates[0]?.price;
  if (!fallback) {
    return undefined;
  }

  return {
    centAmount: fallback.centAmount,
    currencyCode: fallback.currencyCode,
  };
}

function assertCartReadyForPayment(cart: Cart): void {
  if (!cart.customerEmail || !cart.shippingAddress?.country) {
    throw new MockCheckoutError(
      'Save your email and shipping address before paying',
    );
  }
}

async function setShippingMethodIfNeeded(
  cart: Cart,
  shippingMethodId: string,
  locale: string,
): Promise<Cart> {
  const methods = await listMatchingShippingMethods(cart.id, locale);
  if (!methods.some((method) => method.id === shippingMethodId)) {
    throw new MockCheckoutError('Select a shipping method');
  }

  if (cart.shippingInfo?.shippingMethod?.id === shippingMethodId) {
    return cart;
  }

  return updateCart(cart, [
    {
      action: 'setShippingMethod',
      shippingMethod: {
        typeId: 'shipping-method',
        id: shippingMethodId,
      },
    },
  ]);
}

async function ensureMockPayment(cart: Cart): Promise<Cart> {
  const amount = chargeAmount(cart);
  const existing = findMockPayment(cart);
  if (existing && sameMoney(existing.amount, amount)) {
    return cart;
  }

  const payment = await executeCommercetools(() =>
    apiRoot
      .payments()
      .post({
        body: {
          amountPlanned: amount,
          paymentMethodInfo: {
            paymentInterface: MOCK_PAYMENT_INTERFACE,
            method: 'card',
          },
          transactions: [
            {
              type: 'Charge',
              amount,
              state: 'Success',
            },
          ],
        },
      })
      .execute(),
  );

  const actions: CartUpdateAction[] = [];
  if (existing) {
    actions.push({
      action: 'removePayment',
      payment: {
        typeId: 'payment',
        id: existing.id,
      },
    });
  }
  actions.push({
    action: 'addPayment',
    payment: {
      typeId: 'payment',
      id: payment.body.id,
    },
  });

  return updateCart(cart, actions);
}

function findMockPayment(
  cart: Cart,
): { id: string; amount?: Money } | undefined {
  const payment = cart.paymentInfo?.payments?.find(
    (entry) =>
      entry.obj?.paymentMethodInfo?.paymentInterface === MOCK_PAYMENT_INTERFACE,
  )?.obj;

  if (!payment) {
    return undefined;
  }

  return {
    id: payment.id,
    amount: payment.amountPlanned,
  };
}

function sameMoney(left: Money | undefined, right: Money): boolean {
  return (
    left?.centAmount === right.centAmount &&
    left.currencyCode === right.currencyCode
  );
}

function chargeAmount(cart: Cart): Money {
  const gross = cart.taxedPrice?.totalGross ?? cart.totalPrice;

  return {
    centAmount: gross.centAmount,
    currencyCode: gross.currencyCode,
  };
}

async function executeCommercetools<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const mapped = mapCommercetoolsError(error);
    if (mapped) {
      throw mapped;
    }

    throw error;
  }
}

function mapCommercetoolsError(error: unknown): MockCheckoutError | null {
  if (typeof error !== 'object' || error === null || !('body' in error)) {
    return null;
  }

  const statusCode =
    'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : undefined;
  const body = error.body as CommercetoolsErrorBody | undefined;
  const code = body?.errors?.[0]?.code;
  const message = body?.errors?.[0]?.message ?? body?.message;

  if (code === 'MissingTaxRateForCountry') {
    return new MockCheckoutError(
      'This project has no tax rate for the selected market country.',
    );
  }

  if (statusCode === 400 && message) {
    return new MockCheckoutError(message);
  }

  return null;
}
