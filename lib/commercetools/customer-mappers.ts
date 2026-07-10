import type { Customer, Order } from '@commercetools/platform-sdk';

import { formatPrice } from '@/lib/format';

import { DEFAULT_STOREFRONT_LOCALE } from './storefront-context';

export type StorefrontCustomer = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
};

export type StorefrontOrder = {
  id: string;
  orderNumber?: string;
  createdAt: string;
  orderState: string;
  paymentState?: string;
  total: {
    centAmount: number;
    currencyCode: string;
    formatted: string;
  };
};

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
  };
}

export function mapOrder(order: Order, locale = DEFAULT_STOREFRONT_LOCALE): StorefrontOrder {
  void locale;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    orderState: order.orderState,
    paymentState: order.paymentState,
    total: {
      centAmount: order.totalPrice.centAmount,
      currencyCode: order.totalPrice.currencyCode,
      formatted: formatPrice(
        order.totalPrice.centAmount,
        order.totalPrice.currencyCode,
      ),
    },
  };
}

export function mapOrders(
  orders: Order[],
  locale = DEFAULT_STOREFRONT_LOCALE,
): StorefrontOrder[] {
  return orders.map((order) => mapOrder(order, locale));
}
