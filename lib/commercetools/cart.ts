import 'server-only';

import type { Cart, CartUpdateAction } from '@commercetools/platform-sdk';

import { isStorefrontCountry } from '@/lib/markets';

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
import {
  forgetCartForCountry,
  getCartIdForCountry,
  rememberCartForCountry,
} from './market-cart-session';
import {
  getStorefrontContext,
  type StorefrontCountry,
} from './storefront-context';
import { getProductAvailabilityBySku } from './products';

type AlignCartResult = {
  cart: Cart;
  restored: boolean;
  recreated: boolean;
};

function cartItemCount(cart: Cart): number {
  return cart.lineItems.reduce((sum, item) => sum + item.quantity, 0);
}

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

export class NoDefaultAddressError extends Error {
  constructor(message = 'No default address configured on your account') {
    super(message);
    this.name = 'NoDefaultAddressError';
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

async function cartMatchesStorefront(cart: Cart): Promise<boolean> {
  const { currency, country } = await getStorefrontContext();
  return cart.country === country && cart.totalPrice.currencyCode === currency;
}

function isUsableMarketCart(
  cart: Cart,
  session: CartSession,
  customerId: string | undefined,
  country: StorefrontCountry,
  currency: string,
): boolean {
  if (cart.cartState !== 'Active') {
    return false;
  }

  if (cart.country !== country || cart.totalPrice.currencyCode !== currency) {
    return false;
  }

  return canAccessCart(cart, session, customerId);
}

async function resolveCartForMarket(
  session: CartSession,
  customerId: string | undefined,
): Promise<AlignCartResult> {
  const { currency, country } = await getStorefrontContext();

  const mappedCartId = await getCartIdForCountry(country);
  if (mappedCartId) {
    const mappedCart = await fetchCartById(mappedCartId);
    if (
      mappedCart &&
      isUsableMarketCart(mappedCart, session, customerId, country, currency)
    ) {
      await rememberCartForCountry(country, mappedCart.id);
      return { cart: mappedCart, restored: true, recreated: false };
    }

    await forgetCartForCountry(country);
  }

  if (customerId) {
    const existingCustomerCart = await findCustomerCartForMarket(
      customerId,
      country,
      currency,
    );
    if (existingCustomerCart) {
      await rememberCartForCountry(country, existingCustomerCart.id);
      return { cart: existingCustomerCart, restored: true, recreated: false };
    }

    const createdCustomerCart = await createCustomerCart(customerId);
    await rememberCartForCountry(country, createdCustomerCart.id);
    return { cart: createdCustomerCart, restored: false, recreated: true };
  }

  const createdGuestCart = await createGuestCart(session.anonymousId);
  await rememberCartForCountry(country, createdGuestCart.id);
  return { cart: createdGuestCart, restored: false, recreated: true };
}

async function alignCartWithStorefront(
  cart: Cart,
  session: CartSession,
): Promise<AlignCartResult> {
  const { currency, country } = await getStorefrontContext();

  if (await cartMatchesStorefront(cart)) {
    await rememberCartForCountry(country, cart.id);
    return { cart, restored: false, recreated: false };
  }

  const previousCountry = isStorefrontCountry(cart.country) ? cart.country : null;

  // Empty cart with matching currency — update country in place.
  if (
    cart.lineItems.length === 0 &&
    cart.totalPrice.currencyCode === currency
  ) {
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

    if (previousCountry && previousCountry !== country) {
      const parkedId = await getCartIdForCountry(previousCountry);
      if (parkedId === cart.id) {
        await forgetCartForCountry(previousCountry);
      }
    }

    await rememberCartForCountry(country, response.body.id);
    return { cart: response.body, restored: false, recreated: false };
  }

  if (previousCountry) {
    await rememberCartForCountry(previousCountry, cart.id);
  }

  const customerSession = await getCustomerSession();
  return resolveCartForMarket(session, customerSession?.customerId ?? cart.customerId);
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

  const aligned = await alignCartWithStorefront(cart, session);
  if (aligned.cart.id !== session.cartId) {
    await setCartSession({
      anonymousId: session.anonymousId,
      cartId: aligned.cart.id,
    });
  }

  return aligned.cart;
}

export async function getGuestCart(): Promise<StorefrontCart | null> {
  const existing = await getCartSession();
  if (!existing) {
    return null;
  }

  try {
    const { cart } = await loadResolvedCartIfSessionExists();
    return mapCart(cart, (await getStorefrontContext()).locale);
  } catch {
    return null;
  }
}

export async function realignCartForStorefront(): Promise<{
  cartRecreated: boolean;
  cartRestored: boolean;
  itemCount: number;
  previousHadItems: boolean;
}> {
  const emptyResult = {
    cartRecreated: false,
    cartRestored: false,
    itemCount: 0,
    previousHadItems: false,
  };

  const session = await getCartSession();
  if (!session) {
    return emptyResult;
  }

  const cart = await fetchCartById(session.cartId);
  if (!cart) {
    await clearCartSession();
    return emptyResult;
  }

  const customerSession = await getCustomerSession();
  if (!canAccessCart(cart, session, customerSession?.customerId)) {
    await clearCartSession();
    return emptyResult;
  }

  const previousHadItems = cart.lineItems.length > 0;
  const aligned = await alignCartWithStorefront(cart, session);
  if (aligned.cart.id !== session.cartId) {
    await setCartSession({
      anonymousId: session.anonymousId,
      cartId: aligned.cart.id,
    });
  }

  return {
    cartRecreated: aligned.recreated,
    cartRestored: aligned.restored,
    itemCount: cartItemCount(aligned.cart),
    previousHadItems,
  };
}

async function createGuestCart(anonymousId: string): Promise<Cart> {
  const { currency, country, locale } = await getStorefrontContext();

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

  await rememberCartForCountry(country, response.body.id);
  return response.body;
}

export async function findCustomerCart(customerId: string): Promise<Cart | null> {
  const response = await apiRoot
    .carts()
    .get({
      queryArgs: {
        where: 'customerId = :customerId and cartState = "Active"',
        'var.customerId': customerId,
        limit: 1,
        sort: 'lastModifiedAt desc',
      },
    })
    .execute();

  const cart = response.body.results[0];
  return cart && cart.customerId === customerId ? cart : null;
}

export async function findCustomerCartForMarket(
  customerId: string,
  country: StorefrontCountry,
  currency: string,
): Promise<Cart | null> {
  const response = await apiRoot
    .carts()
    .get({
      queryArgs: {
        where:
          'customerId = :customerId and cartState = "Active" and country = :country and totalPrice(currencyCode = :currency)',
        'var.customerId': customerId,
        'var.country': country,
        'var.currency': currency,
        limit: 1,
        sort: 'lastModifiedAt desc',
      },
    })
    .execute();

  const cart = response.body.results[0];
  return cart && cart.customerId === customerId ? cart : null;
}

async function createCustomerCart(customerId: string): Promise<Cart> {
  const { currency, country, locale } = await getStorefrontContext();

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

async function persistCartSession(anonymousId: string, cart: Cart): Promise<CartSession> {
  const session = { anonymousId, cartId: cart.id };
  await setCartSession(session);

  const cartCountry = isStorefrontCountry(cart.country) ? cart.country : null;
  if (cartCountry) {
    await rememberCartForCountry(cartCountry, cart.id);
  }

  return session;
}

export async function restoreCustomerCartSession(customerId: string): Promise<void> {
  const { country, currency } = await getStorefrontContext();
  const customerCart =
    (await findCustomerCartForMarket(customerId, country, currency)) ??
    (await findCustomerCart(customerId));

  if (!customerCart) {
    return;
  }

  const anonymousId = createAnonymousId();
  await setCartSession({
    anonymousId,
    cartId: customerCart.id,
  });

  const cartCountry = isStorefrontCountry(customerCart.country) ? customerCart.country : country;
  await rememberCartForCountry(cartCountry, customerCart.id);
}

/**
 * The cookie cart, only when it is an active guest cart bound to the session's anonymousId.
 * Sent to commercetools on sign-in/sign-up, where anonymousId becomes a credential for every
 * resource of that guest.
 */
export async function getOwnedGuestCartRef(): Promise<{
  cartId: string;
  anonymousId: string;
} | null> {
  const session = await getCartSession();
  if (!session) {
    return null;
  }

  const cart = await fetchCartById(session.cartId);
  if (
    !cart ||
    cart.customerId ||
    cart.cartState !== 'Active' ||
    cart.anonymousId !== session.anonymousId
  ) {
    return null;
  }

  return { cartId: cart.id, anonymousId: session.anonymousId };
}

/** Restore the customer's own cart after sign-in/sign-up; guest carts are merged by commercetools. */
export async function reconcileCartOnAuth(customerId: string): Promise<void> {
  await restoreCustomerCartSession(customerId);
}

async function ensureCartSession(): Promise<CartSession> {
  const customerSession = await getCustomerSession();
  const existing = await getCartSession();

  if (customerSession) {
    if (existing) {
      const cart = await loadOwnedCart(existing);
      if (cart) {
        if (cart.customerId) {
          return { anonymousId: existing.anonymousId, cartId: cart.id };
        }

        const assigned = await assignCartToCustomer(cart, customerSession.customerId);
        return persistCartSession(existing.anonymousId, assigned);
      }
    }

    const { country, currency } = await getStorefrontContext();
    const customerCart =
      (await findCustomerCartForMarket(
        customerSession.customerId,
        country,
        currency,
      )) ?? (await createCustomerCart(customerSession.customerId));

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
  if (availability && availability.status === 'out_of_stock') {
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

  return mapCart(response.body, (await getStorefrontContext()).locale);
}

export async function addLineItems(
  items: Array<{ sku: string; quantity: number }>,
  options?: { checkAvailability?: boolean },
): Promise<StorefrontCart> {
  if (items.length === 0) {
    throw new Error('At least one line item is required');
  }

  const checkAvailability = options?.checkAvailability ?? true;
  if (checkAvailability) {
    for (const item of items) {
      const availability = await getProductAvailabilityBySku(item.sku);
      if (availability && availability.status === 'out_of_stock') {
        throw new OutOfStockError();
      }
    }
  }

  const { cart } = await loadResolvedCart();
  return updateCartWithActions(
    cart,
    items.map((item) => ({
      action: 'addLineItem' as const,
      sku: item.sku,
      quantity: item.quantity,
    })),
  );
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

  return mapCart(response.body, (await getStorefrontContext()).locale);
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

  return mapCart(response.body, (await getStorefrontContext()).locale);
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

export async function requireActiveCart(): Promise<Cart> {
  const { cart } = await loadResolvedCartIfSessionExists();

  if (cart.lineItems.length === 0) {
    throw new CartNotFoundError('Cart is empty');
  }

  if (cart.cartState !== 'Active') {
    throw new CartNotFoundError('Cart is not active');
  }

  return cart;
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
    cart: mapCart(cart, (await getStorefrontContext()).locale),
    anonymousId: session.anonymousId,
  };
}

export async function updateActiveCart(
  actions: CartUpdateAction[],
): Promise<StorefrontCart> {
  const { cart } = await loadResolvedCartIfSessionExists();

  if (cart.lineItems.length === 0) {
    throw new CartNotFoundError('Cart is empty');
  }

  return updateCartWithActions(cart, actions);
}
