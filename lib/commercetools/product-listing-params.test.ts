import { describe, expect, it } from 'vitest';

import {
  buildProductListingHref,
  clampProductListingPage,
  formatProductListingRange,
  getDefaultProductListingSort,
  getMaxProductListingPage,
  getProductListingPageNumbers,
  getProductListingSortOptions,
  parseProductListingPage,
  parseProductListingSort,
  productListingOffset,
  productListingTotalPages,
} from './product-listing-params';

describe('product listing params', () => {
  it('uses relevance for search and newest for category defaults', () => {
    expect(getDefaultProductListingSort('search')).toBe('relevance');
    expect(getDefaultProductListingSort('category')).toBe('newest');
  });

  it('parses valid sort and page values with fallbacks', () => {
    expect(parseProductListingSort('price-asc', 'relevance')).toBe('price-asc');
    expect(parseProductListingSort('invalid', 'newest')).toBe('newest');
    expect(parseProductListingPage('3')).toBe(3);
    expect(parseProductListingPage('0')).toBe(1);
    expect(parseProductListingPage('abc')).toBe(1);
  });

  it('rejects relevance sort on category listings', () => {
    expect(parseProductListingSort('relevance', 'newest', 'category')).toBe(
      'newest',
    );
    expect(parseProductListingSort('relevance', 'relevance', 'search')).toBe(
      'relevance',
    );
  });

  it('caps page numbers to the Product Search offset limit', () => {
    expect(getMaxProductListingPage(24)).toBe(416);
    expect(parseProductListingPage('9999', 24)).toBe(416);
  });

  it('calculates offset and total pages', () => {
    expect(productListingOffset(1, 24)).toBe(0);
    expect(productListingOffset(2, 24)).toBe(24);
    expect(productListingTotalPages(0, 24)).toBe(1);
    expect(productListingTotalPages(25, 24)).toBe(2);
  });

  it('clamps page to available result pages', () => {
    expect(clampProductListingPage(3, 30, 24)).toBe(2);
    expect(clampProductListingPage(1, 30, 24)).toBe(1);
    expect(clampProductListingPage(500, 0, 24)).toBe(416);
  });

  it('builds listing hrefs without default sort or first page', () => {
    expect(
      buildProductListingHref(
        '/search',
        { q: 'bed', sort: 'relevance', page: 1 },
        { defaultSort: 'relevance' },
      ),
    ).toBe('/search?q=bed');

    expect(
      buildProductListingHref(
        '/search',
        { q: 'bed', sort: 'price-asc', page: 2 },
        { defaultSort: 'relevance' },
      ),
    ).toBe('/search?q=bed&sort=price-asc&page=2');
  });

  it('serializes active listing filters in hrefs', () => {
    expect(
      buildProductListingHref(
        '/search',
        {
          q: 'table',
          sort: 'relevance',
          filters: {
            attributes: { 'color-label': ['Oak'] },
            price: '100-300',
          },
        },
        { defaultSort: 'relevance' },
      ),
    ).toBe('/search?q=table&attr.color-label=Oak&price=100-300');
  });

  it('formats visible result ranges using clamped pages', () => {
    expect(
      formatProductListingRange({ page: 1, pageSize: 24, total: 0 }),
    ).toBeNull();
    expect(
      formatProductListingRange({ page: 1, pageSize: 24, total: 30 }),
    ).toBe('Showing 1–24 of 30');
    expect(
      formatProductListingRange({ page: 2, pageSize: 24, total: 30 }),
    ).toBe('Showing 25–30 of 30');
    expect(
      formatProductListingRange({ page: 3, pageSize: 24, total: 30 }),
    ).toBe('Showing 25–30 of 30');
  });

  it('returns category sort options without relevance', () => {
    expect(getProductListingSortOptions('category')).toEqual([
      'newest',
      'price-asc',
      'price-desc',
    ]);
  });

  it('returns a bounded page number window', () => {
    expect(
      getProductListingPageNumbers({ page: 5, totalPages: 10, maxVisible: 5 }),
    ).toEqual([3, 4, 5, 6, 7]);
  });
});
