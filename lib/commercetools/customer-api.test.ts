/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '@commercetools/platform-sdk';

const { mockGetValidCustomerAccessToken } = vi.hoisted(() => ({
  mockGetValidCustomerAccessToken: vi.fn(),
}));

vi.mock('./customer-auth', () => ({
  getValidCustomerAccessToken: mockGetValidCustomerAccessToken,
}));

vi.mock('./env', () => ({
  commercetoolsEnv: {
    apiUrl: 'https://api.example.com',
    projectKey: 'demo-project',
  },
}));

vi.mock('./storefront-context', () => ({
  getStorefrontContext: () => ({
    locale: 'en-GB',
    country: 'DE',
    currency: 'EUR',
  }),
}));

import {
  CustomerOrderNotFoundError,
  getMyOrder,
  getMyOrders,
} from './customer-api';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: '10001',
    createdAt: '2026-02-01T12:00:00.000Z',
    orderState: 'Open',
    paymentState: 'Paid',
    version: 1,
    lastModifiedAt: '2026-02-01T12:00:00.000Z',
    totalPrice: {
      centAmount: 12345,
      currencyCode: 'EUR',
      type: 'centPrecision',
      fractionDigits: 2,
    },
    lineItems: [],
    customLineItems: [],
    origin: 'Customer',
    shippingMode: 'Single',
    shipping: [],
    refusedGifts: [],
    syncInfo: [],
    ...overrides,
  };
}

describe('getMyOrder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetValidCustomerAccessToken.mockReset();
  });

  it('returns null when customer session is missing', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue(null);

    await expect(getMyOrder('order-1')).resolves.toBeNull();
  });

  it('maps a customer order by id', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('customer-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(createOrder()),
      }),
    );

    const order = await getMyOrder('order-1');

    expect(order).toMatchObject({
      id: 'order-1',
      orderNumber: '10001',
      total: {
        centAmount: 12345,
        currencyCode: 'EUR',
        formatted: '€123.45',
      },
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/demo-project/me/orders/order-1?expand=paymentInfo.payments[*]',
      {
        headers: {
          Authorization: 'Bearer customer-token',
        },
      },
    );
  });

  it('throws CustomerOrderNotFoundError for 404 responses', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('customer-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ statusCode: 404 }),
      }),
    );

    await expect(getMyOrder('missing-order')).rejects.toBeInstanceOf(
      CustomerOrderNotFoundError,
    );
  });

  it('throws for upstream errors', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('customer-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }),
    );

    await expect(getMyOrder('order-1')).rejects.toThrow(
      'Failed to fetch order (500)',
    );
  });
});

describe('getMyOrders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetValidCustomerAccessToken.mockReset();
  });

  it('expands payment references for transaction-derived statuses', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('customer-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            results: [createOrder()],
            total: 1,
            count: 1,
            offset: 0,
          }),
      }),
    );

    await getMyOrders();

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/demo-project/me/orders?sort=createdAt+desc&limit=20&offset=0&expand=paymentInfo.payments%5B*%5D',
      {
        headers: {
          Authorization: 'Bearer customer-token',
        },
      },
    );
  });
});
