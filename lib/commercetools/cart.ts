import 'server-only';

import type { Cart, CartUpdateAction } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import {
  DiscountCodeNotApplicableError,
  InvalidDiscountCodeError,
  mapDiscountCodeCartError,
} from './cart-discount-errors';
import { mapCart, type StorefrontCart } from './cart-mappers';
import {
  clearCartSession,
  createAnonymousId,
  getCartSession,
  setCartSession,
  type CartSession,
} from './cart-session';
import { getCustomerSession } from './customer-session';
import { getStorefrontContext } from './storefront-context';
import { getProductAvailabilityBySku } from './products';

export class CartAccessError extends Error {
  constructor(message = 'Cart access denied') {
    super(message);
    this.name = 'CartAccessError';
  }
}

export class CartNotFoundError extends Error {
  constructor(message = 'Cart not found') {
    super(message);
    this.name = 'CartNotFoundError';
  }
}

export class OutOfStockError extends Error {
  constructor(message = 'This product is out of stock') {
    super(message);
    this.name = 'OutOfStockError';
  }
}

async function fetchCartById(cartId: string): Promise<Cart | null> {
  try {
    const response = await apiRoot
      .carts()
      .withId({ ID: cartId })
      .get({
        queryArgs: {
          expand: ['discountCodes[*].discountCode'],
        },
      })
      .execute();
    return response.body;
  } catch {
    return null;
  }
}

export function canAccessCart(
  cart: Cart,
  session: CartSession,
  customerId?: string,
): boolean {
  if (customerId && cart.customerId === customerId) {
    return true;
  }

  if (cart.customerId) {
    return false;
  }

  return cart.anonymousId === session.anonymousId;
}

export function verifyCartOwnership(
  cart: Cart,
  anonymousId: string,
  customerId?: string,
): void {
  if (canAccessCart(cart, { anonymousId, cartId: cart.id }, customerId)) {
    return;
  }

  throw new CartAccessError();
}

function cartMatchesStorefront(cart: Cart): boolean {
  const { currency, country } = getStorefrontContext();
  return cart.country === country && cart.totalPrice.currencyCode === currency;
}

async function alignCartWithStorefront(cart: Cart): Promise<Cart> {
  if (cartMatchesStorefront(cart)) {
    return cart;
  }

  const { currency, country } = getStorefrontContext();

  if (cart.customerId) {
    if (cart.lineItems.length > 0 || cart.totalPrice.currencyCode !== currency) {
      return cart;
    }

    const response = await apiRoot
      .carts()
      .withId({ ID: cart.id })
      .post({
        body: {
          version: cart.version,
          actions: [{ action: 'setCountry', country }],
        },
      })
      .execute();

    return response.body;
  }

  const anonymousId = cart.anonymousId;

  if (!anonymousId) {
    throw new CartAccessError('Cart is missing anonymousId');
  }

  if (cart.lineItems.length > 0 || cart.totalPrice.currencyCode !== currency) {
    return createGuestCart(anonymousId);
  }

  const response = await apiRoot
    .carts()
    .withId({ ID: cart.id })
    .post({
      body: {
        version: cart.version,
        actions: [{ action: 'setCountry', country }],
      },
    })
    .execute();

  return response.body;
}

async function loadOwnedCart(session: CartSession): Promise<Cart | null> {
  const cart = await fetchCartById(session.cartId);
  if (!cart) {
    await clearCartSession();
    return null;
  }

  const customerSession = await getCustomerSession();
  if (!canAccessCart(cart, session, customerSession?.customerId)) {
    await clearCartSession();
    return null;
  }

  const aligned = await alignCartWithStorefront(cart);
  if (aligned.id !== session.cartId) {
    await setCartSession({ anonymousId: session.anonymousId, cartId: aligned.id });
  }

  return aligned;
}

export async function getGuestCart(): Promise<StorefrontCart | null> {
  const existing = await getCartSession();
  if (!existing) {
    return null;
  }

  try {
    const { cart } = await loadResolvedCartIfSessionExists();
    return mapCart(cart, getStorefrontContext().locale);
  } catch {
    return null;
  }
}

async function createGuestCart(anonymousId: string): Promise<Cart> {
  const { currency, country, locale } = getStorefrontContext();

  const response = await apiRoot
    .carts()
    .post({
      body: {
        currency,
        country,
        locale,
        anonymousId,
      },
    })
    .execute();

  return response.body;
}

export async function findCustomerCart(customerId: string): Promise<Cart | null> {
  const response = await apiRoot
    .carts()
    .get({
      queryArgs: {
        where: `customerId="${customerId}" and cartState="Active"`,
        limit: 1,
        sort: 'lastModifiedAt desc',
      },
    })
    .execute();

  return response.body.results[0] ?? null;
}

async function createCustomerCart(customerId: string): Promise<Cart> {
  const { currency, country, locale } = getStorefrontContext();

  const response = await apiRoot
    .carts()
    .post({
      body: {
        currency,
        country,
        locale,
        customerId,
      },
    })
    .execute();

  return response.body;
}

