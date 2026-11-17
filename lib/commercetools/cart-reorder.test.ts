/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockAddLineItems,
  mockGetGuestCart,
  mockGetMyOrder,
  mockGetProductAvailabilityBySkus,
  mockResolveCartForAdd,
} = vi.hoisted(() => ({
  mockAddLineItems: vi.fn(),
  mockResolveCartForAdd: vi.fn(
    async (): Promise<{ lineItems: Array<{ sku?: string; quantity: number }> }> => ({
      lineItems: [],
    }),
  ),
  mockGetGuestCart: vi.fn(
    async (): Promise<{ lineItems: Array<{ sku?: string; quantity: number }> } | null> => null,
  ),
  mockGetMyOrder: vi.fn(),
  mockGetProductAvailabilityBySkus: vi.fn(
    async (skus: readonly string[]) =>
      new Map(
        skus.map((sku) => [
          sku,
          {
            isOnStock: true,
            status: 'in_stock' as 'in_stock' | 'low_stock' | 'out_of_stock',
          },
        ]),
      ),
  ),
}));

vi.mock('./cart', () => ({
  addLineItems: mockAddLineItems,
  getGuestCart: mockGetGuestCart,
  resolveCartForAdd: mockResolveCartForAdd,
}));

vi.mock('./customer-api', () => ({
  getMyOrder: mockGetMyOrder,
}));

vi.mock('./products', () => ({
  getProductAvailabilityBySkus: mockGetProductAvailabilityBySkus,
}));

