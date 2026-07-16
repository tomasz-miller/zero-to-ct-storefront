import 'server-only';

import type { ShoppingList } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import { addLineItem } from './cart';
import { getCustomerSession } from './customer-session';
import { pickLocalized } from './product-mappers';
import { getStorefrontContext } from './storefront-context';
import { mapWishlist, type StorefrontWishlist } from './wishlist-mappers';
import {
  clearWishlistSession,
  createWishlistAnonymousId,
  getWishlistSession,
  rotateWishlistSessionAnonymousId,
  setWishlistSession,
  type WishlistSession,
} from './wishlist-session';

export class WishlistAccessError extends Error {
  constructor(message = 'Wishlist access denied') {
    super(message);
    this.name = 'WishlistAccessError';
  }
}

export class WishlistNotFoundError extends Error {
  constructor(message = 'Wishlist not found') {
    super(message);
    this.name = 'WishlistNotFoundError';
  }
}

export class WishlistLineItemNotFoundError extends Error {
  constructor(message = 'Wishlist item not found') {
    super(message);
    this.name = 'WishlistLineItemNotFoundError';
  }
}

async function fetchShoppingListById(shoppingListId: string): Promise<ShoppingList | null> {
  try {
    const response = await apiRoot
      .shoppingLists()
      .withId({ ID: shoppingListId })
      .get()
      .execute();
    return response.body;
  } catch {
    return null;
  }
}

export function canAccessShoppingList(
  shoppingList: ShoppingList,
  session: WishlistSession,
  customerId?: string,
): boolean {
  if (customerId && shoppingList.customer?.id === customerId) {
    return true;
  }

  if (shoppingList.customer?.id) {
    return false;
  }

  return shoppingList.anonymousId === session.anonymousId;
}

export function verifyShoppingListOwnership(
  shoppingList: ShoppingList,
  anonymousId: string,
  customerId?: string,
): void {
  if (canAccessShoppingList(shoppingList, { anonymousId, shoppingListId: shoppingList.id }, customerId)) {
    return;
  }

  throw new WishlistAccessError();
}

async function loadOwnedShoppingList(session: WishlistSession): Promise<ShoppingList | null> {
  const shoppingList = await fetchShoppingListById(session.shoppingListId);
  if (!shoppingList) {
    await clearWishlistSession();
    return null;
  }

  const customerSession = await getCustomerSession();
  if (!canAccessShoppingList(shoppingList, session, customerSession?.customerId)) {
    await clearWishlistSession();
    return null;
  }

  return shoppingList;
}

async function findCustomerShoppingList(customerId: string): Promise<ShoppingList | null> {
  const response = await apiRoot
    .shoppingLists()
    .get({
      queryArgs: {
        where: `customer(id="${customerId}")`,
        limit: 1,
        sort: 'lastModifiedAt desc',
      },
    })
    .execute();

  return response.body.results[0] ?? null;
}

async function createGuestShoppingList(anonymousId: string): Promise<ShoppingList> {
  const { locale } = await getStorefrontContext();

  const response = await apiRoot
    .shoppingLists()
    .post({
      body: {
        name: { [locale]: 'Wishlist' },
        anonymousId,
      },
    })
    .execute();

  return response.body;
}

async function createCustomerShoppingList(customerId: string): Promise<ShoppingList> {
  const { locale } = await getStorefrontContext();

  const response = await apiRoot
    .shoppingLists()
    .post({
      body: {
        name: { [locale]: 'Wishlist' },
        customer: {
          typeId: 'customer',
          id: customerId,
        },
      },
    })
    .execute();

  return response.body;
}

async function ensureWishlistSession(): Promise<WishlistSession | null> {
  const customerSession = await getCustomerSession();

  if (customerSession) {
    const existing = await getWishlistSession();
    if (existing) {
      const list = await loadOwnedShoppingList(existing);
      if (list) {
        return { anonymousId: existing.anonymousId, shoppingListId: list.id };
      }
    }

    const customerList = await findCustomerShoppingList(customerSession.customerId);
    if (customerList) {
      const session = {
        anonymousId: existing?.anonymousId ?? createWishlistAnonymousId(),
        shoppingListId: customerList.id,
      };
      await setWishlistSession(session);
      return session;
    }

    const created = await createCustomerShoppingList(customerSession.customerId);
    const session = {
      anonymousId: existing?.anonymousId ?? createWishlistAnonymousId(),
      shoppingListId: created.id,
    };
    await setWishlistSession(session);
    return session;
  }

  const existing = await getWishlistSession();
  if (existing) {
    const list = await loadOwnedShoppingList(existing);
    if (list) {
      return { anonymousId: existing.anonymousId, shoppingListId: list.id };
    }
  }

  const anonymousId = existing?.anonymousId ?? createWishlistAnonymousId();
  const created = await createGuestShoppingList(anonymousId);
  const session = { anonymousId, shoppingListId: created.id };
  await setWishlistSession(session);
  return session;
}

