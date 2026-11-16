import 'server-only';

import { MAX_LINE_ITEM_QUANTITY } from '@/lib/cart-limits';

import { addLineItems, resolveCartForAdd } from './cart';
import type { StorefrontCart } from './cart-mappers';
import { getMyOrder } from './customer-api';
import { NothingToReorderError, ReorderUnauthorizedError } from './domain-errors';
import { getProductAvailabilityBySkus } from './products';

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

  // Quantity per SKU the cart will hold once the lines planned so far are added.
  const cart = await resolveCartForAdd();
  const planned = new Map<string, number>();
  for (const line of cart.lineItems) {
    if (line.sku) planned.set(line.sku, (planned.get(line.sku) ?? 0) + line.quantity);
  }

  const orderSkus = [
    ...new Set(
      order.lineItems.map((item) => item.sku?.trim()).filter((sku): sku is string => !!sku),
    ),
  ];
  const availabilityBySku = await getProductAvailabilityBySkus(orderSkus);

  for (const item of order.lineItems) {
    const sku = item.sku?.trim();
    if (!sku) {
      skipped += 1;
      continue;
    }

    // A line may not exceed the per-line cap once merged: clamp to what still fits.
    const room = MAX_LINE_ITEM_QUANTITY - (planned.get(sku) ?? 0);
    if (room < 1) {
      skipped += 1;
      continue;
    }

    const availability = availabilityBySku.get(sku);
    if (!availability || availability.status === 'out_of_stock') {
      skipped += 1;
      continue;
    }

    const quantity = Math.min(item.quantity, room);
    planned.set(sku, (planned.get(sku) ?? 0) + quantity);
    addable.push({ sku, quantity });
  }

  if (addable.length === 0) {
    throw new NothingToReorderError();
  }

  // Availability already filtered above — skip a second N+1 Product Search pass.
  const updatedCart = await addLineItems(addable, { checkAvailability: false });

  return {
    cart: updatedCart,
    added: addable.length,
    skipped,
  };
}
