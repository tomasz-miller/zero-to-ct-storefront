import { describe, expect, it } from 'vitest';

import {
  buildSlugWhere,
  isNewArrivalProduct,
  mapAvailability,
  mapProjection,
  mapProjectionDetail,
  pickLocalized,
  pickPrice,
  resolveAvailabilityStatus,
  toStorefrontAvailability,
} from './product-mappers';
import { createProductProjection } from '@/test/fixtures/product-projection';

describe('resolveAvailabilityStatus', () => {
  it('returns out_of_stock when not on stock', () => {
    expect(resolveAvailabilityStatus(false, 10)).toBe('out_of_stock');
  });

  it('returns out_of_stock when availableQuantity is 0', () => {
    expect(resolveAvailabilityStatus(true, 0)).toBe('out_of_stock');
  });

  it('returns low_stock at the threshold boundary', () => {
    expect(resolveAvailabilityStatus(true, 5)).toBe('low_stock');
  });

  it('returns in_stock above the threshold', () => {
    expect(resolveAvailabilityStatus(true, 6)).toBe('in_stock');
  });

  it('returns in_stock when quantity is undefined', () => {
    expect(resolveAvailabilityStatus(true)).toBe('in_stock');
  });
});

describe('toStorefrontAvailability', () => {
  it('keeps isOnStock false when quantity is 0', () => {
    expect(toStorefrontAvailability(true, 0)).toEqual({
      isOnStock: false,
      availableQuantity: 0,
      status: 'out_of_stock',
    });
  });
});

describe('pickLocalized', () => {
  it('returns value for requested locale', () => {
    expect(pickLocalized({ 'en-GB': 'Bed' }, 'en-GB')).toBe('Bed');
  });

  it('falls back to en-GB then en', () => {
    expect(pickLocalized({ 'en-GB': 'Bed' }, 'de-DE')).toBe('Bed');
    expect(pickLocalized({ en: 'Bed' }, 'de-DE')).toBe('Bed');
  });

  it('normalizes underscore locales', () => {
    expect(pickLocalized({ 'en-GB': 'Bed' }, 'en_GB')).toBe('Bed');
  });

  it('returns undefined for missing localized object', () => {
    expect(pickLocalized(undefined, 'en-GB')).toBeUndefined();
  });
});

describe('pickPrice', () => {
  it('prefers price in requested currency', () => {
    const projection = createProductProjection();
    const price = pickPrice(projection.masterVariant, 'GBP');
    expect(price).toEqual({ centAmount: 42900, currencyCode: 'GBP' });
  });

  it('falls back to first price when currency not found', () => {
    const projection = createProductProjection();
    const price = pickPrice(projection.masterVariant, 'USD');
    expect(price).toEqual({ centAmount: 49900, currencyCode: 'EUR' });
  });

  it('maps CT-selected discounted price from variant.price', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        price: {
          id: 'selected-price',
          value: {
            type: 'centPrecision',
            currencyCode: 'EUR',
            centAmount: 49900,
            fractionDigits: 2,
          },
          discounted: {
            value: {
              type: 'centPrecision',
              currencyCode: 'EUR',
              centAmount: 42415,
              fractionDigits: 2,
            },
            discount: {
              typeId: 'product-discount',
              id: 'pd-1',
            },
          },
        },
      },
    });

    const price = pickPrice(projection.masterVariant, 'EUR', 'DE');
    expect(price).toEqual({
      centAmount: 42415,
      currencyCode: 'EUR',
      originalCentAmount: 49900,
      isDiscounted: true,
    });
  });
});