async function resolveLineItemSku(lineItem: ShoppingList['lineItems'][number]): Promise<string | undefined> {
  if (lineItem.variant?.sku) {
    return lineItem.variant.sku;
  }

  try {
    const response = await apiRoot
      .productProjections()
      .withId({ ID: lineItem.productId })
      .get()
      .execute();

    const variant = [response.body.masterVariant, ...response.body.variants].find(
      (candidate) => candidate.id === lineItem.variantId,
    );

    return variant?.sku;
  } catch {
    return undefined;
  }
}

async function enrichWishlistFromProjections(
  wishlist: StorefrontWishlist,
  locale: string,
): Promise<StorefrontWishlist> {
  const needsEnrichment = wishlist.lineItems.filter(
    (item) => !item.imageUrl || !item.sku || !item.slug,
  );

  if (needsEnrichment.length === 0) {
    return wishlist;
  }

  const productIds = [...new Set(needsEnrichment.map((item) => item.productId))];
  const where = productIds.map((id) => `"${id}"`).join(',');

  try {
    const response = await apiRoot
      .productProjections()
      .get({
        queryArgs: {
          where: `id in (${where})`,
          limit: productIds.length,
          staged: false,
          localeProjection: locale,
        },
      })
      .execute();

    const projectionById = new Map(
      response.body.results.map((projection) => [projection.id, projection]),
    );

    const lineItems = wishlist.lineItems.map((item) => {
      if (item.imageUrl && item.sku && item.slug) {
        return item;
      }

      const projection = projectionById.get(item.productId);
      if (!projection) {
        return item;
      }

      const variants = [projection.masterVariant, ...projection.variants];
      const variant =
        variants.find((candidate) => candidate.id === item.variantId) ??
        projection.masterVariant;

      return {
        ...item,
        slug: item.slug ?? pickLocalized(projection.slug, locale),
        sku: item.sku ?? variant.sku,
        imageUrl: item.imageUrl ?? variant.images?.[0]?.url,
      };
    });

    const skus = lineItems
      .map((item) => item.sku)
      .filter((sku): sku is string => Boolean(sku));

    return {
      ...wishlist,
      skus,
      lineItems,
    };
  } catch {
    return wishlist;
  }
}

async function mapOwnedWishlist(shoppingList: ShoppingList): Promise<StorefrontWishlist> {
  const { locale } = await getStorefrontContext();
  const wishlist = mapWishlist(shoppingList, locale);
  return enrichWishlistFromProjections(wishlist, locale);
}

export async function getWishlist(): Promise<StorefrontWishlist | null> {
  const session = await getWishlistSession();
  if (!session) {
    return null;
  }

  const shoppingList = await loadOwnedShoppingList(session);
  if (!shoppingList) {
    return null;
  }

  return mapOwnedWishlist(shoppingList);
}

function findLineItemBySku(shoppingList: ShoppingList, sku: string) {
  return shoppingList.lineItems.find((item) => item.variant?.sku === sku);
}

export async function addWishlistItem(sku: string): Promise<StorefrontWishlist> {
  const session = await ensureWishlistSession();
  if (!session) {
    throw new WishlistNotFoundError();
  }

  const shoppingList = await loadOwnedShoppingList(session);
  if (!shoppingList) {
    throw new WishlistNotFoundError();
  }

  if (findLineItemBySku(shoppingList, sku)) {
    return mapOwnedWishlist(shoppingList);
  }

  const response = await apiRoot
    .shoppingLists()
    .withId({ ID: shoppingList.id })
    .post({
      body: {
        version: shoppingList.version,
        actions: [
          {
            action: 'addLineItem',
            sku,
            quantity: 1,
          },
        ],
      },
    })
    .execute();

  return mapOwnedWishlist(response.body);
}

