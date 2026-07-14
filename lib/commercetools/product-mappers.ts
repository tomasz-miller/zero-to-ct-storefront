import type { ProductProjection, ProductVariant } from '@commercetools/platform-sdk';

export type StorefrontPrice = {
  centAmount: number;
  currencyCode: string;
  originalCentAmount?: number;
  isDiscounted?: boolean;
};

export type StorefrontAvailability = {
  isOnStock: boolean;
  availableQuantity?: number;
};

export type StorefrontProduct = {
  id: string;
  key?: string;
  name: string;
  slug: string;
  sku?: string;
  imageUrl?: string;
  price?: StorefrontPrice;
  availability: StorefrontAvailability;
};

export type StorefrontProductVariant = {
  id: number;
  sku?: string;
  name?: string;
  imageUrl?: string;
  price?: StorefrontPrice;
  availability: StorefrontAvailability;
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

function mapPriceValue(
  baseValue: { centAmount: number; currencyCode: string },
  discountedValue?: { centAmount: number; currencyCode: string },
): StorefrontPrice {
  if (discountedValue && discountedValue.centAmount < baseValue.centAmount) {
    return {
      centAmount: discountedValue.centAmount,
      currencyCode: discountedValue.currencyCode,
      originalCentAmount: baseValue.centAmount,
      isDiscounted: true,
    };
  }

  return {
    centAmount: baseValue.centAmount,
    currencyCode: baseValue.currencyCode,
  };
}

export function pickPrice(
  variant: ProductVariant,
  currency: string,
  country?: string,
): StorefrontPrice | undefined {
  if (variant.price?.value) {
    return mapPriceValue(
      variant.price.value,
      variant.price.discounted?.value,
    );
  }

  const prices = variant.prices ?? [];
  const match =
    prices.find(
      (price) =>
        price.value.currencyCode === currency &&
        (!country || price.country === country),
    ) ??
    prices.find((price) => price.value.currencyCode === currency) ??
    prices[0];

  if (!match) {
    return undefined;
  }

  return mapPriceValue(match.value, match.discounted?.value);
}

export function mapAvailability(variant: ProductVariant): StorefrontAvailability {
  const availability = variant.availability;

  if (!availability) {
    return { isOnStock: true };
  }

  if (typeof availability.isOnStock === 'boolean') {
    return {
      isOnStock: availability.isOnStock,
      availableQuantity: availability.availableQuantity,
    };
  }

  const channelEntries = availability.channels
    ? Object.values(availability.channels)
    : [];

  if (channelEntries.length > 0) {
    const isOnStock = channelEntries.some((entry) => entry.isOnStock);
    const availableQuantity = channelEntries.reduce(
      (total, entry) => total + (entry.availableQuantity ?? 0),
      0,
    );

    return {
      isOnStock,
      availableQuantity: availableQuantity > 0 ? availableQuantity : undefined,
    };
  }

  return { isOnStock: true };
}

export function mapVariant(
  variant: ProductVariant,
  locale: string,
  currency: string,
  country?: string,
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
    price: pickPrice(variant, currency, country),
    availability: mapAvailability(variant),
  };
}

export function mapProjection(
  projection: ProductProjection,
  locale: string,
  currency: string,
  country?: string,
): StorefrontProduct | null {
  const name = pickLocalized(projection.name, locale);
  const slug = pickLocalized(projection.slug, locale);

  if (!name || !slug) return null;

  const variant = projection.masterVariant;
  const price = pickPrice(variant, currency, country);
  const imageUrl = variant.images?.[0]?.url;

  return {
    id: projection.id,
    key: projection.key,
    name,
    slug,
    sku: variant.sku,
    imageUrl,
    price,
    availability: mapAvailability(variant),
  };
}

export function mapProjectionDetail(
  projection: ProductProjection,
  locale: string,
  currency: string,
  country?: string,
): StorefrontProductDetail | null {
  const base = mapProjection(projection, locale, currency, country);
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
    variants: allVariants.map((variant) =>
      mapVariant(variant, locale, currency, country),
    ),
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
