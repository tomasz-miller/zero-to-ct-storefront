/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockAddLineItems,
  mockGetMyOrder,
  mockGetProductAvailabilityBySku,
} = vi.hoisted(() => ({
  mockAddLineItems: vi.fn(),
  mockGetMyOrder: vi.fn(),
  mockGetProductAvailabilityBySku: vi.fn(async () => ({
    isOnStock: true,
    status: 'in_stock' as 'in_stock' | 'low_stock' | 'out_of_stock',
  })),
}));

vi.mock('./cart', () => ({
  addLineItems: mockAddLineItems,
}));

vi.mock('./customer-api', () => ({
  getMyOrder: mockGetMyOrder,
  CustomerOrderNotFoundError: class CustomerOrderNotFoundError extends Error {
    constructor() {
      super('Order not found');
      this.name = 'CustomerOrderNotFoundError';
    }
  },
}));

vi.mock('./products', () => ({
  getProductAvailabilityBySku: mockGetProductAvailabilityBySku,
}));

import {
  NothingToReorderError,
  reorderOrder,
  ReorderUnauthorizedError,
} from './cart-reorder';
import { CustomerOrderNotFoundError } from './customer-api';

function money(centAmount: number) {
  return {
    centAmount,
    currencyCode: 'EUR',
    formatted: `€${(centAmount / 100).toFixed(2)}`,
  };
}

describe('reorderOrder', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockGetProductAvailabilityBySku.mockResolvedValue({
      isOnStock: true,
      status: 'in_stock',
    });
  });

  it('throws when the customer is not signed in', async () => {
    mockGetMyOrder.mockResolvedValue(null);

    await expect(reorderOrder('order-1')).rejects.toBeInstanceOf(
      ReorderUnauthorizedError,
    );
  });

  it('propagates missing orders', async () => {
    mockGetMyOrder.mockRejectedValue(new CustomerOrderNotFoundError());

    await expect(reorderOrder('missing')).rejects.toBeInstanceOf(
      CustomerOrderNotFoundError,
    );
  });

  it('skips items without sku and out-of-stock skus, then batch-adds the rest', async () => {
    mockGetMyOrder.mockResolvedValue({
      id: 'order-1',
      createdAt: '2026-07-01T00:00:00.000Z',
      orderState: 'Open',
      paymentStatus: 'Paid',
      total: money(5000),
      payments: [],
      lineItems: [
        {
          id: 'li-1',
          name: 'No SKU',
          quantity: 1,
          unitPrice: money(1000),
          totalPrice: money(1000),
        },
        {
          id: 'li-2',
          name: 'OOS',
          sku: 'SKU-OOS',
          quantity: 2,
          unitPrice: money(1000),
          totalPrice: money(2000),
        },
        {
          id: 'li-3',
          name: 'In stock',
          sku: 'SKU-OK',
          quantity: 3,
          unitPrice: money(1000),
          totalPrice: money(3000),
        },
      ],
    });

    mockGetProductAvailabilityBySku.mockImplementation(
      (async (sku: string) => {
        if (sku === 'SKU-OOS') {
          return { isOnStock: false, status: 'out_of_stock' as const };
        }
        return { isOnStock: true, status: 'in_stock' as const };
      }) as typeof mockGetProductAvailabilityBySku,
    );

    mockAddLineItems.mockResolvedValue({
      id: 'cart-1',
      itemCount: 3,
      lineItems: [],
    });

    const result = await reorderOrder('order-1');

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(2);
    expect(mockAddLineItems).toHaveBeenCalledWith(
      [{ sku: 'SKU-OK', quantity: 3 }],
      { checkAvailability: false },
    );
  });

  it('throws when nothing can be added', async () => {
    mockGetMyOrder.mockResolvedValue({
      id: 'order-1',
      createdAt: '2026-07-01T00:00:00.000Z',
      orderState: 'Open',
      paymentStatus: 'Paid',
      total: money(1000),
      payments: [],
      lineItems: [
        {
          id: 'li-1',
          name: 'OOS',
          sku: 'SKU-OOS',
          quantity: 1,
          unitPrice: money(1000),
          totalPrice: money(1000),
        },
      ],
    });
    mockGetProductAvailabilityBySku.mockResolvedValue({
      isOnStock: false,
      status: 'out_of_stock',
    });

    await expect(reorderOrder('order-1')).rejects.toBeInstanceOf(
      NothingToReorderError,
    );
    expect(mockAddLineItems).not.toHaveBeenCalled();
  });
});
