import 'server-only';

import { addLineItems } from './cart';
import type { StorefrontCart } from './cart-mappers';
import { getMyOrder } from './customer-api';
import { NothingToReorderError, ReorderUnauthorizedError } from './domain-errors';
import { getProductAvailabilityBySku } from './products';

export { NothingToReorderError, ReorderUnauthorizedError };

export type ReorderResult = {
  cart: StorefrontCart;
  added: number;
  skipped: number;
};

export async function reorderOrder(orderId: string): Promise<ReorderResult> {
  const order = await getMyOrder(orderId);

  if (!order) {
    throw new ReorderUnauthorizedError();
  }

  let skipped = 0;
  const addable: Array<{ sku: string; quantity: number }> = [];

  for (const item of order.lineItems) {
    const sku = item.sku?.trim();
    if (!sku) {
      skipped += 1;
      continue;
    }

    const availability = await getProductAvailabilityBySku(sku);
    if (!availability || availability.status === 'out_of_stock') {
      skipped += 1;
      continue;
    }

    addable.push({
      sku,
      quantity: item.quantity,
    });
  }

  if (addable.length === 0) {
    throw new NothingToReorderError();
  }

  // Availability already filtered above — skip a second N+1 Product Search pass.
  const cart = await addLineItems(addable, { checkAvailability: false });

  return {
    cart,
    added: addable.length,
    skipped,
  };
}
