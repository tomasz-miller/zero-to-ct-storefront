import 'server-only';

import { apiRoot } from './api-root';
import { getLastOrderSession } from './last-order-session';

/**
 * Confirms the order remembered in the sealed `ct_last_order` cookie: the order must
 * exist and must have been placed from the cart stored in the same cookie.
 */
export async function getConfirmedOrderForSession(): Promise<{ orderNumber: string } | null> {
  const session = await getLastOrderSession();
  if (!session) {
    return null;
  }

  try {
    const response = await apiRoot
      .orders()
      .withOrderNumber({ orderNumber: session.orderNumber })
      .get()
      .execute();

    if (response.body.cart?.id !== session.cartId) {
      return null;
    }

    return { orderNumber: response.body.orderNumber ?? session.orderNumber };
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    error.statusCode === 404
  );
}
