import type { Cart, LineItem } from '@commercetools/platform-sdk';

import { pickLocalized } from './product-mappers';
import { DEFAULT_STOREFRONT_LOCALE } from './storefront-context';

export type StorefrontCartLineItem = {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  quantity: number;
  imageUrl?: string;
  price: {
    centAmount: number;
    currencyCode: string;
  };
  totalPrice: {
    centAmount: number;
    currencyCode: string;
  };
};

export type StorefrontCart = {
  id: string;
  version: number;
  anonymousId?: string;
  country?: string;
  currency: string;
  lineItems: StorefrontCartLineItem[];
  itemCount: number;
  subtotal: {
    centAmount: number;
    currencyCode: string;
  };
  total: {
    centAmount: number;
    currencyCode: string;
  };
};

function mapLineItem(lineItem: LineItem, locale: string): StorefrontCartLineItem {
  return {
    id: lineItem.id,
    productId: lineItem.productId,
    name: pickLocalized(lineItem.name, locale) ?? 'Item',
    sku: lineItem.variant.sku,
    quantity: lineItem.quantity,
    imageUrl: lineItem.variant.images?.[0]?.url,
    price: {
      centAmount: lineItem.price.value.centAmount,
      currencyCode: lineItem.price.value.currencyCode,
    },
    totalPrice: {
      centAmount: lineItem.totalPrice.centAmount,
      currencyCode: lineItem.totalPrice.currencyCode,
    },
  };
}

export function mapCart(
  cart: Cart,
  locale = DEFAULT_STOREFRONT_LOCALE,
): StorefrontCart {
  const lineItems = cart.lineItems.map((item) => mapLineItem(item, locale));
  const currency =
    cart.totalPrice.currencyCode ?? cart.lineItems[0]?.price.value.currencyCode ?? 'EUR';

  return {
    id: cart.id,
    version: cart.version,
    anonymousId: cart.anonymousId,
    country: cart.country,
    currency,
    lineItems,
    itemCount: lineItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: {
      centAmount: cart.totalPrice.centAmount,
      currencyCode: currency,
    },
    total: {
      centAmount: cart.totalPrice.centAmount,
      currencyCode: currency,
    },
  };
}
