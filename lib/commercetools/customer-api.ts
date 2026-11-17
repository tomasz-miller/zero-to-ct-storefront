import 'server-only';

import {
  getAuthenticatedCustomerProfile,
  getCustomerAccessTokenForRender,
} from './customer-auth';
import {
  mapOrderDetail,
  mapOrders,
  type StorefrontOrder,
  type StorefrontOrderDetail,
} from './customer-mappers';
import { isCtNotFound, parseCtError } from './ct-errors';
import { createCustomerApiRoot } from './customer-client';
import { mapCustomerCtError, signInRequired } from './customer-errors';
import { CustomerOrderNotFoundError } from './domain-errors';
import { getStorefrontContext } from './storefront-context';

export { CustomerOrderNotFoundError };

export async function getMyOrders(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ orders: StorefrontOrder[]; total: number }> {
  const accessToken = await getCustomerAccessTokenForRender();
  if (!accessToken) {
    return { orders: [], total: 0 };
  }

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const { body } = await createCustomerApiRoot(accessToken)
    .me()
    .orders()
    .get({
      queryArgs: {
        sort: 'createdAt desc',
        limit,
        offset,
        expand: ['paymentInfo.payments[*]'],
      },
    })
    .execute()
    .catch((error: unknown): never => {
      throw (
        mapCustomerCtError(error) ??
        (parseCtError(error).statusCode === 401 ? signInRequired() : error)
      );
    });

  const { locale } = await getStorefrontContext();

  return {
    orders: mapOrders(body.results, locale),
    // `total` is optional in the SDK type; commercetools includes it unless `withTotal=false`.
    total: body.total ?? body.results.length,
  };
}

export async function getMyOrder(
  orderId: string,
): Promise<StorefrontOrderDetail | null> {
  const accessToken = await getCustomerAccessTokenForRender();
  if (!accessToken) {
    return null;
  }

  const { body: order } = await createCustomerApiRoot(accessToken)
    .me()
    .orders()
    .withId({ ID: orderId })
    .get({ queryArgs: { expand: ['paymentInfo.payments[*]'] } })
    .execute()
    .catch((error: unknown): never => {
      if (isCtNotFound(error)) {
        throw new CustomerOrderNotFoundError();
      }
      throw (
        mapCustomerCtError(error) ??
        (parseCtError(error).statusCode === 401 ? signInRequired() : error)
      );
    });

  const { locale } = await getStorefrontContext();

  return mapOrderDetail(order, locale);
}

export async function getMyProfile() {
  return getAuthenticatedCustomerProfile();
}
