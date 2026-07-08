import type { ProductProjection } from '@commercetools/platform-sdk';

export function createProductProjection(
  overrides: Partial<ProductProjection> = {},
): ProductProjection {
  return {
    id: 'prod-1',
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastModifiedAt: '2024-01-01T00:00:00.000Z',
    productType: { typeId: 'product-type', id: 'pt-1' },
    name: { 'en-GB': 'Orion Double Bed' },
    slug: { 'en-GB': 'orion-double-bed' },
    description: { 'en-GB': 'A comfortable double bed.' },
    masterVariant: {
      id: 1,
      sku: 'ORION-BED',
      prices: [
        {
          id: 'price-1',
          value: { type: 'centPrecision', currencyCode: 'EUR', centAmount: 49900, fractionDigits: 2 },
        },
        {
          id: 'price-2',
          value: { type: 'centPrecision', currencyCode: 'GBP', centAmount: 42900, fractionDigits: 2 },
        },
      ],
      images: [{ url: 'https://example.com/orion.jpg', dimensions: { w: 800, h: 800 } }],
      attributes: [],
    },
    variants: [],
    ...overrides,
  } as ProductProjection;
}
