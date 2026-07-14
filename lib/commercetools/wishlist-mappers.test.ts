import type { ShoppingList } from '@commercetools/platform-sdk';
import { describe, expect, it } from 'vitest';

import { mapWishlist } from './wishlist-mappers';

describe('mapWishlist', () => {
  it('maps shopping list line items and sku collection', () => {
    const shoppingList = {
      id: 'list-1',
      version: 3,
      lineItems: [
        {
          id: 'line-1',
          productId: 'prod-1',
          name: { 'en-GB': 'Sample product' },
          productSlug: { 'en-GB': 'sample-product' },
          variantId: 1,
          quantity: 1,
          variant: {
            id: 1,
            sku: 'SKU-001',
            images: [{ url: 'https://example.com/image.jpg' }],
          },
        },
      ],
    } as unknown as ShoppingList;

    expect(mapWishlist(shoppingList, 'en-GB')).toEqual({
      id: 'list-1',
      version: 3,
      itemCount: 1,
      skus: ['SKU-001'],
      lineItems: [
        {
          id: 'line-1',
          productId: 'prod-1',
          name: 'Sample product',
          slug: 'sample-product',
          sku: 'SKU-001',
          variantId: 1,
          imageUrl: 'https://example.com/image.jpg',
          quantity: 1,
        },
      ],
    });
  });
});
