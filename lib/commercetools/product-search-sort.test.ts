import { describe, expect, it } from 'vitest';

import { buildProductSearchSort } from './product-search-sort';

describe('buildProductSearchSort', () => {
  it('builds relevance and newest sorts', () => {
    expect(buildProductSearchSort('relevance', 'EUR')).toEqual([
      { field: 'score', order: 'desc' },
    ]);
    expect(buildProductSearchSort('newest', 'EUR')).toEqual([
      { field: 'createdAt', order: 'desc' },
    ]);
  });

  it('scopes price sorts to the catalog currency', () => {
    expect(buildProductSearchSort('price-asc', 'EUR')).toEqual([
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
    ]);

    expect(buildProductSearchSort('price-desc', 'EUR')).toEqual([
      {
        field: 'variants.prices.centAmount',
        order: 'desc',
        mode: 'max',
        filter: {
          exact: {
            field: 'variants.prices.currencyCode',
            value: 'EUR',
          },
        },
      },
    ]);
  });
});
