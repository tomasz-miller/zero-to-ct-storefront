import type { ProductProjection, ProductVariant } from '@commercetools/platform-sdk';

export type StorefrontPrice = {
  centAmount: number;
  currencyCode: string;
  originalCentAmount?: number;
  isDiscounted?: boolean;
};

/** Units at or below this count (while still on stock) show a low-stock badge. */
export const LOW_STOCK_THRESHOLD = 5;

export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type StorefrontAvailability = {
  isOnStock: boolean;
  availableQuantity?: number;
  status: AvailabilityStatus;
};

export function resolveAvailabilityStatus(
  isOnStock: boolean,
  availableQuantity?: number,
): AvailabilityStatus {
  if (!isOnStock || availableQuantity === 0) {
    return 'out_of_stock';
  }

  if (
    typeof availableQuantity === 'number' &&
    availableQuantity <= LOW_STOCK_THRESHOLD
  ) {
    return 'low_stock';
  }

  return 'in_stock';
}

/** Build availability with `isOnStock` kept in sync with `status`. */
export function toStorefrontAvailability(
  isOnStock: boolean,
  availableQuantity?: number,
): StorefrontAvailability {
  const status = resolveAvailabilityStatus(isOnStock, availableQuantity);
  return {
    isOnStock: status !== 'out_of_stock',
    availableQuantity,
    status,
  };
}

export function isAvailabilityOutOfStock(
  availability: StorefrontAvailability,
): boolean {
  return availability.status === 'out_of_stock';
}

export type StorefrontProduct = {
  id: string;
  key?: string;
  name: string;
  slug: string;
  sku?: string;
  imageUrl?: string;
  price?: StorefrontPrice;
  availability: StorefrontAvailability;
  hasMultipleVariants: boolean;
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
    return toStorefrontAvailability(true);
  }

  if (typeof availability.isOnStock === 'boolean') {
    return toStorefrontAvailability(
      availability.isOnStock,
      availability.availableQuantity,
    );
  }

  const channelEntries = availability.channels
    ? Object.values(availability.channels)
    : [];

  if (channelEntries.length > 0) {
    const onStockChannels = channelEntries.filter((entry) => entry.isOnStock);
    const isOnStock = onStockChannels.length > 0;
    // Prefer the lowest channel quantity so "Only X left" never overstates stock
    // when channels are alternative locations rather than a shared pool.
    const quantities = onStockChannels
      .map((entry) => entry.availableQuantity)
      .filter((quantity): quantity is number => typeof quantity === 'number');
    const quantity =
      quantities.length > 0 ? Math.min(...quantities) : undefined;

    return toStorefrontAvailability(isOnStock, quantity);
  }

  return toStorefrontAvailability(true);
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
    hasMultipleVariants: projection.variants.length > 0,
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