import {
  NothingToReorderError,
  reorderOrder,
  ReorderUnauthorizedError,
} from './cart-reorder';
import { CustomerOrderNotFoundError } from './domain-errors';

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
    mockGetGuestCart.mockResolvedValue(null);
    mockResolveCartForAdd.mockResolvedValue({ lineItems: [] });
    mockGetProductAvailabilityBySkus.mockImplementation(
      async (skus) =>
        new Map(skus.map((sku) => [sku, { isOnStock: true, status: 'in_stock' as const }])),
    );
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

    mockGetProductAvailabilityBySkus.mockResolvedValueOnce(
      new Map([
        ['SKU-OOS', { isOnStock: false, status: 'out_of_stock' as const }],
        ['SKU-OK', { isOnStock: true, status: 'in_stock' as const }],
      ]),
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

  it('skips skus that are no longer found in the catalog', async () => {
    mockGetMyOrder.mockResolvedValue({
      id: 'order-1',
      createdAt: '2026-07-01T00:00:00.000Z',
      orderState: 'Open',
      paymentStatus: 'Paid',
      total: money(4000),
      payments: [],
      lineItems: [
        {
          id: 'li-1',
          name: 'Discontinued',
          sku: 'SKU-MISSING',
          quantity: 1,
          unitPrice: money(1000),
          totalPrice: money(1000),
        },
        {
          id: 'li-2',
          name: 'In stock',
          sku: 'SKU-OK',
          quantity: 2,
          unitPrice: money(1500),
          totalPrice: money(3000),
        },
      ],
    });

    // A SKU missing from the catalog is a SKU absent from the Map.
    mockGetProductAvailabilityBySkus.mockResolvedValueOnce(
      new Map([['SKU-OK', { isOnStock: true, status: 'in_stock' as const }]]),
    );

    mockAddLineItems.mockResolvedValue({
      id: 'cart-1',
      itemCount: 2,
      lineItems: [],
    });

    const result = await reorderOrder('order-1');

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(mockAddLineItems).toHaveBeenCalledWith(
      [{ sku: 'SKU-OK', quantity: 2 }],
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
    mockGetProductAvailabilityBySkus.mockResolvedValue(
      new Map([['SKU-OOS', { isOnStock: false, status: 'out_of_stock' as const }]]),
    );

    await expect(reorderOrder('order-1')).rejects.toBeInstanceOf(
      NothingToReorderError,
    );
    expect(mockAddLineItems).not.toHaveBeenCalled();
  });

  it('checks availability for all order lines in one call', async () => {
    mockGetMyOrder.mockResolvedValue({
      id: 'order-1',
      createdAt: '2026-07-01T00:00:00.000Z',
      orderState: 'Open',
      paymentStatus: 'Paid',
      total: money(3000),
      payments: [],
      lineItems: [
        { id: 'li-1', name: 'A', sku: 'SKU-1', quantity: 1, unitPrice: money(1000), totalPrice: money(1000) },
        { id: 'li-2', name: 'B', sku: 'SKU-2', quantity: 2, unitPrice: money(1000), totalPrice: money(2000) },
      ],
    });
    mockAddLineItems.mockResolvedValue({ id: 'cart-1', itemCount: 3, lineItems: [] });

    await expect(reorderOrder('order-1')).resolves.toMatchObject({ added: 2, skipped: 0 });

    expect(mockGetProductAvailabilityBySkus).toHaveBeenCalledTimes(1);
    expect(mockGetProductAvailabilityBySkus).toHaveBeenCalledWith(['SKU-1', 'SKU-2']);
  });

  describe('line quantity cap', () => {
    const orderLine = (id: string, sku: string, quantity: number) => ({
      id,
      name: sku,
      sku,
      quantity,
      unitPrice: money(100),
      totalPrice: money(100 * quantity),
    });

    const givenOrder = (lineItems: ReturnType<typeof orderLine>[]) =>
      mockGetMyOrder.mockResolvedValue({
        id: 'order-1',
        createdAt: '2026-07-01T00:00:00.000Z',
        orderState: 'Open',
        paymentStatus: 'Paid',
        total: money(1000),
        payments: [],
        lineItems,
      });

    it('clamps a line to the quantity that still fits in the cart', async () => {
      givenOrder([orderLine('li-1', 'SKU-OK', 20)]);
      mockResolveCartForAdd.mockResolvedValue({ lineItems: [{ sku: 'SKU-OK', quantity: 90 }] });
      mockAddLineItems.mockResolvedValue({ id: 'cart-1', itemCount: 99, lineItems: [] });

      const result = await reorderOrder('order-1');

      expect(mockAddLineItems).toHaveBeenCalledWith([{ sku: 'SKU-OK', quantity: 9 }], {
        checkAvailability: false,
      });
      expect(result.added).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('skips and reports a line whose sku is already at the cap', async () => {
      givenOrder([orderLine('li-1', 'SKU-FULL', 1), orderLine('li-2', 'SKU-OK', 2)]);
      mockResolveCartForAdd.mockResolvedValue({ lineItems: [{ sku: 'SKU-FULL', quantity: 99 }] });
      mockAddLineItems.mockResolvedValue({ id: 'cart-1', itemCount: 101, lineItems: [] });

      const result = await reorderOrder('order-1');

      expect(mockAddLineItems).toHaveBeenCalledWith([{ sku: 'SKU-OK', quantity: 2 }], {
        checkAvailability: false,
      });
      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('throws NothingToReorder when every line is already at the cap', async () => {
      givenOrder([orderLine('li-1', 'SKU-FULL', 1)]);
      mockResolveCartForAdd.mockResolvedValue({ lineItems: [{ sku: 'SKU-FULL', quantity: 99 }] });

      await expect(reorderOrder('order-1')).rejects.toBeInstanceOf(NothingToReorderError);
      expect(mockAddLineItems).not.toHaveBeenCalled();
    });

    it('plans the cap against the cart addLineItems will update when there is no cart cookie', async () => {
      // Signed in, no cart cookie (getGuestCart answers null), active customer cart already holds 90.
      givenOrder([orderLine('li-1', 'SKU-OK', 20)]);
      mockGetGuestCart.mockResolvedValue(null);
      mockResolveCartForAdd.mockResolvedValue({ lineItems: [{ sku: 'SKU-OK', quantity: 90 }] });
      mockAddLineItems.mockResolvedValue({ id: 'cart-1', itemCount: 99, lineItems: [] });

      await expect(reorderOrder('order-1')).resolves.toMatchObject({ added: 1, skipped: 0 });

      expect(mockAddLineItems).toHaveBeenCalledWith([{ sku: 'SKU-OK', quantity: 9 }], {
        checkAvailability: false,
      });
      expect(mockGetGuestCart).not.toHaveBeenCalled();
    });

    it('counts repeated skus of one order against the same cap', async () => {
      givenOrder([orderLine('li-1', 'SKU-OK', 60), orderLine('li-2', 'SKU-OK', 60)]);
      mockAddLineItems.mockResolvedValue({ id: 'cart-1', itemCount: 99, lineItems: [] });

      const result = await reorderOrder('order-1');

      expect(mockAddLineItems).toHaveBeenCalledWith(
        [
          { sku: 'SKU-OK', quantity: 60 },
          { sku: 'SKU-OK', quantity: 39 },
        ],
        { checkAvailability: false },
      );
      expect(result.skipped).toBe(0);
    });

    it('clamps an order line that is itself above 99', async () => {
      givenOrder([orderLine('li-1', 'SKU-OK', 150)]);
      mockAddLineItems.mockResolvedValue({ id: 'cart-1', itemCount: 99, lineItems: [] });

      await reorderOrder('order-1');

      expect(mockAddLineItems).toHaveBeenCalledWith([{ sku: 'SKU-OK', quantity: 99 }], {
        checkAvailability: false,
      });
    });
  });
});
