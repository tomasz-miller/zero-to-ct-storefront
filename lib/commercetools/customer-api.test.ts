/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '@commercetools/platform-sdk';

const { mockGetCustomerAccessTokenForRender } = vi.hoisted(() => ({
  mockGetCustomerAccessTokenForRender: vi.fn(),
}));

const {
  mockCreateCustomerApiRoot,
  meOrdersGet,
  meOrdersExecute,
  meOrderWithId,
  meOrderByIdGet,
  meOrderByIdExecute,
} = vi.hoisted(() => {
  const meOrdersExecute = vi.fn();
  const meOrdersGet = vi.fn<(args: { queryArgs: { sort: string; limit: number; offset: number; expand: string[] } }) => { execute: typeof meOrdersExecute }>(() => ({ execute: meOrdersExecute }));
  const meOrderByIdExecute = vi.fn();
  const meOrderByIdGet = vi.fn<(args: { queryArgs: { expand: string[] } }) => { execute: typeof meOrderByIdExecute }>(() => ({ execute: meOrderByIdExecute }));
  const meOrderWithId = vi.fn<(args: { ID: string }) => { get: typeof meOrderByIdGet }>(() => ({ get: meOrderByIdGet }));
  const meChain = {
    me: () => ({
      orders: () => ({ get: meOrdersGet, withId: meOrderWithId }),
    }),
  };
  return { mockCreateCustomerApiRoot: vi.fn(() => meChain), meOrdersGet, meOrdersExecute, meOrderWithId, meOrderByIdGet, meOrderByIdExecute };
});

vi.mock('./customer-client', () => ({ createCustomerApiRoot: mockCreateCustomerApiRoot }));

vi.mock('./customer-auth', () => ({
  getCustomerAccessTokenForRender: mockGetCustomerAccessTokenForRender,
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
import { CustomerError } from './domain-errors';

function ctError(statusCode: number, code = 'Error', message = 'ct') {
  return Object.assign(new Error(message), {
    statusCode,
    code,
    body: { statusCode, message, errors: [{ code, message }] },
  });
}

beforeEach(() => {
  mockGetCustomerAccessTokenForRender.mockResolvedValue('tok-1');
});

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
    mockGetCustomerAccessTokenForRender.mockReset();
    meOrdersExecute.mockReset();
    meOrderByIdExecute.mockReset();
  });

  it('returns null when customer session is missing', async () => {
    mockGetCustomerAccessTokenForRender.mockResolvedValue(null);

    await expect(getMyOrder('order-1')).resolves.toBeNull();
  });

  it('maps a customer order by id', async () => {
    meOrderByIdExecute.mockResolvedValue({ body: createOrder() });

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
    expect(meOrderWithId).toHaveBeenCalledWith({ ID: 'order-1' });
    expect(meOrderByIdGet).toHaveBeenCalledWith({ queryArgs: { expand: ['paymentInfo.payments[*]'] } });
  });

  it('throws CustomerOrderNotFoundError for 404 responses', async () => {
    meOrderByIdExecute.mockRejectedValue(ctError(404, 'ResourceNotFound'));

    await expect(getMyOrder('missing-order')).rejects.toBeInstanceOf(
      CustomerOrderNotFoundError,
    );
  });

  it('throws for upstream errors', async () => {
    meOrderByIdExecute.mockRejectedValue(ctError(500));

    await expect(getMyOrder('order-1')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('getMyOrder throws CustomerOrderNotFoundError on a 404 SDK error', async () => {
    meOrderByIdExecute.mockRejectedValueOnce(ctError(404, 'ResourceNotFound'));
    await expect(getMyOrder('order-1')).rejects.toBeInstanceOf(CustomerOrderNotFoundError);
  });

  it('getMyOrder rethrows a 503 SDK error unchanged', async () => {
    meOrderByIdExecute.mockRejectedValueOnce(ctError(503));
    await expect(getMyOrder('order-1')).rejects.toMatchObject({ statusCode: 503 });
  });

  it('getMyOrder maps a 401 SDK error to the sign-in-required CustomerError', async () => {
    meOrderByIdExecute.mockRejectedValueOnce(ctError(401, 'invalid_token'));
    const error = await getMyOrder('order-1').catch((e) => e);
    expect(error).toBeInstanceOf(CustomerError);
    expect(error).not.toBeInstanceOf(CustomerOrderNotFoundError);
    expect(error).toMatchObject({ code: 'Unauthorized', status: 401, message: 'Sign in required' });
  });
});

describe('getMyOrders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetCustomerAccessTokenForRender.mockReset();
    meOrdersExecute.mockReset();
    meOrderByIdExecute.mockReset();
  });

  it('expands payment references for transaction-derived statuses', async () => {
    meOrdersExecute.mockResolvedValue({
      body: { results: [createOrder()], total: 1, count: 1, offset: 0 },
    });

    await getMyOrders();

    expect(meOrdersGet).toHaveBeenCalledWith({
      queryArgs: {
        sort: 'createdAt desc',
        limit: 20,
        offset: 0,
        expand: ['paymentInfo.payments[*]'],
      },
    });
  });

  it('getMyOrders lists through me().orders() with payment expansion', async () => {
    meOrdersExecute.mockResolvedValue({ body: { results: [], total: 0 } });
    await getMyOrders();
    expect(meOrdersGet).toHaveBeenCalledWith({ queryArgs: { sort: 'createdAt desc', limit: 20, offset: 0, expand: ['paymentInfo.payments[*]'] } });
  });

  // Owner decision 2026-11-16: an expired or revoked token on /me/orders answers like a missing session.
  it('getMyOrders maps a 401 SDK error to the sign-in-required CustomerError', async () => {
    meOrdersExecute.mockRejectedValueOnce(ctError(401, 'invalid_token'));
    const error = await getMyOrders().catch((e) => e);
    expect(error).toBeInstanceOf(CustomerError);
    expect(error).toMatchObject({ code: 'Unauthorized', status: 401, message: 'Sign in required' });
  });
});
