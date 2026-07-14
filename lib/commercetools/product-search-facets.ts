import type { SearchableAttributeFacetConfig } from './searchable-product-attribute-configs';

export const PRODUCT_LISTING_ATTRIBUTE_PARAM_PREFIX = 'attr.';

export type ProductListingPriceBucketKey =
  | 'under-100'
  | '100-300'
  | '300-plus';

export type ProductListingFilters = {
  attributes: Record<string, string[]>;
  price?: ProductListingPriceBucketKey;
};

export type StorefrontFacetBucket = {
  key: string;
  label: string;
  count: number;
};

export type StorefrontFacet = {
  id: string;
  label: string;
  kind: 'price' | 'attribute';
  buckets: StorefrontFacetBucket[];
};

export const EMPTY_PRODUCT_LISTING_FILTERS: ProductListingFilters = {
  attributes: {},
};

const PRICE_BUCKET_DEFINITIONS: Array<{
  key: ProductListingPriceBucketKey;
  label: string;
  from?: number;
  to?: number;
}> = [
  { key: 'under-100', label: 'Under €100', to: 10_000 },
  { key: '100-300', label: '€100 – €300', from: 10_000, to: 30_000 },
  { key: '300-plus', label: '€300+', from: 30_000 },
];

type ProductSearchFacetDefinition =
  | {
      distinct: {
        name: string;
        field: string;
        fieldType: string;
        language?: string;
        limit: number;
      };
    }
  | {
      ranges: {
        name: string;
        field: string;
        filter?: Record<string, unknown>;
        ranges: Array<{ key: string; from?: number; to?: number }>;
      };
    };

type ProductSearchFacetResult = {
  name?: string;
  buckets?: Array<{
    key?: string;
    count?: number;
    from?: number;
    to?: number;
  }>;
};

const LEGACY_ATTRIBUTE_PARAM_MAP: Record<string, string> = {
  color: 'color-label',
  finish: 'finish-label',
  brand: 'finish-label',
};

function parseCsvParam(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

function isPriceBucketKey(value: string): value is ProductListingPriceBucketKey {
  return PRICE_BUCKET_DEFINITIONS.some((bucket) => bucket.key === value);
}

function getSearchParamValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return value;
}

function mergeAttributeValues(
  attributes: Record<string, string[]>,
  name: string,
  values: string[],
): void {
  if (values.length === 0) {
    return;
  }

  attributes[name] = [...new Set([...(attributes[name] ?? []), ...values])];
}

export function parseProductListingFilters(
  params: Record<string, string | string[] | undefined>,
): ProductListingFilters {
  const attributes: Record<string, string[]> = {};

  for (const [key] of Object.entries(params)) {
    if (!key.startsWith(PRODUCT_LISTING_ATTRIBUTE_PARAM_PREFIX)) {
      continue;
    }

    const attributeName = key.slice(PRODUCT_LISTING_ATTRIBUTE_PARAM_PREFIX.length);

    if (!attributeName) {
      continue;
    }

    mergeAttributeValues(
      attributes,
      attributeName,
      parseCsvParam(getSearchParamValue(params, key)),
    );
  }

  for (const [legacyKey, attributeName] of Object.entries(LEGACY_ATTRIBUTE_PARAM_MAP)) {
    mergeAttributeValues(
      attributes,
      attributeName,
      parseCsvParam(getSearchParamValue(params, legacyKey)),
    );
  }

  const price = getSearchParamValue(params, 'price')?.trim();

  return {
    attributes,
    price: price && isPriceBucketKey(price) ? price : undefined,
  };
}

export function sanitizeProductListingFilters(
  filters: ProductListingFilters,
  attributeConfigs: SearchableAttributeFacetConfig[],
): ProductListingFilters {
  const allowedNames = new Set(attributeConfigs.map((config) => config.name));
  const attributes: Record<string, string[]> = {};

  for (const [attributeName, values] of Object.entries(filters.attributes)) {
    if (allowedNames.has(attributeName) && values.length > 0) {
      attributes[attributeName] = values;
    }
  }

  return {
    attributes,
    price: filters.price,
  };
}

export function productListingFiltersEqual(
  left: ProductListingFilters,
  right: ProductListingFilters,
): boolean {
  const leftParams = serializeProductListingFilters(left);
  const rightParams = serializeProductListingFilters(right);
  const keys = [
    ...new Set([...Object.keys(leftParams), ...Object.keys(rightParams)]),
  ].sort();

  return keys.every((key) => leftParams[key] === rightParams[key]);
}

export function hasActiveProductListingFilters(
  filters: ProductListingFilters,
): boolean {
  return (
    Object.values(filters.attributes).some((values) => values.length > 0) ||
    filters.price !== undefined
  );
}

export function serializeProductListingFilters(
  filters: ProductListingFilters,
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const [attributeName, values] of Object.entries(filters.attributes)) {
    if (values.length > 0) {
      params[`${PRODUCT_LISTING_ATTRIBUTE_PARAM_PREFIX}${attributeName}`] =
        values.join(',');
    }
  }

  if (filters.price) {
    params.price = filters.price;
  }

  return params;
}

export function toggleProductListingFilterValue(
  filters: ProductListingFilters,
  attributeName: string,
  value: string,
): ProductListingFilters {
  const currentValues = filters.attributes[attributeName] ?? [];
  const nextValues = currentValues.includes(value)
    ? currentValues.filter((entry) => entry !== value)
    : [...currentValues, value];

  const attributes = { ...filters.attributes };

  if (nextValues.length === 0) {
    delete attributes[attributeName];
  } else {
    attributes[attributeName] = nextValues;
  }

  return {
    ...filters,
    attributes,
  };
}

