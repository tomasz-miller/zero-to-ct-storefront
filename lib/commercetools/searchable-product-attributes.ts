import 'server-only';

import { cache } from 'react';

import { apiRoot } from './api-root';
import { getProductTypes } from './product-types';
import { CATALOG_LOCALE } from './storefront-context';
import {
  collectSearchableAttributeFacetConfigs,
  type SearchableAttributeFacetConfig,
} from './searchable-product-attribute-configs';

export type { SearchableAttributeFacetConfig };
export { collectSearchableAttributeFacetConfigs };

async function getProductTypeIdsForQuery(
  baseQuery: Record<string, unknown>,
): Promise<Set<string>> {
  const response = await apiRoot
    .products()
    .search()
    .post({
      body: {
        query: baseQuery,
        limit: 0,
        facets: [
          {
            distinct: {
              name: 'productTypes',
              field: 'productType',
              limit: 100,
            },
          },
        ],
      },
    })
    .execute();

  return new Set(
    ((response.body.facets?.[0] as { buckets?: Array<{ key?: string }> } | undefined)
      ?.buckets ?? [])
      .map((bucket) => bucket.key)
      .filter((key): key is string => Boolean(key)),
  );
}

export const getSearchableAttributeFacetConfigs = cache(
  async (locale: string = CATALOG_LOCALE): Promise<SearchableAttributeFacetConfig[]> => {
    const productTypes = await getProductTypes();

    return collectSearchableAttributeFacetConfigs(productTypes, locale);
  },
);

export const getSearchableAttributeFacetConfigsForQuery = cache(
  async (
    locale: string,
    cacheKey: string,
    baseQuery: Record<string, unknown>,
  ): Promise<SearchableAttributeFacetConfig[]> => {
    void cacheKey;

    const [productTypes, productTypeIds] = await Promise.all([
      getProductTypes(),
      getProductTypeIdsForQuery(baseQuery),
    ]);

    if (productTypeIds.size === 0) {
      return [];
    }

    return collectSearchableAttributeFacetConfigs(
      productTypes.filter((productType) => productTypeIds.has(productType.id)),
      locale,
    );
  },
);
