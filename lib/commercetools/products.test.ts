/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProductProjection } from '@/test/fixtures/product-projection';

const { mockExecute, mockApiRoot } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockApiRoot = {
    products: vi.fn(() => ({
      search: vi.fn(() => ({
        post: vi.fn(() => ({ execute: mockExecute })),
      })),
    })),
    productProjections: vi.fn(() => ({
      get: vi.fn(() => ({ execute: mockExecute })),
    })),
    categories: vi.fn(() => ({
      get: vi.fn(() => ({ execute: mockExecute })),
    })),
  };
  return { mockExecute, mockApiRoot };
});

vi.mock('./api-root', () => ({
  apiRoot: mockApiRoot,
}));

import {
  getProductBySlug,
  listNewArrivalProducts,
  listProducts,
} from './products';

describe('listProducts', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockApiRoot.products.mockClear();
    mockApiRoot.productProjections.mockClear();
  });

  it('returns mapped products from projections when no query', async () => {
    mockExecute.mockResolvedValueOnce({
      body: {
        results: [createProductProjection()],
        total: 1,
      },
    });

    const result = await listProducts({ limit: 12 });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.slug).toBe('orion-double-bed');
    expect(result.total).toBe(1);
  });

  it('searches then fetches projections when query is provided', async () => {
    mockExecute
      .mockResolvedValueOnce({
        body: {
          results: [{ id: 'prod-1' }],
          total: 1,
        },
      })
      .mockResolvedValueOnce({
        body: {
          results: [createProductProjection()],
          total: 1,
        },
      });

    const result = await listProducts({ query: 'bed' });

    expect(mockApiRoot.products).toHaveBeenCalled();
    expect(result.products).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('returns empty list when search finds no products', async () => {
    mockExecute.mockResolvedValueOnce({
      body: {
        results: [],
        total: 0,
      },
    });

    const result = await listProducts({ query: 'missing-product' });

    expect(result).toEqual({ products: [], total: 0 });
    expect(mockApiRoot.productProjections).not.toHaveBeenCalled();
  });

  it('preserves Product Search order when fetching projections by category', async () => {
    const firstProjection = createProductProjection({
      id: 'prod-first',
      name: { 'en-GB': 'First Product' },
      slug: { 'en-GB': 'first-product' },
    });
    const secondProjection = createProductProjection({
      id: 'prod-second',
      name: { 'en-GB': 'Second Product' },
      slug: { 'en-GB': 'second-product' },
    });

    mockExecute
      .mockResolvedValueOnce({
        body: {
          results: [{ id: 'prod-first' }, { id: 'prod-second' }],
          total: 2,
        },
      })
      .mockResolvedValueOnce({
        body: {
          results: [secondProjection, firstProjection],
        },
      });

    const result = await listProducts({ categoryId: 'cat-bedroom' });

    expect(mockApiRoot.products).toHaveBeenCalled();
    expect(result.products.map((product) => product.id)).toEqual([
      'prod-first',
      'prod-second',
    ]);
    expect(result.total).toBe(2);
  });

  it('passes sort and pagination to Product Search for queries', async () => {
    const postMock = vi.fn(() => ({ execute: mockExecute }));
    mockApiRoot.products.mockReturnValue({
      search: vi.fn(() => ({ post: postMock })),
    });

    mockExecute
      .mockResolvedValueOnce({
        body: {
          results: [{ id: 'prod-1' }],
          total: 1,
        },
      })
      .mockResolvedValueOnce({
        body: {
          results: [createProductProjection()],
        },
      });

    await listProducts({
      query: 'bed',
      limit: 24,
      offset: 24,
      sort: 'price-asc',
      currency: 'EUR',
    });

    expect(postMock).toHaveBeenCalledWith({
      body: expect.objectContaining({
        limit: 24,
        offset: 24,
        sort: [
          {
            field: 'variants.prices.centAmount',
            order: 'asc',
            mode: 'min',
            filter: {
              exact: {
                field: 'variants.prices.currencyCode',
                value: 'EUR',
              },
            },
          },
        ],
      }),
    });
  });
});

describe('listNewArrivalProducts', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockApiRoot.categories.mockClear();
    mockApiRoot.products.mockClear();
    mockApiRoot.productProjections.mockClear();
  });

  it('returns empty list when new-arrivals category is missing', async () => {
    mockExecute.mockResolvedValueOnce({
      body: { results: [] },
    });

    const result = await listNewArrivalProducts();

    expect(result).toEqual({ products: [], total: 0 });
    expect(mockApiRoot.products).not.toHaveBeenCalled();
  });

  it('lists products from the new-arrivals category', async () => {
    mockExecute
      .mockResolvedValueOnce({
        body: {
          results: [
            {
              id: 'cat-new',
              key: 'new-arrivals',
              name: { 'en-GB': 'New Arrivals' },
              slug: { 'en-GB': 'new-arrivals' },
              orderHint: '0.1',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        body: {
          results: [{ id: 'prod-new' }],
          total: 1,
        },
      })
      .mockResolvedValueOnce({
        body: {
          results: [
            createProductProjection({
              id: 'prod-new',
              name: { 'en-GB': 'New Lamp' },
              slug: { 'en-GB': 'new-lamp' },
            }),
          ],
        },
      });

    const result = await listNewArrivalProducts();

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.slug).toBe('new-lamp');
    expect(result.total).toBe(1);
  });
});

describe('getProductBySlug', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('returns null when product is not found', async () => {
    mockExecute.mockResolvedValueOnce({
      body: { results: [] },
    });

    const result = await getProductBySlug('missing-slug');
    expect(result).toBeNull();
  });

  it('returns product detail when projection exists', async () => {
    mockExecute.mockResolvedValueOnce({
      body: { results: [createProductProjection()] },
    });

    const result = await getProductBySlug('orion-double-bed');
    expect(result?.name).toBe('Orion Double Bed');
    expect(result?.variants).toHaveLength(1);
  });
});
