import type { Address, Customer, LineItem, Order } from '@commercetools/platform-sdk';

import { formatPrice } from '@/lib/format';

import { pickLocalized } from './product-mappers';
import { DEFAULT_STOREFRONT_LOCALE } from './storefront-context';

export type FormattedMoney = {
  centAmount: number;
  currencyCode: string;
  formatted: string;
};

export type StorefrontCustomerAddress = {
  id: string;
  firstName?: string;
  lastName?: string;
  streetName: string;
  streetNumber?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  formatted: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

export type StorefrontCustomer = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  createdAt: string;
  addresses: StorefrontCustomerAddress[];
};

export type StorefrontOrder = {
  id: string;
  orderNumber?: string;
  createdAt: string;
  orderState: string;
  paymentState?: string;
  total: FormattedMoney;
};

export type StorefrontOrderLineItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  imageUrl?: string;
  unitPrice: FormattedMoney;
  totalPrice: FormattedMoney;
};

export type StorefrontOrderAddress = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  formatted: string;
};

export type StorefrontOrderDetail = StorefrontOrder & {
  lineItems: StorefrontOrderLineItem[];
  billingAddress?: StorefrontOrderAddress;
  shippingAddress?: StorefrontOrderAddress;
  shippingMethod?: string;
  shippingCost?: FormattedMoney;
};

function mapMoney(centAmount: number, currencyCode: string): FormattedMoney {
  return {
    centAmount,
    currencyCode,
    formatted: formatPrice(centAmount, currencyCode),
  };
}

function formatStreet(address: Address): string {
  const parts = [address.streetName, address.streetNumber].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

function mapOrderAddress(address: Address): StorefrontOrderAddress {
  const street = formatStreet(address);
  const city = address.city ?? '—';
  const postalCode = address.postalCode ?? '—';
  const country = address.country ?? '—';
  const formatted = [street, `${postalCode} ${city}`.trim(), country]
    .filter((part) => part && part !== '—')
    .join(', ');

  return {
    street,
    city,
    postalCode,
    country,
    formatted: formatted || '—',
  };
}

function mapCustomerAddress(
  address: Address,
  customer: Customer,
): StorefrontCustomerAddress {
  const mapped = mapOrderAddress(address);

  return {
    id: address.id ?? '',
    firstName: address.firstName,
    lastName: address.lastName,
    streetName: address.streetName ?? mapped.street,
    streetNumber: address.streetNumber,
    street: mapped.street,
    city: mapped.city,
    postalCode: mapped.postalCode,
    country: mapped.country,
    formatted: mapped.formatted,
    isDefaultShipping: address.id === customer.defaultShippingAddressId,
    isDefaultBilling: address.id === customer.defaultBillingAddressId,
  };
}

function mapOrderLineItem(
  lineItem: LineItem,
  locale: string,
): StorefrontOrderLineItem {
  const currencyCode = lineItem.price.value.currencyCode;

  return {
    id: lineItem.id,
    name: pickLocalized(lineItem.name, locale) ?? 'Item',
    sku: lineItem.variant.sku,
    quantity: lineItem.quantity,
    imageUrl: lineItem.variant.images?.[0]?.url,
    unitPrice: mapMoney(lineItem.price.value.centAmount, currencyCode),
    totalPrice: mapMoney(lineItem.totalPrice.centAmount, currencyCode),
  };
}

export function mapCustomer(customer: Customer): StorefrontCustomer {
  const firstName = customer.firstName ?? undefined;
  const lastName = customer.lastName ?? undefined;
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') || customer.email;

  return {
    id: customer.id,
    email: customer.email,
    firstName,
    lastName,
    displayName,
    createdAt: customer.createdAt,
    addresses: customer.addresses.map((address) =>
      mapCustomerAddress(address, customer),
    ),
  };
}

export function mapOrder(
  order: Order,
  locale = DEFAULT_STOREFRONT_LOCALE,
): StorefrontOrder {
  void locale;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    orderState: order.orderState,
    paymentState: order.paymentState,
    total: mapMoney(
      order.totalPrice.centAmount,
      order.totalPrice.currencyCode,
    ),
  };
}

export function mapOrderDetail(
  order: Order,
  locale = DEFAULT_STOREFRONT_LOCALE,
): StorefrontOrderDetail {
  const summary = mapOrder(order, locale);
  const shippingInfo = order.shippingInfo;

  return {
    ...summary,
    lineItems: order.lineItems.map((item) => mapOrderLineItem(item, locale)),
    billingAddress: order.billingAddress
      ? mapOrderAddress(order.billingAddress)
      : undefined,
    shippingAddress: order.shippingAddress
      ? mapOrderAddress(order.shippingAddress)
      : undefined,
    shippingMethod: shippingInfo?.shippingMethodName || undefined,
    shippingCost: shippingInfo?.price
      ? mapMoney(
          shippingInfo.price.centAmount,
          shippingInfo.price.currencyCode,
        )
      : undefined,
  };
}

export function mapOrders(
  orders: Order[],
  locale = DEFAULT_STOREFRONT_LOCALE,
): StorefrontOrder[] {
  return orders.map((order) => mapOrder(order, locale));
}
