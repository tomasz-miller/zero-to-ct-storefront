import { describe, expect, it } from 'vitest';

import {
  buildSlugWhere,
  isNewArrivalProduct,
  mapProjection,
  mapProjectionDetail,
  pickLocalized,
  pickPrice,
} from './product-mappers';
import { createProductProjection } from '@/test/fixtures/product-projection';

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
    });
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
