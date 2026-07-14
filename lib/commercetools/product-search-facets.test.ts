import { describe, expect, it } from 'vitest';

import type { SearchableAttributeFacetConfig } from './searchable-product-attribute-configs';
import {
  buildFilterQuery,
  buildProductSearchFacetDefinitions,
  combineProductSearchQuery,
  mapFacetResults,
  parseProductListingFilters,
  PRODUCT_LISTING_ATTRIBUTE_PARAM_PREFIX,
  serializeProductListingFilters,
  setProductListingPriceFilter,
  productListingFiltersEqual,
  sanitizeProductListingFilters,
  hasActiveProductListingFilters,
  toggleProductListingFilterValue,
} from './product-search-facets';

const attributeConfigs: SearchableAttributeFacetConfig[] = [
  {
    name: 'color-label',
    label: 'Colour Label',
    field: 'variants.attributes.color-label',
    filterField: 'variants.attributes.color-label',
    fieldType: 'ltext',
    language: 'en-GB',
  },
  {
    name: 'finish-label',
    label: 'Finish Label',
    field: 'variants.attributes.finish-label',
    filterField: 'variants.attributes.finish-label',
    fieldType: 'ltext',
    language: 'en-GB',
  },
];

describe('product search facets', () => {
  it('parses and serializes dynamic attribute filters from URL params', () => {
    const filters = parseProductListingFilters({
      [`${PRODUCT_LISTING_ATTRIBUTE_PARAM_PREFIX}color-label`]: 'Black, Tan',
      [`${PRODUCT_LISTING_ATTRIBUTE_PARAM_PREFIX}finish-label`]: 'Gold',
      price: '100-300',
    });

    expect(filters).toEqual({
      attributes: {
        'color-label': ['Black', 'Tan'],
        'finish-label': ['Gold'],
      },
      price: '100-300',
    });
    expect(serializeProductListingFilters(filters)).toEqual({
      'attr.color-label': 'Black,Tan',
      'attr.finish-label': 'Gold',
      price: '100-300',
    });
  });

  it('maps legacy color and finish params to attribute filters', () => {
    expect(
      parseProductListingFilters({ color: 'Black', finish: 'Gold' }).attributes,
    ).toEqual({
      'color-label': ['Black'],
      'finish-label': ['Gold'],
    });
  });

  it('drops unknown attribute filters during sanitization', () => {
    const filters = parseProductListingFilters({
      'attr.color-label': 'Black',
      'attr.unknown-attr': 'foo',
    });

    expect(
      sanitizeProductListingFilters(filters, attributeConfigs),
    ).toEqual({
      attributes: { 'color-label': ['Black'] },
      price: undefined,
    });
    expect(hasActiveProductListingFilters(
      sanitizeProductListingFilters(filters, attributeConfigs),
    )).toBe(true);
    expect(hasActiveProductListingFilters(
      sanitizeProductListingFilters(
        parseProductListingFilters({ 'attr.unknown-attr': 'foo' }),
        attributeConfigs,
      ),
    )).toBe(false);
  });

  it('compares listing filters by serialized URL params', () => {
    const left = parseProductListingFilters({
      'attr.color-label': 'Black',
      price: '100-300',
    });
    const right = parseProductListingFilters({
      'attr.color-label': 'Black,Tan',
      price: '100-300',
    });

    expect(productListingFiltersEqual(left, left)).toBe(true);
    expect(productListingFiltersEqual(left, right)).toBe(false);
  });

  it('builds attribute and price filter queries from product type config', () => {
    const filters = parseProductListingFilters({
      'attr.color-label': 'Black',
      'attr.finish-label': 'Gold',
      price: 'under-100',
    });

    expect(buildFilterQuery(filters, attributeConfigs, 'EUR')).toEqual({
      and: [
        {
          filter: [
            {
              exact: {
                field: 'variants.attributes.color-label',
                fieldType: 'ltext',
                language: 'en-GB',
                value: 'Black',
              },
            },
          ],
        },
        {
          filter: [
            {
              exact: {
                field: 'variants.attributes.finish-label',
                fieldType: 'ltext',
                language: 'en-GB',
                value: 'Gold',
              },
            },
          ],
        },
        {
          filter: [
            {
              exact: {
                field: 'variants.prices.currencyCode',
                value: 'EUR',
              },
            },
            {
              range: {
                field: 'variants.prices.centAmount',
                lt: 10_000,
              },
            },
          ],
        },
      ],
    });
  });

  it('builds facet definitions from searchable attribute config', () => {
    expect(buildProductSearchFacetDefinitions(attributeConfigs, 'EUR')).toEqual([
      {
        ranges: {
          name: 'price',
          field: 'variants.prices.centAmount',
          filter: {
            exact: {
              field: 'variants.prices.currencyCode',
              value: 'EUR',
            },
          },
          ranges: [
            { key: 'under-100', to: 10_000 },
            { key: '100-300', from: 10_000, to: 30_000 },
            { key: '300-plus', from: 30_000 },
          ],
        },
      },
      {
        distinct: {
          name: 'color-label',
          field: 'variants.attributes.color-label',
          fieldType: 'ltext',
          language: 'en-GB',
          limit: 20,
        },
      },
      {
        distinct: {
          name: 'finish-label',
          field: 'variants.attributes.finish-label',
          fieldType: 'ltext',
          language: 'en-GB',
          limit: 20,
        },
      },
    ]);
  });

  it('maps facet buckets using product type labels and hides empty facets', () => {
    expect(
      mapFacetResults(
        [
          {
            name: 'color-label',
            buckets: [
              { key: 'Black', count: 3 },
              { key: 'Tan', count: 0 },
            ],
          },
          {
            name: 'finish-label',
            buckets: [],
          },
          {
            name: 'price',
            buckets: [{ key: 'under-100', count: 2 }],
          },
        ],
        attributeConfigs,
      ),
    ).toEqual([
      {
        id: 'color-label',
        label: 'Colour Label',
        kind: 'attribute',
        buckets: [{ key: 'Black', label: 'Black', count: 3 }],
      },
      {
        id: 'price',
        label: 'Price',
        kind: 'price',
        buckets: [{ key: 'under-100', label: 'Under €100', count: 2 }],
      },
    ]);
  });

  it('combines base query with active filters', () => {
    expect(
      combineProductSearchQuery(
        {
          fullText: {
            field: 'name',
            language: 'en-GB',
            value: 'table',
          },
        },
        parseProductListingFilters({
          'attr.color-label': 'Oak',
        }),
        attributeConfigs,
        'EUR',
      ),
    ).toEqual({
      and: [
        {
          fullText: {
            field: 'name',
            language: 'en-GB',
            value: 'table',
          },
        },
        {
          filter: [
            {
              exact: {
                field: 'variants.attributes.color-label',
                fieldType: 'ltext',
                language: 'en-GB',
                value: 'Oak',
              },
            },
          ],
        },
      ],
    });
  });

  it('toggles attribute facet values', () => {
    const initial = parseProductListingFilters({
      'attr.color-label': 'Black',
    });
    const added = toggleProductListingFilterValue(
      initial,
      'color-label',
      'Tan',
    );
    const removed = toggleProductListingFilterValue(added, 'color-label', 'Black');

    expect(added.attributes).toEqual({
      'color-label': ['Black', 'Tan'],
    });
    expect(removed.attributes).toEqual({
      'color-label': ['Tan'],
    });
  });

  it('sets and clears price filter buckets', () => {
    const withPrice = setProductListingPriceFilter(
      parseProductListingFilters({}),
      '300-plus',
    );
    const cleared = setProductListingPriceFilter(withPrice, undefined);

    expect(withPrice.price).toBe('300-plus');
    expect(cleared.price).toBeUndefined();
  });
});
