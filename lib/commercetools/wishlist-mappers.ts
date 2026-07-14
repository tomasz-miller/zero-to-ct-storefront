import type { ShoppingList, ShoppingListLineItem } from '@commercetools/platform-sdk';

import { pickLocalized } from './product-mappers';
import { DEFAULT_STOREFRONT_LOCALE } from './storefront-context';

export type StorefrontWishlistLineItem = {
  id: string;
  productId: string;
  name: string;
  slug?: string;
  sku?: string;
  variantId: number;
  imageUrl?: string;
  quantity: number;
};

export type StorefrontWishlist = {
  id: string;
  version: number;
  itemCount: number;
  skus: string[];
  lineItems: StorefrontWishlistLineItem[];
};

function mapLineItem(
  lineItem: ShoppingListLineItem,
  locale: string,
): StorefrontWishlistLineItem {
  const slug = pickLocalized(lineItem.productSlug, locale);

  return {
    id: lineItem.id,
    productId: lineItem.productId,
    name: pickLocalized(lineItem.name, locale) ?? 'Item',
    slug,
    sku: lineItem.variant?.sku,
    variantId: lineItem.variantId ?? lineItem.variant?.id ?? 0,
    imageUrl: lineItem.variant?.images?.[0]?.url,
    quantity: lineItem.quantity,
  };
}

export function mapWishlist(
  shoppingList: ShoppingList,
  locale = DEFAULT_STOREFRONT_LOCALE,
): StorefrontWishlist {
  const lineItems = shoppingList.lineItems.map((item) => mapLineItem(item, locale));
  const skus = lineItems
    .map((item) => item.sku)
    .filter((sku): sku is string => Boolean(sku));

  return {
    id: shoppingList.id,
    version: shoppingList.version,
    itemCount: lineItems.length,
    skus,
    lineItems,
  };
}
