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

import { getProductBySlug, listProducts } from './products';

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
