/**
 * @vitest-environment node
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listProducts } = vi.hoisted(() => ({
  listProducts: vi.fn(),
}));

vi.mock('@/lib/commercetools/products', () => ({
  listProducts,
}));

import { GET } from './route';

describe('GET /api/products', () => {
  beforeEach(() => {
    listProducts.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns products with default catalog locale en-GB and EUR currency', async () => {
    listProducts.mockResolvedValue({
      products: [{ id: 'prod-1', name: 'Bed', slug: 'bed' }],
      total: 1,
    });

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.products).toHaveLength(1);
    expect(listProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en-GB',
        currency: 'EUR',
        limit: 12,
        offset: 0,
        sort: 'newest',
      }),
    );
  });

  it('passes search query, pagination, and sort params', async () => {
    listProducts.mockResolvedValue({ products: [], total: 0 });

    const request = new NextRequest(
      'http://localhost:3000/api/products?q=bed&limit=5&offset=10&sort=price-desc&locale=de-DE&currency=EUR',
    );
    await GET(request);

    expect(listProducts).toHaveBeenCalledWith({
      limit: 5,
      offset: 10,
      locale: 'de-DE',
      currency: 'EUR',
      query: 'bed',
      sort: 'price-desc',
      filters: {
        attributes: {},
        price: undefined,
      },
    });
  });

  it('returns 500 when listProducts throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    listProducts.mockRejectedValue(new Error('CT unavailable'));

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to fetch products' });
  });
});
