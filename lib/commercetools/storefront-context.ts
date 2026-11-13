import 'server-only';

import { isStorefrontCountry, MARKETS, type StorefrontCountry } from '@/lib/markets';

import { commercetoolsEnv } from './env';
import { getMarketPreference } from './market-session';

export type { StorefrontCountry } from '@/lib/markets';

export type StorefrontContext = {
  locale: string;
  currency: string;
  country: StorefrontCountry;
};

/** B2C sample data stores product copy in English — used for discovery/search/PDP only. */
export const CATALOG_LOCALE = 'en-GB';

export const DEFAULT_STOREFRONT_LOCALE = 'en-GB';
export const DEFAULT_STOREFRONT_CURRENCY = 'EUR';
export const DEFAULT_STOREFRONT_COUNTRY: StorefrontCountry = 'DE';

const CHECKOUT_APP_BY_COUNTRY: Record<StorefrontCountry, string> = {
  DE: 'demo-commercetools-checkout',
  GB: 'demo-commercetools-checkout-taxes',
  US: 'demo-commercetools-checkout-taxes',
};

function parseStorefrontCountry(value: string | undefined): StorefrontCountry {
  return isStorefrontCountry(value) ? value : DEFAULT_STOREFRONT_COUNTRY;
}

export function resolveCurrencyForCountry(country: StorefrontCountry): string {
  return MARKETS[country].currency;
}

/** Cart, checkout, and pricing — defaults to Germany / EUR / English UI. */
export async function getStorefrontContext(): Promise<StorefrontContext> {
  const country =
    (await getMarketPreference()) ??
    parseStorefrontCountry(process.env.NEXT_PUBLIC_DEFAULT_COUNTRY);

  return {
    locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? DEFAULT_STOREFRONT_LOCALE,
    currency: resolveCurrencyForCountry(country),
    country,
  };
}

/** Product catalog — English copy from sample data, storefront price context. */
export async function getCatalogContext(): Promise<
  Pick<
  StorefrontContext,
  'locale' | 'currency' | 'country'
  >
> {
  const { currency, country } = await getStorefrontContext();

  return {
    locale: CATALOG_LOCALE,
    currency,
    country,
  };
}

/** Maps cart country to MC Checkout Application key. */
export function resolveCheckoutApplicationKey(country: string): string {
  const override = commercetoolsEnv.checkoutApplicationKey;
  if (override) {
    return override;
  }

  if (country === 'DE') {
    return CHECKOUT_APP_BY_COUNTRY.DE;
  }
  if (country === 'GB' || country === 'US') {
    return CHECKOUT_APP_BY_COUNTRY.GB;
  }

  return CHECKOUT_APP_BY_COUNTRY.DE;
}

export async function getPublicCheckoutConfig() {
  const { locale } = await getStorefrontContext();

  return {
    projectKey: process.env.NEXT_PUBLIC_CTP_PROJECT_KEY ?? '',
    region: process.env.NEXT_PUBLIC_CTP_REGION ?? 'europe-west1.gcp',
    locale,
  };
}