export async function removeWishlistItem(lineItemId: string): Promise<StorefrontWishlist> {
  const session = await getWishlistSession();
  if (!session) {
    throw new WishlistNotFoundError();
  }

  const shoppingList = await loadOwnedShoppingList(session);
  if (!shoppingList) {
    throw new WishlistNotFoundError();
  }

  const lineItem = shoppingList.lineItems.find((item) => item.id === lineItemId);
  if (!lineItem) {
    throw new WishlistLineItemNotFoundError();
  }

  const response = await apiRoot
    .shoppingLists()
    .withId({ ID: shoppingList.id })
    .post({
      body: {
        version: shoppingList.version,
        actions: [
          {
            action: 'removeLineItem',
            lineItemId,
          },
        ],
      },
    })
    .execute();

  return mapOwnedWishlist(response.body);
}

async function mergeGuestListIntoCustomerList(
  guestList: ShoppingList,
  customerList: ShoppingList,
): Promise<ShoppingList> {
  const existingSkus = new Set(
    customerList.lineItems
      .map((item) => item.variant?.sku)
      .filter((sku): sku is string => Boolean(sku)),
  );

  const actions = guestList.lineItems
    .filter((item) => item.variant?.sku && !existingSkus.has(item.variant.sku))
    .map((item) => ({
      action: 'addLineItem' as const,
      sku: item.variant!.sku!,
      quantity: 1,
    }));

  let mergedList = customerList;

  if (actions.length > 0) {
    const response = await apiRoot
      .shoppingLists()
      .withId({ ID: customerList.id })
      .post({
        body: {
          version: customerList.version,
          actions,
        },
      })
      .execute();
    mergedList = response.body;
  }

  await apiRoot
    .shoppingLists()
    .withId({ ID: guestList.id })
    .delete({
      queryArgs: {
        version: guestList.version,
      },
    })
    .execute()
    .catch(() => undefined);

  return mergedList;
}

async function transferGuestListToCustomer(
  guestList: ShoppingList,
  customerId: string,
): Promise<ShoppingList> {
  const response = await apiRoot
    .shoppingLists()
    .withId({ ID: guestList.id })
    .post({
      body: {
        version: guestList.version,
        actions: [
          {
            action: 'setCustomer',
            customer: {
              typeId: 'customer',
              id: customerId,
            },
          },
        ],
      },
    })
    .execute();

  return response.body;
}

export async function reconcileWishlistOnAuth(customerId: string): Promise<void> {
  const session = await getWishlistSession();
  if (!session) {
    return;
  }

  const guestList = await loadOwnedShoppingList(session);
  if (!guestList || guestList.customer?.id) {
    return;
  }

  try {
    const customerList = await findCustomerShoppingList(customerId);
    const resolvedList = customerList
      ? await mergeGuestListIntoCustomerList(guestList, customerList)
      : await transferGuestListToCustomer(guestList, customerId);

    await setWishlistSession({
      anonymousId: createWishlistAnonymousId(),
      shoppingListId: resolvedList.id,
    });
  } catch (error) {
    console.error('[wishlist] reconcileWishlistOnAuth failed', error);
    await rotateWishlistSessionAnonymousId();
  }
}

export async function moveWishlistItemToCart(lineItemId: string): Promise<{
  wishlist: StorefrontWishlist;
  cartItemCount: number;
}> {
  const session = await getWishlistSession();
  if (!session) {
    throw new WishlistNotFoundError();
  }

  const shoppingList = await loadOwnedShoppingList(session);
  if (!shoppingList) {
    throw new WishlistNotFoundError();
  }

  const lineItem = shoppingList.lineItems.find((item) => item.id === lineItemId);
  if (!lineItem) {
    throw new WishlistLineItemNotFoundError();
  }

  const sku = await resolveLineItemSku(lineItem);
  if (!sku) {
    throw new WishlistLineItemNotFoundError('Wishlist item is missing a resolvable SKU');
  }

  const cart = await addLineItem(sku, 1);
  const wishlist = await removeWishlistItem(lineItemId);

  return {
    wishlist,
    cartItemCount: cart.itemCount,
  };
}

export async function clearWishlistOnLogout(): Promise<void> {
  await clearWishlistSession();
}