async function assignCartToCustomer(cart: Cart, customerId: string): Promise<Cart> {
  const response = await apiRoot
    .carts()
    .withId({ ID: cart.id })
    .post({
      body: {
        version: cart.version,
        actions: [{ action: 'setCustomerId', customerId }],
      },
    })
    .execute();

  return response.body;
}

async function mergeAnonymousCartIntoCustomerCart(
  guestCart: Cart,
  customerCart: Cart,
): Promise<Cart> {
  if (guestCart.lineItems.length === 0) {
    return customerCart;
  }

  const customerSkus = new Map(
    customerCart.lineItems
      .filter((item) => item.variant?.sku)
      .map((item) => [
        item.variant!.sku!,
        { lineItemId: item.id, quantity: item.quantity },
      ]),
  );

  const actions: CartUpdateAction[] = [];

  for (const item of guestCart.lineItems) {
    const sku = item.variant?.sku;
    if (!sku) {
      continue;
    }

    const existing = customerSkus.get(sku);
    if (existing) {
      actions.push({
        action: 'changeLineItemQuantity',
        lineItemId: existing.lineItemId,
        quantity: existing.quantity + item.quantity,
      });
      existing.quantity += item.quantity;
    } else {
      actions.push({
        action: 'addLineItem',
        sku,
        quantity: item.quantity,
      });
    }
  }

  if (actions.length === 0) {
    return customerCart;
  }

  const response = await apiRoot
    .carts()
    .withId({ ID: customerCart.id })
    .post({
      body: {
        version: customerCart.version,
        actions,
      },
    })
    .execute();

  const mergedCart = response.body;

  if (guestCart.id !== customerCart.id && guestCart.lineItems.length > 0) {
    await apiRoot
      .carts()
      .withId({ ID: guestCart.id })
      .post({
        body: {
          version: guestCart.version,
          actions: guestCart.lineItems.map((item) => ({
            action: 'removeLineItem' as const,
            lineItemId: item.id,
          })),
        },
      })
      .execute()
      .catch(() => undefined);
  }

  return mergedCart;
}

async function resolveAnonymousCartForCustomer(
  customerId: string,
  anonymousCart: Cart,
): Promise<Cart> {
  if (anonymousCart.customerId === customerId) {
    return anonymousCart;
  }

  const existingCustomerCart = await findCustomerCart(customerId);
  if (!existingCustomerCart || existingCustomerCart.id === anonymousCart.id) {
    return assignCartToCustomer(anonymousCart, customerId);
  }

  return mergeAnonymousCartIntoCustomerCart(anonymousCart, existingCustomerCart);
}

async function persistCartSession(anonymousId: string, cart: Cart): Promise<CartSession> {
  const session = { anonymousId, cartId: cart.id };
  await setCartSession(session);
  return session;
}

export async function restoreCustomerCartSession(customerId: string): Promise<void> {
  const customerCart = await findCustomerCart(customerId);
  if (!customerCart) {
    return;
  }

  await setCartSession({
    anonymousId: createAnonymousId(),
    cartId: customerCart.id,
  });
}

/** Assign or merge a guest cart to the customer after sign-in/sign-up. */
export async function reconcileCartOnAuth(customerId: string): Promise<void> {
  const existing = await getCartSession();
  if (existing) {
    const cart = await fetchCartById(existing.cartId);
    if (cart && !cart.customerId) {
      const resolved = await resolveAnonymousCartForCustomer(customerId, cart);
      await setCartSession({
        anonymousId: createAnonymousId(),
        cartId: resolved.id,
      });
      return;
    }
    if (cart?.customerId === customerId) {
      await setCartSession({
        anonymousId: createAnonymousId(),
        cartId: cart.id,
      });
      return;
    }
  }

  await restoreCustomerCartSession(customerId);
}

async function ensureCartSession(): Promise<CartSession> {
  const customerSession = await getCustomerSession();
  const existing = await getCartSession();

  if (customerSession) {
    if (existing) {
      const cart = await loadOwnedCart(existing);
      if (cart) {
        if (!cart.customerId) {
          const resolved = await resolveAnonymousCartForCustomer(
            customerSession.customerId,
            cart,
          );
          return persistCartSession(existing.anonymousId, resolved);
        }

        return { anonymousId: existing.anonymousId, cartId: cart.id };
      }

      // Cookie may reference a guest cart whose anonymousId was consumed during auth.
      const cartById = await fetchCartById(existing.cartId);
      if (cartById && !cartById.customerId) {
        const resolved = await resolveAnonymousCartForCustomer(
          customerSession.customerId,
          cartById,
        );
        return persistCartSession(createAnonymousId(), resolved);
      }
    }

    const customerCart =
      (await findCustomerCart(customerSession.customerId)) ??
      (await createCustomerCart(customerSession.customerId));

    return persistCartSession(
      existing?.anonymousId ?? createAnonymousId(),
      customerCart,
    );
  }

  if (existing) {
    const cart = await loadOwnedCart(existing);
    if (cart) {
      return { anonymousId: existing.anonymousId, cartId: cart.id };
    }
  }

  const anonymousId = existing?.anonymousId ?? createAnonymousId();
  const cart = await createGuestCart(anonymousId);
  return persistCartSession(anonymousId, cart);
}

