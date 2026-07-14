import 'server-only';

import type { ProductProjection } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import { getCategoryByKey } from './categories';
import {
  getCatalogContext,
} from './storefront-context';
import {
  buildSlugWhere,
  isNewArrivalProduct,
  mapProjection,
  mapProjectionDetail,
  type StorefrontProduct,
  type StorefrontProductDetail,
} from './product-mappers';
import type { ProductListingSort } from './product-listing-params';
import {
  buildProductSearchFacetDefinitions,
  combineProductSearchQuery,
  EMPTY_PRODUCT_LISTING_FILTERS,
  mapFacetResults,
  sanitizeProductListingFilters,
  type ProductListingFilters,
  type StorefrontFacet,
} from './product-search-facets';
import { buildProductSearchSort } from './product-search-sort';
import { getSearchableAttributeFacetConfigsForQuery } from './searchable-product-attributes';

export type {
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontProductVariant,
} from './product-mappers';
export type { ProductListingSort } from './product-listing-params';
export type { ProductListingFilters, StorefrontFacet } from './product-search-facets';

type ListProductsOptions = {
  limit?: number;
  offset?: number;
  locale?: string;
  currency?: string;
  query?: string;
  categoryId?: string;
  sort?: ProductListingSort;
  filters?: ProductListingFilters;
};

type ProductSearchResult = {
  ids: string[];
  total: number;
  facets: StorefrontFacet[];
  filters: ProductListingFilters;
};

function reorderProjectionsByIds(
  projections: ProductProjection[],
  ids: readonly string[],
): ProductProjection[] {
  const projectionsById = new Map(projections.map((projection) => [projection.id, projection]));

  return ids
    .map((id) => projectionsById.get(id))
    .filter((projection): projection is ProductProjection => projection !== undefined);
}

async function fetchProjectionsForIds(
  ids: readonly string[],
  options: {
    limit: number;
    locale: string;
    currency: string;
    country: string;
  },
): Promise<ProductProjection[]> {
  if (ids.length === 0) {
    return [];
  }

  const projectionsResponse = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        where: `id in (${ids.map((id) => `"${id}"`).join(',')})`,
        limit: options.limit,
        staged: false,
        localeProjection: options.locale,
        priceCurrency: options.currency,
        priceCountry: options.country,
      },
    })
    .execute();

  return reorderProjectionsByIds(projectionsResponse.body.results, ids);
}

async function searchProducts(
  baseQuery: Record<string, unknown>,
  options: {
    limit: number;
    offset: number;
    sort: ProductListingSort;
    currency: string;
    locale: string;
    contextKey: string;
    filters?: ProductListingFilters;
  },
): Promise<ProductSearchResult> {
  const attributeConfigs = await getSearchableAttributeFacetConfigsForQuery(
    options.locale,
    options.contextKey,
    baseQuery,
  );
  const filters = sanitizeProductListingFilters(
    options.filters ?? EMPTY_PRODUCT_LISTING_FILTERS,
    attributeConfigs,
  );
  const query = combineProductSearchQuery(
    baseQuery,
    filters,
    attributeConfigs,
    options.currency,
  );

  const searchResponse = await apiRoot
    .products()
    .search()
    .post({
      body: {
        query,
        limit: options.limit,
        offset: options.offset,
        sort: buildProductSearchSort(options.sort, options.currency),
        facets: buildProductSearchFacetDefinitions(
          attributeConfigs,
          options.currency,
        ),
      },
    })
    .execute();

  return {
    ids: searchResponse.body.results.map((result) => result.id),
    total: searchResponse.body.total ?? searchResponse.body.results.length,
    facets: mapFacetResults(searchResponse.body.facets, attributeConfigs),
    filters,
  };
}

async function searchProductsByCategory(
  categoryId: string,
  options: {
    limit: number;
    offset: number;
    sort: ProductListingSort;
    currency: string;
    locale: string;
    filters?: ProductListingFilters;
  },
): Promise<ProductSearchResult> {
  const baseQuery = {
    exact: {
      field: 'categoriesSubTree',
      fieldType: 'keyword',
      value: categoryId,
    },
  };

  return searchProducts(baseQuery, {
    ...options,
    contextKey: `category:${categoryId}`,
  });
}

async function mapSearchResultsToProducts(
  searchResult: ProductSearchResult,
  options: {
    limit: number;
    locale: string;
    currency: string;
    country: string;
  },
): Promise<{
  products: StorefrontProduct[];
  total: number;
  facets: StorefrontFacet[];
  filters: ProductListingFilters;
}> {
  if (searchResult.ids.length === 0) {
    return {
      products: [],
      total: searchResult.total,
      facets: searchResult.facets,
      filters: searchResult.filters,
    };
  }

  const projections = await fetchProjectionsForIds(searchResult.ids, {
    limit: options.limit,
    locale: options.locale,
    currency: options.currency,
    country: options.country,
  });
  const products = projections
    .map((projection) =>
      mapProjection(projection, options.locale, options.currency, options.country),
    )
    .filter((product): product is StorefrontProduct => product !== null);

  return {
    products,
    total: searchResult.total,
    facets: searchResult.facets,
    filters: searchResult.filters,
  };
}

