import 'server-only';

import { apiRoot } from './api-root';
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

async function getNewArrivalsCategoryId(): Promise<string | undefined> {
  const response = await apiRoot
    .categories()
    .get({
      queryArgs: {
        where: 'key="new-arrivals"',
        limit: 1,
      },
    })
    .execute();

  return response.body.results[0]?.id;
}

export async function listProducts(options?: {
  limit?: number;
  offset?: number;
  locale?: string;
  currency?: string;
  query?: string;
}): Promise<{ products: StorefrontProduct[]; total: number }> {
  const limit = options?.limit ?? 12;
  const offset = options?.offset ?? 0;
  const { locale, currency } = getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const resolvedCurrency = options?.currency ?? currency;
  const query = options?.query?.trim();

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

    const projectionsResponse = await apiRoot
      .productProjections()
      .get({
        queryArgs: {
          where: `id in (${ids.map((id) => `"${id}"`).join(',')})`,
          limit,
          staged: false,
          localeProjection: resolvedLocale,
        },
      })
      .execute();

    const products = projectionsResponse.body.results
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

export async function listBestSellingProducts(options?: {
  limit?: number;
  locale?: string;
  currency?: string;
}): Promise<{ products: StorefrontProduct[]; total: number }> {
  const limit = options?.limit ?? 12;
  const { locale, currency } = getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const resolvedCurrency = options?.currency ?? currency;

  const newArrivalsCategoryId = await getNewArrivalsCategoryId();

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
