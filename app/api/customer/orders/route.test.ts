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

  it('returns 500 when fetch fails', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token');
    mockGetMyOrders.mockRejectedValue(new Error('CT error'));

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
  });
});
