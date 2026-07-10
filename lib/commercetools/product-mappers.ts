import type { ProductProjection, ProductVariant } from '@commercetools/platform-sdk';

export type StorefrontProduct = {
  id: string;
  key?: string;
  name: string;
  slug: string;
  sku?: string;
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

export function pickLocalized(
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

export function pickPrice(
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

export function mapVariant(
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

export function mapProjection(
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
    sku: variant.sku,
    imageUrl,
    price,
  };
}

export function mapProjectionDetail(
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

export function buildSlugWhere(slug: string, locale: string): string {
  const locales = Array.from(new Set([locale, 'en-GB', 'en-US', 'en']));
  return locales.map((value) => `slug(${value}="${slug}")`).join(' or ');
}

export function isNewArrivalProduct(
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
