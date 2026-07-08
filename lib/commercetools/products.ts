import 'server-only';

import type { ProductProjection, ProductVariant } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';

export type StorefrontProduct = {
  id: string;
  key?: string;
  name: string;
  slug: string;
  imageUrl?: string;
  price?: {
    centAmount: number;
    currencyCode: string;
  };
};

export type StorefrontProductVariant = {
  id: number;
  sku?: string;
  name?: string;
  imageUrl?: string;
  price?: {
    centAmount: number;
    currencyCode: string;
  };
};

export type StorefrontProductDetail = StorefrontProduct & {
  description?: string;
  images: string[];
  variants: StorefrontProductVariant[];
};

const DEFAULT_LOCALE = 'en-GB';

function pickLocalized(
  localized: Record<string, string> | undefined,
  locale: string,
): string | undefined {
  if (!localized) return undefined;
  return (
    localized[locale] ??
    localized[locale.replace('_', '-')] ??
    localized['en-GB'] ??
    localized['en'] ??
    Object.values(localized)[0]
  );
}

function pickPrice(
  variant: ProductVariant,
  currency: string,
): { centAmount: number; currencyCode: string } | undefined {
  const price =
    variant.prices?.find((p) => p.value.currencyCode === currency)?.value ??
    variant.prices?.[0]?.value;

  return price
    ? {
        centAmount: price.centAmount,
        currencyCode: price.currencyCode,
      }
    : undefined;
}

function mapVariant(
  variant: ProductVariant,
  locale: string,
  currency: string,
): StorefrontProductVariant {
  const colorLabel = variant.attributes?.find((a) => a.name === 'color-label')
    ?.value as string | undefined;
  const finishLabel = variant.attributes?.find((a) => a.name === 'finish-label')
    ?.value as string | undefined;

  return {
    id: variant.id,
    sku: variant.sku,
    name: colorLabel ?? finishLabel ?? variant.sku,
    imageUrl: variant.images?.[0]?.url,
    price: pickPrice(variant, currency),
  };
}

function mapProjection(
  projection: ProductProjection,
  locale: string,
  currency: string,
): StorefrontProduct | null {
  const name = pickLocalized(projection.name, locale);
  const slug = pickLocalized(projection.slug, locale);

  if (!name || !slug) return null;

  const variant = projection.masterVariant;
  const price = pickPrice(variant, currency);
  const imageUrl = variant.images?.[0]?.url;

  return {
    id: projection.id,
    key: projection.key,
    name,
    slug,
    imageUrl,
    price,
  };
}

function mapProjectionDetail(
  projection: ProductProjection,
  locale: string,
  currency: string,
): StorefrontProductDetail | null {
  const base = mapProjection(projection, locale, currency);
  if (!base) return null;

  const allVariants = [projection.masterVariant, ...projection.variants];
  const images = [
    ...new Set(
      allVariants.flatMap((variant) => variant.images?.map((image) => image.url) ?? []),
    ),
  ];

  return {
    ...base,
    description: pickLocalized(projection.description, locale),
    images,
    variants: allVariants.map((variant) => mapVariant(variant, locale, currency)),
  };
}

function buildSlugWhere(slug: string, locale: string): string {
  const locales = Array.from(new Set([locale, 'en-GB', 'en-US', 'en']));
  return locales.map((value) => `slug(${value}="${slug}")`).join(' or ');
}

function isNewArrivalProduct(
  projection: ProductProjection,
  newArrivalsCategoryId?: string,
): boolean {
  const newArrivalAttribute = projection.masterVariant.attributes?.find(
    (attribute) => attribute.name === 'new-arrival',
  );

  if (newArrivalAttribute?.value === true) {
    return true;
  }

  if (
    newArrivalsCategoryId &&
    projection.categories?.some((category) => category.id === newArrivalsCategoryId)
  ) {
    return true;
  }

  return false;
}

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
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const currency = options?.currency ?? 'EUR';
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
              language: locale,
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
          localeProjection: locale,
        },
      })
      .execute();

    const products = projectionsResponse.body.results
      .map((projection) => mapProjection(projection, locale, currency))
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
        localeProjection: locale,
        sort: 'createdAt desc',
      },
    })
    .execute();

  const products = projectionsResponse.body.results
    .map((projection) => mapProjection(projection, locale, currency))
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
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const currency = options?.currency ?? 'EUR';

  const newArrivalsCategoryId = await getNewArrivalsCategoryId();

  const projectionsResponse = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        limit: 500,
        staged: false,
        localeProjection: locale,
        sort: 'createdAt asc',
      },
    })
    .execute();

  const bestSellingProjections = projectionsResponse.body.results.filter(
    (projection) => !isNewArrivalProduct(projection, newArrivalsCategoryId),
  );

  const products = bestSellingProjections
    .slice(0, limit)
    .map((projection) => mapProjection(projection, locale, currency))
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
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const currency = options?.currency ?? 'EUR';

  const response = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        where: buildSlugWhere(slug, locale),
        limit: 1,
        staged: false,
        localeProjection: locale,
      },
    })
    .execute();

  const projection = response.body.results[0];
  if (!projection) {
    return null;
  }

  return mapProjectionDetail(projection, locale, currency);
}
