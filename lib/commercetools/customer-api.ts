import 'server-only';

import type { Order } from '@commercetools/platform-sdk';

import { getAuthenticatedCustomerProfile, getValidCustomerAccessToken } from './customer-auth';
import { mapOrders, type StorefrontOrder } from './customer-mappers';
import { commercetoolsEnv } from './env';
import { getStorefrontContext } from './storefront-context';

type OrdersResponse = {
  results: Order[];
  total: number;
  count: number;
  offset: number;
};

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

export async function getMyProfile() {
  return getAuthenticatedCustomerProfile();
}
