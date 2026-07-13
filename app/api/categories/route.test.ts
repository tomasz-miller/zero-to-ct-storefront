/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listCategoryTree } = vi.hoisted(() => ({
  listCategoryTree: vi.fn(),
}));

vi.mock('@/lib/commercetools/categories', () => ({
  listCategoryTree,
}));

import { GET } from './route';

describe('GET /api/categories', () => {
  beforeEach(() => {
    listCategoryTree.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns category tree with catalog locale', async () => {
    listCategoryTree.mockResolvedValue([
      {
        id: 'cat-1',
        key: 'furniture',
        name: 'Furniture',
        slug: 'furniture',
        orderHint: '0.1',
        children: [],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.categories).toHaveLength(1);
    expect(listCategoryTree).toHaveBeenCalledWith({ locale: 'en-GB' });
  });

  it('returns 500 when listCategoryTree throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    listCategoryTree.mockRejectedValue(new Error('CT unavailable'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to fetch categories' });
  });
});