async function loadResolvedCart(): Promise<{ session: CartSession; cart: Cart }> {
  const session = await ensureCartSession();
  const cart = await loadOwnedCart(session);
  if (!cart) {
    throw new CartNotFoundError();
  }
  return { session, cart };
}

async function loadResolvedCartIfSessionExists(): Promise<{
  session: CartSession;
  cart: Cart;
}> {
  const existing = await getCartSession();
  if (!existing) {
    throw new CartNotFoundError();
  }

  return loadResolvedCart();
}

export async function addLineItem(
  sku: string,
  quantity: number,
): Promise<StorefrontCart> {
  const availability = await getProductAvailabilityBySku(sku);
  if (availability && !availability.isOnStock) {
    throw new OutOfStockError();
  }

  const { cart } = await loadResolvedCart();

  const response = await apiRoot
    .carts()
    .withId({ ID: cart.id })
    .post({
      body: {
        version: cart.version,
        actions: [
          {
            action: 'addLineItem',
            sku,
            quantity,
          },
        ],
      },
      queryArgs: {
        expand: ['discountCodes[*].discountCode'],
      },
    })
    .execute();

  return mapCart(response.body, getStorefrontContext().locale);
}

export async function updateLineItemQuantity(
  lineItemId: string,
  quantity: number,
): Promise<StorefrontCart> {
  const { cart } = await loadResolvedCartIfSessionExists();

  const action =
    quantity <= 0
      ? { action: 'removeLineItem' as const, lineItemId }
      : {
          action: 'changeLineItemQuantity' as const,
          lineItemId,
          quantity,
        };

  const response = await apiRoot
    .carts()
    .withId({ ID: cart.id })
    .post({
      body: {
        version: cart.version,
        actions: [action],
      },
      queryArgs: {
        expand: ['discountCodes[*].discountCode'],
      },
    })
    .execute();

  return mapCart(response.body, getStorefrontContext().locale);
}

export async function removeLineItem(lineItemId: string): Promise<StorefrontCart> {
  return updateLineItemQuantity(lineItemId, 0);
}

async function updateCartWithActions(
  cart: Cart,
  actions: CartUpdateAction[],
): Promise<StorefrontCart> {
  const response = await apiRoot
    .carts()
    .withId({ ID: cart.id })
    .post({
      body: {
        version: cart.version,
        actions,
      },
      queryArgs: {
        expand: ['discountCodes[*].discountCode'],
      },
    })
    .execute();

  return mapCart(response.body, getStorefrontContext().locale);
}

export async function addDiscountCode(code: string): Promise<StorefrontCart> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new InvalidDiscountCodeError('Discount code is required');
  }

  const { cart } = await loadResolvedCart();

  if (cart.lineItems.length === 0) {
    throw new CartNotFoundError('Cart is empty');
  }

  try {
    const mapped = await updateCartWithActions(cart, [
      { action: 'addDiscountCode', code: trimmedCode },
    ]);
    const appliedCode = mapped.discountCodes.find(
      (discountCode) => discountCode.code === trimmedCode,
    );

    if (appliedCode && appliedCode.state !== 'MatchesCart') {
      throw new DiscountCodeNotApplicableError(
        `Discount code "${trimmedCode}" does not apply to your cart.`,
        appliedCode.state as never,
      );
    }

    return mapped;
  } catch (error) {
    if (
      error instanceof DiscountCodeNotApplicableError ||
      error instanceof InvalidDiscountCodeError
    ) {
      throw error;
    }
    throw mapDiscountCodeCartError(error);
  }
}

export async function removeDiscountCode(
  discountCodeId: string,
): Promise<StorefrontCart> {
  const { cart } = await loadResolvedCartIfSessionExists();

  try {
    return await updateCartWithActions(cart, [
      {
        action: 'removeDiscountCode',
        discountCode: {
          typeId: 'discount-code',
          id: discountCodeId,
        },
      },
    ]);
  } catch (error) {
    throw mapDiscountCodeCartError(error);
  }
}

export async function getCartForCheckout(): Promise<{
  cart: StorefrontCart;
  anonymousId: string;
}> {
  const { session, cart } = await loadResolvedCartIfSessionExists();

  if (cart.lineItems.length === 0) {
    throw new CartNotFoundError('Cart is empty');
  }

  return {
    cart: mapCart(cart, getStorefrontContext().locale),
    anonymousId: session.anonymousId,
  };
}