export async function listProducts(
  options?: ListProductsOptions,
): Promise<{
  products: StorefrontProduct[];
  total: number;
  facets: StorefrontFacet[];
  filters: ProductListingFilters;
}> {
  const limit = options?.limit ?? 12;
  const offset = options?.offset ?? 0;
  const { locale, currency, country } = getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const resolvedCurrency = options?.currency ?? currency;
  const query = options?.query?.trim();
  const categoryId = options?.categoryId;
  const filters = options?.filters;

  if (categoryId) {
    const searchResult = await searchProductsByCategory(categoryId, {
      limit,
      offset,
      sort: options?.sort ?? 'newest',
      currency: resolvedCurrency,
      locale: resolvedLocale,
      filters,
    });

    return mapSearchResultsToProducts(searchResult, {
      limit,
      locale: resolvedLocale,
      currency: resolvedCurrency,
      country,
    });
  }

  if (query) {
    const baseQuery = {
      fullText: {
        field: 'name',
        language: resolvedLocale,
        value: query,
      },
    };

    const searchResult = await searchProducts(baseQuery, {
      limit,
      offset,
      sort: options?.sort ?? 'relevance',
      currency: resolvedCurrency,
      locale: resolvedLocale,
      contextKey: `search:${resolvedLocale}:${query}`,
      filters,
    });

    return mapSearchResultsToProducts(searchResult, {
      limit,
      locale: resolvedLocale,
      currency: resolvedCurrency,
      country,
    });
  }

  const projectionsResponse = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        limit,
        offset,
        staged: false,
        localeProjection: resolvedLocale,
        priceCurrency: resolvedCurrency,
        priceCountry: country,
        sort: 'createdAt desc',
      },
    })
    .execute();

  const products = projectionsResponse.body.results
    .map((projection) =>
      mapProjection(projection, resolvedLocale, resolvedCurrency, country),
    )
    .filter((product): product is StorefrontProduct => product !== null);

  return {
    products,
    total: projectionsResponse.body.total ?? products.length,
    facets: [],
    filters: EMPTY_PRODUCT_LISTING_FILTERS,
  };
}

export async function listNewArrivalProducts(options?: {
  limit?: number;
  locale?: string;
  currency?: string;
}): Promise<{
  products: StorefrontProduct[];
  total: number;
  facets: StorefrontFacet[];
  filters: ProductListingFilters;
}> {
  const category = await getCategoryByKey('new-arrivals');

  if (!category) {
    return {
      products: [],
      total: 0,
      facets: [],
      filters: EMPTY_PRODUCT_LISTING_FILTERS,
    };
  }

  return listProducts({
    ...options,
    categoryId: category.id,
    limit: options?.limit ?? 12,
  });
}

export async function listBestSellingProducts(options?: {
  limit?: number;
  locale?: string;
  currency?: string;
}): Promise<{ products: StorefrontProduct[]; total: number }> {
  const limit = options?.limit ?? 12;
  const { locale, currency, country } = getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const resolvedCurrency = options?.currency ?? currency;

  const newArrivalsCategory = await getCategoryByKey('new-arrivals');
  const newArrivalsCategoryId = newArrivalsCategory?.id;

  const projectionsResponse = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        limit: 500,
        staged: false,
        localeProjection: resolvedLocale,
        priceCurrency: resolvedCurrency,
        priceCountry: country,
        sort: 'createdAt asc',
      },
    })
    .execute();

  const bestSellingProjections = projectionsResponse.body.results.filter(
    (projection) => !isNewArrivalProduct(projection, newArrivalsCategoryId),
  );

  const products = bestSellingProjections
    .slice(0, limit)
    .map((projection) =>
      mapProjection(projection, resolvedLocale, resolvedCurrency, country),
    )
    .filter((product): product is StorefrontProduct => product !== null);

  return {
    products,
    total: bestSellingProjections.length,
  };
}

export async function getProductBySlug(
  slug: string,
  options?: {
    locale?: string;
    currency?: string;
  },
): Promise<StorefrontProductDetail | null> {
  const { locale, currency, country } = getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const resolvedCurrency = options?.currency ?? currency;

  const response = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        where: buildSlugWhere(slug, resolvedLocale),
        limit: 1,
        staged: false,
        localeProjection: resolvedLocale,
        priceCurrency: resolvedCurrency,
        priceCountry: country,
      },
    })
    .execute();

  const projection = response.body.results[0];
  if (!projection) {
    return null;
  }

  return mapProjectionDetail(projection, resolvedLocale, resolvedCurrency, country);
}
