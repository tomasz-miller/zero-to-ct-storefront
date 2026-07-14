import type { Cart, LineItem } from '@commercetools/platform-sdk';

import { pickLocalized } from './product-mappers';
import { DEFAULT_STOREFRONT_LOCALE } from './storefront-context';

export type StorefrontMoney = {
  centAmount: number;
  currencyCode: string;
};

export type StorefrontCartDiscountCode = {
  id: string;
  code: string;
  name?: string;
  state: string;
};

export type StorefrontCartLineItem = {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  quantity: number;
  imageUrl?: string;
  unitPrice: StorefrontMoney;
  originalUnitPrice?: StorefrontMoney;
  price: StorefrontMoney;
  totalPrice: StorefrontMoney;
};

export type StorefrontCart = {
  id: string;
  version: number;
  anonymousId?: string;
  country?: string;
  currency: string;
  lineItems: StorefrontCartLineItem[];
  itemCount: number;
  discountCodes: StorefrontCartDiscountCode[];
  subtotal: StorefrontMoney;
  savings?: StorefrontMoney;
  total: StorefrontMoney;
};

function mapMoney(value: {
  centAmount: number;
  currencyCode: string;
}): StorefrontMoney {
  return {
    centAmount: value.centAmount,
    currencyCode: value.currencyCode,
  };
}

function resolveDiscountedUnitPrice(lineItem: LineItem): StorefrontMoney | undefined {
  const discounted = lineItem.discountedPricePerQuantity?.[0]?.discountedPrice?.value;
  if (discounted) {
    return mapMoney(discounted);
  }

  return undefined;
}

function mapLineItem(lineItem: LineItem, locale: string): StorefrontCartLineItem {
  const originalUnitPrice = mapMoney(lineItem.price.value);
  const discountedUnitPrice = resolveDiscountedUnitPrice(lineItem);

  return {
    id: lineItem.id,
    productId: lineItem.productId,
    name: pickLocalized(lineItem.name, locale) ?? 'Item',
    sku: lineItem.variant.sku,
    quantity: lineItem.quantity,
    imageUrl: lineItem.variant.images?.[0]?.url,
    unitPrice: discountedUnitPrice ?? originalUnitPrice,
    originalUnitPrice:
      discountedUnitPrice &&
      discountedUnitPrice.centAmount < originalUnitPrice.centAmount
        ? originalUnitPrice
        : undefined,
    price: originalUnitPrice,
    totalPrice: mapMoney(lineItem.totalPrice),
  };
}

function mapDiscountCodes(cart: Cart, locale: string): StorefrontCartDiscountCode[] {
  return (cart.discountCodes ?? []).map((entry) => {
    const discountCode = entry.discountCode.obj;

    return {
      id: entry.discountCode.id,
      code: discountCode?.code ?? '',
      name: pickLocalized(discountCode?.name, locale),
      state: entry.state,
    };
  });
}

function calculateSubtotal(lineItems: StorefrontCartLineItem[]): number {
  return lineItems.reduce(
    (sum, item) => sum + item.price.centAmount * item.quantity,
    0,
  );
}

export function mapCart(
  cart: Cart,
  locale = DEFAULT_STOREFRONT_LOCALE,
): StorefrontCart {
  const lineItems = cart.lineItems.map((item) => mapLineItem(item, locale));
  const currency =
    cart.totalPrice.currencyCode ?? cart.lineItems[0]?.price.value.currencyCode ?? 'EUR';
  const subtotalCentAmount = calculateSubtotal(lineItems);
  const totalCentAmount = cart.totalPrice.centAmount;
  const savingsCentAmount = subtotalCentAmount - totalCentAmount;

  return {
    id: cart.id,
    version: cart.version,
    anonymousId: cart.anonymousId,
    country: cart.country,
    currency,
    lineItems,
    itemCount: lineItems.reduce((sum, item) => sum + item.quantity, 0),
    discountCodes: mapDiscountCodes(cart, locale),
    subtotal: {
      centAmount: subtotalCentAmount,
      currencyCode: currency,
    },
    savings:
      savingsCentAmount > 0
        ? {
            centAmount: savingsCentAmount,
            currencyCode: currency,
          }
        : undefined,
    total: {
      centAmount: totalCentAmount,
      currencyCode: currency,
    },
  };
}