export function setProductListingPriceFilter(
  filters: ProductListingFilters,
  price?: ProductListingPriceBucketKey,
): ProductListingFilters {
  return {
    ...filters,
    price,
  };
}

export function buildProductSearchFacetDefinitions(
  attributeConfigs: SearchableAttributeFacetConfig[],
  currency: string,
): ProductSearchFacetDefinition[] {
  const currencyFilter = {
    exact: {
      field: 'variants.prices.currencyCode',
      value: currency,
    },
  };

  return [
    {
      ranges: {
        name: 'price',
        field: 'variants.prices.centAmount',
        filter: currencyFilter,
        ranges: PRICE_BUCKET_DEFINITIONS.map((bucket) => ({
          key: bucket.key,
          ...(bucket.from !== undefined ? { from: bucket.from } : {}),
          ...(bucket.to !== undefined ? { to: bucket.to } : {}),
        })),
      },
    },
    ...attributeConfigs.map((config) => ({
      distinct: {
        name: config.name,
        field: config.field,
        fieldType: config.fieldType,
        ...(config.language ? { language: config.language } : {}),
        limit: 20,
      },
    })),
  ];
}

function buildExactAttributeFilter(
  config: SearchableAttributeFacetConfig,
  value: string,
): Record<string, unknown> {
  return {
    exact: {
      field: config.filterField,
      fieldType: config.fieldType,
      ...(config.language ? { language: config.language } : {}),
      value,
    },
  };
}

function buildOrFilter(
  expressions: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  if (expressions.length === 0) {
    return undefined;
  }

  if (expressions.length === 1) {
    return expressions[0];
  }

  return { or: expressions };
}

function buildMultiValueAttributeFilter(
  config: SearchableAttributeFacetConfig,
  values: string[],
): Record<string, unknown> | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return buildOrFilter(
    values.map((value) => ({
      filter: [buildExactAttributeFilter(config, value)],
    })),
  );
}

function buildPriceRangeBounds(bucket: {
  from?: number;
  to?: number;
}): Record<string, number> {
  const bounds: Record<string, number> = {};

  if (bucket.from !== undefined) {
    bounds.gte = bucket.from;
  }

  if (bucket.to !== undefined) {
    bounds.lt = bucket.to;
  }

  return bounds;
}

function buildPriceFilter(
  price: ProductListingPriceBucketKey,
  currency: string,
): Record<string, unknown> | undefined {
  const bucket = PRICE_BUCKET_DEFINITIONS.find((entry) => entry.key === price);

  if (!bucket) {
    return undefined;
  }

  return {
    filter: [
      {
        exact: {
          field: 'variants.prices.currencyCode',
          value: currency,
        },
      },
      {
        range: {
          field: 'variants.prices.centAmount',
          ...buildPriceRangeBounds(bucket),
        },
      },
    ],
  };
}

export function buildFilterQuery(
  filters: ProductListingFilters,
  attributeConfigs: SearchableAttributeFacetConfig[],
  currency: string,
): Record<string, unknown> | undefined {
  const configByName = new Map(
    attributeConfigs.map((config) => [config.name, config]),
  );

  const expressions = [
    ...Object.entries(filters.attributes).flatMap(([attributeName, values]) => {
      const config = configByName.get(attributeName);

      if (!config) {
        return [];
      }

      const expression = buildMultiValueAttributeFilter(config, values);

      return expression ? [expression] : [];
    }),
    filters.price ? buildPriceFilter(filters.price, currency) : undefined,
  ].filter((expression): expression is Record<string, unknown> => expression !== undefined);

  if (expressions.length === 0) {
    return undefined;
  }

  if (expressions.length === 1) {
    return expressions[0];
  }

  return { and: expressions };
}

export function combineProductSearchQuery(
  baseQuery: Record<string, unknown>,
  filters: ProductListingFilters,
  attributeConfigs: SearchableAttributeFacetConfig[],
  currency: string,
): Record<string, unknown> {
  const filterQuery = buildFilterQuery(filters, attributeConfigs, currency);

  if (!filterQuery) {
    return baseQuery;
  }

  return {
    and: [baseQuery, filterQuery],
  };
}

function getPriceBucketLabel(key: string): string {
  return (
    PRICE_BUCKET_DEFINITIONS.find((bucket) => bucket.key === key)?.label ?? key
  );
}

export function mapFacetResults(
  facets: ProductSearchFacetResult[] | undefined,
  attributeConfigs: SearchableAttributeFacetConfig[],
): StorefrontFacet[] {
  if (!facets?.length) {
    return [];
  }

  const configByName = new Map(
    attributeConfigs.map((config) => [config.name, config]),
  );

  return facets
    .map((facet): StorefrontFacet | null => {
      const name = facet.name;

      if (!name) {
        return null;
      }

      if (name === 'price') {
        const buckets = (facet.buckets ?? [])
          .filter((bucket) => bucket.key && (bucket.count ?? 0) > 0)
          .map((bucket) => ({
            key: bucket.key!,
            label: getPriceBucketLabel(bucket.key!),
            count: bucket.count ?? 0,
          }));

        if (buckets.length === 0) {
          return null;
        }

        return {
          id: 'price',
          label: 'Price',
          kind: 'price',
          buckets,
        };
      }

      const config = configByName.get(name);

      if (!config) {
        return null;
      }

      const buckets = (facet.buckets ?? [])
        .filter((bucket) => bucket.key && (bucket.count ?? 0) > 0)
        .map((bucket) => ({
          key: bucket.key!,
          label: bucket.key!,
          count: bucket.count ?? 0,
        }));

      if (buckets.length === 0) {
        return null;
      }

      return {
        id: config.name,
        label: config.label,
        kind: 'attribute',
        buckets,
      };
    })
    .filter((facet): facet is StorefrontFacet => facet !== null);
}
