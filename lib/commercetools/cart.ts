import 'server-only';

import type { Cart } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
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

async function fetchCartById(cartId: string): Promise<Cart | null> {
  try {
    const response = await apiRoot.carts().withId({ ID: cartId }).get().execute();
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
  const session = await getCartSession();
  if (!session) {
    return null;
  }

  const cart = await loadOwnedCart(session);
  if (!cart) {
    return null;
  }

  return mapCart(cart, getStorefrontContext().locale);
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

async function ensureCartSession(): Promise<CartSession> {
  const existing = await getCartSession();
  if (existing) {
    const cart = await loadOwnedCart(existing);
    if (cart) {
      return { anonymousId: existing.anonymousId, cartId: cart.id };
    }
  }

  const anonymousId = existing?.anonymousId ?? createAnonymousId();
  const cart = await createGuestCart(anonymousId);
  const session = { anonymousId, cartId: cart.id };
  await setCartSession(session);
  return session;
}

export async function addLineItem(
  sku: string,
  quantity: number,
): Promise<StorefrontCart> {
  const session = await ensureCartSession();
  const cart = await loadOwnedCart(session);

  if (!cart) {
    throw new CartNotFoundError();
  }

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
    })
    .execute();

  return mapCart(response.body, getStorefrontContext().locale);
}

export async function updateLineItemQuantity(
  lineItemId: string,
  quantity: number,
): Promise<StorefrontCart> {
  const session = await getCartSession();
  if (!session) {
    throw new CartNotFoundError();
  }

  const cart = await loadOwnedCart(session);
  if (!cart) {
    throw new CartNotFoundError();
  }

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
    })
    .execute();

  return mapCart(response.body, getStorefrontContext().locale);
}

export async function removeLineItem(lineItemId: string): Promise<StorefrontCart> {
  return updateLineItemQuantity(lineItemId, 0);
}

export async function getCartForCheckout(): Promise<{
  cart: StorefrontCart;
  anonymousId: string;
}> {
  const session = await getCartSession();
  if (!session) {
    throw new CartNotFoundError('No active cart');
  }

  const cart = await loadOwnedCart(session);
  if (!cart) {
    throw new CartNotFoundError();
  }

  if (cart.lineItems.length === 0) {
    throw new CartNotFoundError('Cart is empty');
  }

  return {
    cart: mapCart(cart, getStorefrontContext().locale),
    anonymousId: session.anonymousId,
  };
}
