import 'server-only';

import type { ProductProjection } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import { rankProductIdsByOrderVolume } from './bestsellers';
import { getCategoryByKey } from './categories';
import {
  getCatalogContext,
} from './storefront-context';
import {
  buildSlugWhere,
  isNewArrivalProduct,
  mapAvailability,
  mapProjection,
  mapProjectionDetail,
  type StorefrontAvailability,
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
  StorefrontAvailability,
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontProductVariant,
} from './product-mappers';
export { isAvailabilityOutOfStock } from './product-mappers';
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
  const { locale, currency, country } = await getCatalogContext();
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

const BESTSELLER_ORDER_SAMPLE_LIMIT = 200;
const BESTSELLER_ORDER_CACHE_TTL_MS = 5 * 60 * 1000;

type OrderLineItemVolume = {
  productId: string;
  quantity: number;
};

let bestsellerOrderLineItemsCache: {
  fetchedAt: number;
  items: OrderLineItemVolume[];
} | null = null;

/** Test helper — clears the in-process bestsellers Orders cache. */
export function clearBestsellerOrderCache(): void {
  bestsellerOrderLineItemsCache = null;
}

async function listCatalogHeuristicBestsellers(options: {
  limit: number;
  locale: string;
  currency: string;
  country: string;
  excludeProductIds?: ReadonlySet<string>;
}): Promise<{ products: StorefrontProduct[]; poolSize: number }> {
  const newArrivalsCategory = await getCategoryByKey('new-arrivals');
  const newArrivalsCategoryId = newArrivalsCategory?.id;
  const excludeProductIds = options.excludeProductIds ?? new Set<string>();

  const projectionsResponse = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        limit: 500,
        staged: false,
        localeProjection: options.locale,
        priceCurrency: options.currency,
        priceCountry: options.country,
        sort: 'createdAt asc',
      },
    })
    .execute();

  const pool = projectionsResponse.body.results.filter(
    (projection) =>
      !excludeProductIds.has(projection.id) &&
      !isNewArrivalProduct(projection, newArrivalsCategoryId),
  );

  const products = pool
    .slice(0, options.limit)
    .map((projection) =>
      mapProjection(
        projection,
        options.locale,
        options.currency,
        options.country,
      ),
    )
    .filter((product): product is StorefrontProduct => product !== null);

  return {
    products,
    poolSize: pool.length,
  };
}

async function fetchRecentOrderLineItems(): Promise<OrderLineItemVolume[]> {
  const now = Date.now();
  if (
    bestsellerOrderLineItemsCache &&
    now - bestsellerOrderLineItemsCache.fetchedAt < BESTSELLER_ORDER_CACHE_TTL_MS
  ) {
    return bestsellerOrderLineItemsCache.items;
  }

  try {
    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          limit: BESTSELLER_ORDER_SAMPLE_LIMIT,
          sort: 'createdAt desc',
        },
      })
      .execute();

    const items = response.body.results.flatMap((order) =>
      order.lineItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    );

    bestsellerOrderLineItemsCache = { fetchedAt: now, items };
    return items;
  } catch (error) {
    console.warn('[bestsellers] Falling back to catalog heuristic', error);
    bestsellerOrderLineItemsCache = { fetchedAt: now, items: [] };
    return [];
  }
}

export async function listBestSellingProducts(options?: {
  limit?: number;
  locale?: string;
  currency?: string;
}): Promise<{ products: StorefrontProduct[]; total: number }> {
  const limit = options?.limit ?? 12;
  const { locale, currency, country } = await getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const resolvedCurrency = options?.currency ?? currency;

  const orderLineItems = await fetchRecentOrderLineItems();
  const allRankedProductIds = rankProductIdsByOrderVolume([
    { lineItems: orderLineItems },
  ]);
  const rankedProductIds = allRankedProductIds.slice(0, limit);

  const rankedProjections = await fetchProjectionsForIds(rankedProductIds, {
    limit,
    locale: resolvedLocale,
    currency: resolvedCurrency,
    country,
  });

  const rankedProducts = rankedProjections
    .map((projection) =>
      mapProjection(projection, resolvedLocale, resolvedCurrency, country),
    )
    .filter((product): product is StorefrontProduct => product !== null);

  if (rankedProducts.length >= limit) {
    return {
      products: rankedProducts.slice(0, limit),
      // Full ranked pool size (not just the page), for homepage copy.
      total: allRankedProductIds.length,
    };
  }

  const fallback = await listCatalogHeuristicBestsellers({
    limit: limit - rankedProducts.length,
    locale: resolvedLocale,
    currency: resolvedCurrency,
    country,
    excludeProductIds: new Set(rankedProducts.map((product) => product.id)),
  });

  const products = [...rankedProducts, ...fallback.products].slice(0, limit);

  return {
    products,
    total: allRankedProductIds.length + fallback.poolSize,
  };
}

export async function getProductBySlug(
  slug: string,
  options?: {
    locale?: string;
    currency?: string;
  },
): Promise<StorefrontProductDetail | null> {
  const { locale, currency, country } = await getCatalogContext();
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

export async function getProductAvailabilityBySku(
  sku: string,
): Promise<StorefrontAvailability | null> {
  const { locale, currency, country } = await getCatalogContext();

  const searchResponse = await apiRoot
    .products()
    .search()
    .post({
      body: {
        query: {
          exact: {
            field: 'variants.sku',
            fieldType: 'keyword',
            value: sku,
          },
        },
        limit: 1,
      },
    })
    .execute();

  const productId = searchResponse.body.results[0]?.id;
  if (!productId) {
    return null;
  }

  const response = await apiRoot
    .productProjections()
    .withId({ ID: productId })
    .get({
      queryArgs: {
        staged: false,
        localeProjection: locale,
        priceCurrency: currency,
        priceCountry: country,
      },
    })
    .execute();

  const allVariants = [
    response.body.masterVariant,
    ...response.body.variants,
  ];
  const variant = allVariants.find((entry) => entry.sku === sku);

  if (!variant) {
    return null;
  }

  return mapAvailability(variant);
}
