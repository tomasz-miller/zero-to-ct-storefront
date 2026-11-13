export const STOREFRONT_COUNTRIES = ['DE', 'GB', 'US'] as const;

export type StorefrontCountry = (typeof STOREFRONT_COUNTRIES)[number];

export function isStorefrontCountry(value: unknown): value is StorefrontCountry {
  return (
    typeof value === 'string' &&
    (STOREFRONT_COUNTRIES as readonly string[]).includes(value)
  );
}

export const MARKETS: Record<
  StorefrontCountry,
  { label: string; shortLabel: string; currency: string }
> = {
  DE: { label: 'Germany', shortLabel: 'DE', currency: 'EUR' },
  GB: { label: 'United Kingdom', shortLabel: 'GB', currency: 'GBP' },
  US: { label: 'United States', shortLabel: 'US', currency: 'USD' },
};
