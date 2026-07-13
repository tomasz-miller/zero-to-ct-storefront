import type { Category } from '@commercetools/platform-sdk';

export function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastModifiedAt: '2024-01-01T00:00:00.000Z',
    key: 'furniture',
    name: { 'en-GB': 'Furniture' },
    slug: { 'en-GB': 'furniture' },
    ancestors: [],
    orderHint: '0.1',
    ...overrides,
  } as Category;
}
