/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetValidCustomerAccessToken, mockGetMyOrders } = vi.hoisted(() => ({
  mockGetValidCustomerAccessToken: vi.fn(),
  mockGetMyOrders: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  getValidCustomerAccessToken: mockGetValidCustomerAccessToken,
}));

vi.mock('@/lib/commercetools/customer-api', () => ({
  getMyOrders: mockGetMyOrders,
}));

import { CustomerError } from '@/lib/commercetools/domain-errors';

import { GET } from './route';

function createRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/customer/orders${query}`);
}

describe('GET /api/customer/orders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetValidCustomerAccessToken.mockReset();
    mockGetMyOrders.mockReset();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue(null);

    const response = await GET(createRequest());

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid limit', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token');

    const response = await GET(createRequest('?limit=0'));

    expect(response.status).toBe(400);
  });

  it('returns orders on success', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token');
    mockGetMyOrders.mockResolvedValue({
      orders: [{ id: 'order-1' }],
      total: 1,
    });

    const response = await GET(createRequest('?limit=10&offset=0'));

    expect(response.status).toBe(200);
    expect(mockGetMyOrders).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    const body = await response.json();
    expect(body.orders).toHaveLength(1);
  });

  it('returns 401 Sign in required when commercetools rejects the customer token', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token');
    mockGetMyOrders.mockRejectedValue(new CustomerError('Unauthorized', 'Sign in required', 401));
    const response = await GET(createRequest());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Sign in required', code: 'Unauthorized' });
  });

  it('logs only an error summary, never the commercetools body or request, on unexpected errors', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetMyOrders.mockRejectedValue(
      Object.assign(new Error('boom'), {
        statusCode: 500,
        code: 'General',
        body: {
          statusCode: 500,
          message: 'ORDER-SECRET',
          errors: [{ code: 'General', message: 'ORDER-SECRET' }],
        },
      }),
    );

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Something went wrong. Please try again.');
    expect(typeof body.errorId).toBe('string');
    expect(JSON.stringify(log.mock.calls)).not.toContain('ORDER-SECRET');
    expect(log).toHaveBeenCalledWith(
      '[api/customer/orders]',
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('returns 500 when fetch fails', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token');
    mockGetMyOrders.mockRejectedValue(new Error('CT error'));

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
  });
});
