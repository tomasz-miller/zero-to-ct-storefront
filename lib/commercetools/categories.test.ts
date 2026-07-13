/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCategory } from '@/test/fixtures/category';

const { mockExecute, mockApiRoot } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockApiRoot = {
    categories: vi.fn(() => ({
      get: vi.fn(() => ({ execute: mockExecute })),
    })),
  };
  return { mockExecute, mockApiRoot };
});

vi.mock('./api-root', () => ({
  apiRoot: mockApiRoot,
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

import {
  getCategoryByKey,
  getCategoryBySlug,
  getNavigationCategories,
  isValidCategorySlug,
  listCategoryTree,
} from './categories';

describe('listCategoryTree', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockApiRoot.categories.mockClear();
  });

  it('builds a parent-child tree sorted by orderHint', async () => {
    mockExecute.mockResolvedValueOnce({
      body: {
        results: [
          createCategory({
            id: 'cat-root',
            key: 'furniture',
            name: { 'en-GB': 'Furniture' },
            slug: { 'en-GB': 'furniture' },
            orderHint: '0.1',
          }),
          createCategory({
            id: 'cat-child',
            key: 'bedroom',
            name: { 'en-GB': 'Bedroom' },
            slug: { 'en-GB': 'bedroom' },
            parent: { typeId: 'category', id: 'cat-root' },
            orderHint: '0.2',
          }),
        ],
        total: 2,
      },
    });

    const tree = await listCategoryTree();

    expect(tree).toHaveLength(1);
    expect(tree[0]?.slug).toBe('furniture');
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.slug).toBe('bedroom');
  });

  it('falls back to en-GB when locale-specific name is missing', async () => {
    mockExecute.mockResolvedValueOnce({
      body: {
        results: [
          createCategory({
            name: { 'en-GB': 'Lighting' },
            slug: { 'en-GB': 'lighting' },
          }),
        ],
        total: 1,
      },
    });

    const tree = await listCategoryTree({ locale: 'de-DE' });

    expect(tree[0]?.name).toBe('Lighting');
    expect(tree[0]?.slug).toBe('lighting');
  });

  it('paginates through all category pages', async () => {
    mockExecute
      .mockResolvedValueOnce({
        body: {
          results: [
            createCategory({
              id: 'cat-1',
              name: { 'en-GB': 'Page One' },
              slug: { 'en-GB': 'page-one' },
            }),
          ],
          total: 2,
        },
      })
      .mockResolvedValueOnce({
        body: {
          results: [
            createCategory({
              id: 'cat-2',
              name: { 'en-GB': 'Page Two' },
              slug: { 'en-GB': 'page-two' },
            }),
          ],
          total: 2,
        },
      });

    const tree = await listCategoryTree();

    expect(tree).toHaveLength(2);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });
});

describe('getCategoryBySlug', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockApiRoot.categories.mockClear();
  });

  it('returns null for malformed slug without querying commercetools', async () => {
    const category = await getCategoryBySlug('bad"slug');

    expect(category).toBeNull();
    expect(mockApiRoot.categories).not.toHaveBeenCalled();
  });

  it('rejects slugs outside the allowed pattern', () => {
    expect(isValidCategorySlug('valid-slug')).toBe(true);
    expect(isValidCategorySlug('invalid slug')).toBe(false);
  });

  it('returns null when category is not found', async () => {
    mockExecute.mockResolvedValueOnce({
      body: { results: [] },
    });

    const category = await getCategoryBySlug('missing-category');
    expect(category).toBeNull();
  });

  it('returns mapped category when slug exists', async () => {
    mockExecute.mockResolvedValueOnce({
      body: {
        results: [
          createCategory({
            id: 'cat-bedroom',
            key: 'bedroom',
            name: { 'en-GB': 'Bedroom' },
            slug: { 'en-GB': 'bedroom' },
          }),
        ],
      },
    });

    const category = await getCategoryBySlug('bedroom');

    expect(category).toEqual({
      id: 'cat-bedroom',
      key: 'bedroom',
      name: 'Bedroom',
      slug: 'bedroom',
      parentId: undefined,
      orderHint: '0.1',
      children: [],
    });
  });
});

describe('getCategoryByKey', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('returns category by key', async () => {
    mockExecute.mockResolvedValueOnce({
      body: {
        results: [
          createCategory({
            id: 'cat-new',
            key: 'new-arrivals',
            name: { 'en-GB': 'New Arrivals' },
            slug: { 'en-GB': 'new-arrivals' },
          }),
        ],
      },
    });

    const category = await getCategoryByKey('new-arrivals');
    expect(category?.id).toBe('cat-new');
    expect(category?.slug).toBe('new-arrivals');
  });
});

describe('getNavigationCategories', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('excludes new-arrivals from navigation roots', async () => {
    mockExecute.mockResolvedValueOnce({
      body: {
        results: [
          createCategory({
            id: 'cat-new',
            key: 'new-arrivals',
            name: { 'en-GB': 'New Arrivals' },
            slug: { 'en-GB': 'new-arrivals' },
            orderHint: '0.0',
          }),
          createCategory({
            id: 'cat-furniture',
            key: 'furniture',
            name: { 'en-GB': 'Furniture' },
            slug: { 'en-GB': 'furniture' },
            orderHint: '0.1',
          }),
        ],
        total: 2,
      },
    });

    const navigation = await getNavigationCategories();

    expect(navigation).toHaveLength(1);
    expect(navigation[0]?.key).toBe('furniture');
  });
});
