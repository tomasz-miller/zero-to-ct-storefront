import 'server-only';

import type {
  Cart,
  CartUpdateAction,
  Money,
  ShippingMethod,
} from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import { requireActiveCart } from './cart';
import { clearCartSession } from './cart-session';
import {
  getCtCorrelationId,
  getCtErrorObjects,
  isCtConcurrentModification,
  parseCtError,
} from './ct-errors';
import {
  CartNotFoundError,
  MockCheckoutConflictError,
  MockCheckoutError,
  MockPaymentsDisabledError,
} from './domain-errors';
import { setLastOrderSession } from './last-order-session';
import { createOrderNumber } from './order-number';
import { pickLocalized } from './product-mappers';
import { getStorefrontContext } from './storefront-context';
import { isValidEmail } from '@/lib/auth-validation';

export const MOCK_PAYMENT_DELAY_MS = 2000;
export const MOCK_PAYMENT_INTERFACE = 'mock';

const CART_EXPAND = ['paymentInfo.payments[*]'] as const;

export {
  MockCheckoutConflictError,
  MockCheckoutError,
  MockPaymentsDisabledError,
};

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

let loggedEnabled = false;
let loggedMismatch = false;

/**
 * Mock payments need both the flag and an explicit opt-in naming the project
 * they are allowed to run against, so a copied env file cannot switch them on
 * in another project.
 */
export function isMockPaymentsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.CTP_MOCK_PAYMENTS !== 'true') {
    return false;
  }

  const optIn = env.CTP_MOCK_PAYMENTS_PROJECT_KEY;
  if (!optIn || optIn !== env.CTP_PROJECT_KEY) {
    if (!loggedMismatch) {
      loggedMismatch = true;
      console.error(
        '[mock-payments] CTP_MOCK_PAYMENTS is true but CTP_MOCK_PAYMENTS_PROJECT_KEY does not match CTP_PROJECT_KEY; mock payments stay disabled',
      );
    }
    return false;
  }

  if (!loggedEnabled) {
    loggedEnabled = true;
    console.warn('[mock-payments] enabled for project', optIn);
  }
  return true;
}

export function mockPaymentKey(cartId: string, amount: Money): string {
  return `mock-${cartId}-${amount.centAmount}-${amount.currencyCode}`;
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
): Promise<{ orderId: string; orderNumber: string }> {
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
  cart = await loadExpandedActiveCart();
  assertCartReadyForPayment(cart);
  cart = await ensureMockPayment(cart);

  const orderNumber = createOrderNumber();
  const order = await executeCommercetools(() =>
    apiRoot
      .orders()
      .post({
        body: {
          cart: { typeId: 'cart', id: cart.id },
          version: cart.version,
          orderNumber,
          paymentState: 'Paid',
        },
      })
      .execute(),
  );

  await setLastOrderSession({ orderNumber, cartId: cart.id });
  await clearCartSession();

  return { orderId: order.body.id, orderNumber };
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
  if (!isValidEmail(email)) {
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

  const key = mockPaymentKey(cart.id, amount);
  const payment = await executeCommercetools(async () => {
    try {
      const created = await apiRoot
        .payments()
        .post({
          body: {
            key,
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
        .execute();
      return created.body;
    } catch (error) {
      if (parseCtError(error).code !== 'DuplicateField') {
        throw error;
      }

      const found = await apiRoot.payments().withKey({ key }).get().execute();
      return found.body;
    }
  });

  const actions: CartUpdateAction[] = [];
  const replaced = existing && existing.id !== payment.id ? existing : undefined;
  if (replaced) {
    actions.push({
      action: 'removePayment',
      payment: {
        typeId: 'payment',
        id: replaced.id,
      },
    });
  }
  const alreadyOnCart = cart.paymentInfo?.payments?.some(
    (entry) => entry.id === payment.id,
  );
  if (!alreadyOnCart) {
    actions.push({
      action: 'addPayment',
      payment: {
        typeId: 'payment',
        id: payment.id,
      },
    });
  }

  if (actions.length === 0) {
    return cart;
  }

  const updated = await updateCart(cart, actions);
  if (replaced) {
    await deleteReplacedPayment(replaced);
  }

  return updated;
}

async function deleteReplacedPayment(payment: {
  id: string;
  version?: number;
}): Promise<void> {
  if (payment.version === undefined) {
    return;
  }

  try {
    await apiRoot
      .payments()
      .withId({ ID: payment.id })
      .delete({ queryArgs: { version: payment.version } })
      .execute();
  } catch (error) {
    console.warn('[mock-payment] could not delete replaced payment', {
      paymentId: payment.id,
      code: parseCtError(error).code,
    });
  }
}

function findMockPayment(
  cart: Cart,
): { id: string; version?: number; amount?: Money } | undefined {
  const payment = cart.paymentInfo?.payments?.find(
    (entry) =>
      entry.obj?.paymentMethodInfo?.paymentInterface === MOCK_PAYMENT_INTERFACE,
  )?.obj;

  if (!payment) {
    return undefined;
  }

  return {
    id: payment.id,
    version: payment.version,
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

function mapCommercetoolsError(
  error: unknown,
): MockCheckoutConflictError | MockCheckoutError | null {
  if (isCtConcurrentModification(error)) {
    return new MockCheckoutConflictError();
  }

  if (
    getCtErrorObjects(error).some(
      (entry) => entry.code === 'MissingTaxRateForCountry',
    )
  ) {
    return new MockCheckoutError(
      'This project has no tax rate for the selected market country.',
    );
  }

  const { statusCode, code } = parseCtError(error);
  if (statusCode === 400) {
    console.warn('[mock-payment]', {
      code,
      ctCorrelationId: getCtCorrelationId(error),
    });
    return new MockCheckoutError(
      'Checkout could not be completed. Please review your details and try again.',
    );
  }

  return null;
}