describe('mapAvailability', () => {
  it('returns in stock when availability is missing', () => {
    const projection = createProductProjection();
    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: true,
      status: 'in_stock',
    });
  });

  it('maps explicit isOnStock false', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        availability: {
          isOnStock: false,
          availableQuantity: 0,
        },
      },
    });

    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: false,
      availableQuantity: 0,
      status: 'out_of_stock',
    });
  });

  it('maps low stock when availableQuantity is at or below threshold', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        availability: {
          isOnStock: true,
          availableQuantity: 3,
        },
      },
    });

    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: true,
      availableQuantity: 3,
      status: 'low_stock',
    });
  });

  it('maps in stock when availableQuantity is above threshold', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        availability: {
          isOnStock: true,
          availableQuantity: 20,
        },
      },
    });

    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: true,
      availableQuantity: 20,
      status: 'in_stock',
    });
  });

  it('maps low stock at the threshold boundary', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        availability: {
          isOnStock: true,
          availableQuantity: 5,
        },
      },
    });

    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: true,
      availableQuantity: 5,
      status: 'low_stock',
    });
  });

  it('treats isOnStock true with availableQuantity 0 as out of stock', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        availability: {
          isOnStock: true,
          availableQuantity: 0,
        },
      },
    });

    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: false,
      availableQuantity: 0,
      status: 'out_of_stock',
    });
  });

  it('maps channel availability when top-level isOnStock is absent', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        availability: {
          channels: {
            'channel-1': {
              isOnStock: true,
              availableQuantity: 5,
            } as never,
            'channel-2': {
              isOnStock: false,
              availableQuantity: 0,
            } as never,
          },
        },
      },
    });

    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: true,
      availableQuantity: 5,
      status: 'low_stock',
    });
  });

  it('uses the minimum on-stock channel quantity for low-stock messaging', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        availability: {
          channels: {
            'channel-1': {
              isOnStock: true,
              availableQuantity: 2,
            } as never,
            'channel-2': {
              isOnStock: true,
              availableQuantity: 8,
            } as never,
          },
        },
      },
    });

    expect(mapAvailability(projection.masterVariant)).toEqual({
      isOnStock: true,
      availableQuantity: 2,
      status: 'low_stock',
    });
  });
});

describe('mapProjection', () => {
  it('maps a valid projection to storefront product', () => {
    const result = mapProjection(createProductProjection(), 'en-GB', 'EUR');
    expect(result).toEqual({
      id: 'prod-1',
      key: undefined,
      name: 'Orion Double Bed',
      slug: 'orion-double-bed',
      sku: 'ORION-BED',
      imageUrl: 'https://example.com/orion.jpg',
      price: { centAmount: 49900, currencyCode: 'EUR' },
      availability: { isOnStock: true, status: 'in_stock' },
      hasMultipleVariants: false,
    });
  });

  it('flags products with additional variants', () => {
    const projection = createProductProjection({
      variants: [
        {
          id: 2,
          sku: 'ORION-BED-QUEEN',
          prices: [],
          images: [],
          attributes: [],
        },
      ],
    });

    expect(mapProjection(projection, 'en-GB', 'EUR')?.hasMultipleVariants).toBe(true);
  });

  it('returns null when name or slug is missing', () => {
    const projection = createProductProjection({ name: {}, slug: {} });
    expect(mapProjection(projection, 'en-GB', 'EUR')).toBeNull();
  });
});

describe('mapProjectionDetail', () => {
  it('includes description, images, and variants', () => {
    const result = mapProjectionDetail(createProductProjection(), 'en-GB', 'EUR');
    expect(result?.description).toBe('A comfortable double bed.');
    expect(result?.images).toEqual(['https://example.com/orion.jpg']);
    expect(result?.variants).toHaveLength(1);
  });
});

describe('buildSlugWhere', () => {
  it('builds multi-locale slug predicate', () => {
    expect(buildSlugWhere('orion-double-bed', 'en-GB')).toBe(
      'slug(en-GB="orion-double-bed") or slug(en-US="orion-double-bed") or slug(en="orion-double-bed")',
    );
  });
});

describe('isNewArrivalProduct', () => {
  it('detects new-arrival attribute', () => {
    const projection = createProductProjection({
      masterVariant: {
        ...createProductProjection().masterVariant,
        attributes: [{ name: 'new-arrival', value: true }],
      },
    });
    expect(isNewArrivalProduct(projection)).toBe(true);
  });

  it('detects new-arrivals category membership', () => {
    const projection = createProductProjection({
      categories: [{ typeId: 'category', id: 'cat-new' }],
    });
    expect(isNewArrivalProduct(projection, 'cat-new')).toBe(true);
  });

  it('returns false for regular products', () => {
    expect(isNewArrivalProduct(createProductProjection())).toBe(false);
  });
});
