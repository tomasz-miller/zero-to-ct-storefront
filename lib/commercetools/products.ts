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

export type {
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontProductVariant,
} from './product-mappers';

type ListProductsOptions = {
  limit?: number;
  offset?: number;
  locale?: string;
  currency?: string;
  query?: string;
  categoryId?: string;
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
      },
    })
    .execute();

  return reorderProjectionsByIds(projectionsResponse.body.results, ids);
}

async function searchProductsByCategory(
  categoryId: string,
  options: {
    limit: number;
    offset: number;
  },
): Promise<{ ids: string[]; total: number }> {
  const searchResponse = await apiRoot
    .products()
    .search()
    .post({
      body: {
        query: {
          exact: {
            field: 'categoriesSubTree',
            fieldType: 'keyword',
            value: categoryId,
          },
        },
        limit: options.limit,
        offset: options.offset,
        sort: [{ field: 'createdAt', order: 'desc' }],
      },
    })
    .execute();

  return {
    ids: searchResponse.body.results.map((result) => result.id),
    total: searchResponse.body.total ?? searchResponse.body.results.length,
  };
}

export async function listProducts(
  options?: ListProductsOptions,
): Promise<{ products: StorefrontProduct[]; total: number }> {
  const limit = options?.limit ?? 12;
  const offset = options?.offset ?? 0;
  const { locale, currency } = getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const resolvedCurrency = options?.currency ?? currency;
  const query = options?.query?.trim();
  const categoryId = options?.categoryId;

  if (categoryId) {
    const { ids, total } = await searchProductsByCategory(categoryId, { limit, offset });

    if (ids.length === 0) {
      return { products: [], total };
    }

    const projections = await fetchProjectionsForIds(ids, { limit, locale: resolvedLocale });
    const products = projections
      .map((projection) => mapProjection(projection, resolvedLocale, resolvedCurrency))
      .filter((product): product is StorefrontProduct => product !== null);

    return { products, total };
  }

  if (query) {
    const searchResponse = await apiRoot
      .products()
      .search()
      .post({
        body: {
          query: {
            fullText: {
              field: 'name',
              language: resolvedLocale,
              value: query,
            },
          },
          limit,
          offset,
        },
      })
      .execute();

    const ids = searchResponse.body.results.map((result) => result.id);
    if (ids.length === 0) {
      return { products: [], total: searchResponse.body.total ?? 0 };
    }

    const projections = await fetchProjectionsForIds(ids, { limit, locale: resolvedLocale });
    const products = projections
      .map((projection) => mapProjection(projection, resolvedLocale, resolvedCurrency))
      .filter((product): product is StorefrontProduct => product !== null);

    return {
      products,
      total: searchResponse.body.total ?? products.length,
    };
  }

  const projectionsResponse = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        limit,
        offset,
        staged: false,
        localeProjection: resolvedLocale,
        sort: 'createdAt desc',
      },
    })
    .execute();

  const products = projectionsResponse.body.results
    .map((projection) =>
      mapProjection(projection, resolvedLocale, resolvedCurrency),
    )
    .filter((product): product is StorefrontProduct => product !== null);

  return {
    products,
    total: projectionsResponse.body.total ?? products.length,
  };
}

export async function listNewArrivalProducts(options?: {
  limit?: number;
  locale?: string;
  currency?: string;
}): Promise<{ products: StorefrontProduct[]; total: number }> {
  const category = await getCategoryByKey('new-arrivals');

  if (!category) {
    return { products: [], total: 0 };
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
  const { locale, currency } = getCatalogContext();
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
      mapProjection(projection, resolvedLocale, resolvedCurrency),
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
  const { locale, currency } = getCatalogContext();
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
      },
    })
    .execute();

  const projection = response.body.results[0];
  if (!projection) {
    return null;
  }

  return mapProjectionDetail(projection, resolvedLocale, resolvedCurrency);
}
