export type OrderVolumeLineItem = {
  productId: string;
  quantity: number;
};

export type OrderVolumeSource = {
  lineItems: OrderVolumeLineItem[];
};

/**
 * Rank product IDs by total units sold across orders (descending).
 * Pure helper — no CT I/O.
 */
export function rankProductIdsByOrderVolume(
  orders: readonly OrderVolumeSource[],
): string[] {
  const soldByProductId = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.lineItems) {
      const productId = item.productId?.trim();
      if (!productId || item.quantity <= 0) {
        continue;
      }

      soldByProductId.set(
        productId,
        (soldByProductId.get(productId) ?? 0) + item.quantity,
      );
    }
  }

  return [...soldByProductId.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .map(([productId]) => productId);
}
