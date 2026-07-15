import 'server-only';

import type { Order } from '@commercetools/platform-sdk';

import {
  getAuthenticatedCustomerProfile,
  getValidCustomerAccessToken,
} from './customer-auth';
import {
  mapOrderDetail,
  mapOrders,
  type StorefrontOrder,
  type StorefrontOrderDetail,
} from './customer-mappers';
import { commercetoolsEnv } from './env';
import { getStorefrontContext } from './storefront-context';

type OrdersResponse = {
  results: Order[];
  total: number;
  count: number;
  offset: number;
};

export class CustomerOrderNotFoundError extends Error {
  constructor() {
    super('Order not found');
    this.name = 'CustomerOrderNotFoundError';
  }
}

export async function getMyOrders(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ orders: StorefrontOrder[]; total: number }> {
  const accessToken = await getValidCustomerAccessToken();
  if (!accessToken) {
    return { orders: [], total: 0 };
  }

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const params = new URLSearchParams({
    sort: 'createdAt desc',
    limit: String(limit),
    offset: String(offset),
  });
  params.append('expand', 'paymentInfo.payments[*]');

  const response = await fetch(
    `${commercetoolsEnv.apiUrl}/${commercetoolsEnv.projectKey}/me/orders?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to fetch customer orders (${response.status})`);
  }

  const body = JSON.parse(raw) as OrdersResponse;
  const { locale } = getStorefrontContext();

  return {
    orders: mapOrders(body.results, locale),
    total: body.total,
  };
}

export async function getMyOrder(
  orderId: string,
): Promise<StorefrontOrderDetail | null> {
  const accessToken = await getValidCustomerAccessToken();
  if (!accessToken) {
    return null;
  }

  const response = await fetch(
    `${commercetoolsEnv.apiUrl}/${commercetoolsEnv.projectKey}/me/orders/${encodeURIComponent(orderId)}?expand=paymentInfo.payments[*]`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 404) {
    throw new CustomerOrderNotFoundError();
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to fetch order (${response.status})`);
  }

  const order = JSON.parse(raw) as Order;
  const { locale } = getStorefrontContext();

  return mapOrderDetail(order, locale);
}

export async function getMyProfile() {
  return getAuthenticatedCustomerProfile();
}
