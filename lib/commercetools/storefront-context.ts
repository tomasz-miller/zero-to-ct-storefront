import 'server-only';

export type StorefrontCountry = 'DE' | 'GB' | 'US';

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
  if (value === 'DE' || value === 'GB' || value === 'US') {
    return value;
  }

  return DEFAULT_STOREFRONT_COUNTRY;
}

/** Cart, checkout, and pricing — defaults to Germany / EUR / English UI. */
export function getStorefrontContext(): StorefrontContext {
  return {
    locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? DEFAULT_STOREFRONT_LOCALE,
    currency:
      process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? DEFAULT_STOREFRONT_CURRENCY,
    country: parseStorefrontCountry(process.env.NEXT_PUBLIC_DEFAULT_COUNTRY),
  };
}

/** Product catalog — English copy from sample data, EUR prices. */
export function getCatalogContext(): Pick<StorefrontContext, 'locale' | 'currency'> {
  const { currency } = getStorefrontContext();

  return {
    locale: CATALOG_LOCALE,
    currency,
  };
}

/** Maps cart country to MC Checkout Application key. */
export function resolveCheckoutApplicationKey(country: string): string {
  const override = process.env.CTP_CHECKOUT_APPLICATION_KEY;
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

export function getPublicCheckoutConfig() {
  const { locale } = getStorefrontContext();

  return {
    projectKey: process.env.NEXT_PUBLIC_CTP_PROJECT_KEY ?? '',
    region: process.env.NEXT_PUBLIC_CTP_REGION ?? 'europe-west1.gcp',
    locale,
  };
}
