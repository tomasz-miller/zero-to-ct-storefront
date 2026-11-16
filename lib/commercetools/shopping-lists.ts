import 'server-only';

import type { ShoppingList } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import { addLineItem } from './cart';
import { getCustomerSession } from './customer-session';
import {
  WishlistAccessError,
  WishlistLineItemNotFoundError,
  WishlistNotFoundError,
} from './domain-errors';
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

export {
  WishlistAccessError,
  WishlistLineItemNotFoundError,
  WishlistNotFoundError,
};

export const SHOPPING_LIST_EXPAND = [
  'lineItems[*].variant',
  'lineItems[*].productSlug',
] as const;

async function fetchShoppingListById(shoppingListId: string): Promise<ShoppingList | null> {
  try {
    const response = await apiRoot
      .shoppingLists()
      .withId({ ID: shoppingListId })
      .get({ queryArgs: { expand: [...SHOPPING_LIST_EXPAND] } })
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
        where: 'customer(id = :customerId)',
        'var.customerId': customerId,
        limit: 1,
        sort: 'lastModifiedAt desc',
        expand: [...SHOPPING_LIST_EXPAND],
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
      queryArgs: { expand: [...SHOPPING_LIST_EXPAND] },
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
      queryArgs: { expand: [...SHOPPING_LIST_EXPAND] },
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

async function mapOwnedWishlist(shoppingList: ShoppingList): Promise<StorefrontWishlist> {
  const { locale } = await getStorefrontContext();
  return mapWishlist(shoppingList, locale);
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
      queryArgs: { expand: [...SHOPPING_LIST_EXPAND] },
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
      queryArgs: { expand: [...SHOPPING_LIST_EXPAND] },
    })
    .execute();

  return mapOwnedWishlist(response.body);
}

async function mergeGuestListIntoCustomerList(
  guestList: ShoppingList,
  customerList: ShoppingList,
): Promise<ShoppingList> {
  const existingKeys = new Set(
    customerList.lineItems.map((item) => `${item.productId}:${item.variantId}`),
  );

  const actions = guestList.lineItems.flatMap((item) =>
    item.variantId === undefined || existingKeys.has(`${item.productId}:${item.variantId}`)
      ? []
      : [
          {
            action: 'addLineItem' as const,
            productId: item.productId,
            variantId: item.variantId,
            quantity: 1,
          },
        ],
  );

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
        queryArgs: { expand: [...SHOPPING_LIST_EXPAND] },
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
      queryArgs: { expand: [...SHOPPING_LIST_EXPAND] },
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

  const sku = lineItem.variant?.sku;
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
