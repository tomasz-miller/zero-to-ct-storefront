import { afterEach, describe, expect, it, vi } from 'vitest';

const { getMarketPreference } = vi.hoisted(() => ({
  getMarketPreference: vi.fn(),
}));

vi.mock('./market-session', () => ({
  getMarketPreference,
}));

import {
  CATALOG_LOCALE,
  DEFAULT_STOREFRONT_COUNTRY,
  DEFAULT_STOREFRONT_CURRENCY,
  DEFAULT_STOREFRONT_LOCALE,
  getCatalogContext,
  getStorefrontContext,
  resolveCheckoutApplicationKey,
  resolveCurrencyForCountry,
} from './storefront-context';

describe('getStorefrontContext', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getMarketPreference.mockReset();
    getMarketPreference.mockResolvedValue(null);
  });

  it('defaults to en-GB, DE, and EUR for purchase context', async () => {
    getMarketPreference.mockResolvedValue(null);

    await expect(getStorefrontContext()).resolves.toEqual({
      locale: DEFAULT_STOREFRONT_LOCALE,
      currency: DEFAULT_STOREFRONT_CURRENCY,
      country: DEFAULT_STOREFRONT_COUNTRY,
    });
  });

  it('reads the preferred market and derives its currency', async () => {
    getMarketPreference.mockResolvedValue('GB');
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_LOCALE', 'en-GB');
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_COUNTRY', 'DE');

    await expect(getStorefrontContext()).resolves.toEqual({
      locale: 'en-GB',
      currency: 'GBP',
      country: 'GB',
    });
  });
});

describe('getCatalogContext', () => {
  it('uses English catalog locale with storefront price context', async () => {
    getMarketPreference.mockResolvedValue(null);

    await expect(getCatalogContext()).resolves.toEqual({
      locale: CATALOG_LOCALE,
      currency: DEFAULT_STOREFRONT_CURRENCY,
      country: DEFAULT_STOREFRONT_COUNTRY,
    });
  });
});

describe('resolveCurrencyForCountry', () => {
  it('maps each supported country to its purchase currency', () => {
    expect(resolveCurrencyForCountry('DE')).toBe('EUR');
    expect(resolveCurrencyForCountry('GB')).toBe('GBP');
    expect(resolveCurrencyForCountry('US')).toBe('USD');
  });
});

describe('resolveCheckoutApplicationKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps DE to standard demo checkout app', () => {
    expect(resolveCheckoutApplicationKey('DE')).toBe(
      'demo-commercetools-checkout',
    );
  });

  it('maps GB and US to taxes demo checkout app', () => {
    expect(resolveCheckoutApplicationKey('GB')).toBe(
      'demo-commercetools-checkout-taxes',
    );
    expect(resolveCheckoutApplicationKey('US')).toBe(
      'demo-commercetools-checkout-taxes',
    );
  });

  it('falls back to DE checkout app for unknown countries', () => {
    expect(resolveCheckoutApplicationKey('FR')).toBe(
      'demo-commercetools-checkout',
    );
  });

  it('uses CTP_CHECKOUT_APPLICATION_KEY override for all countries', () => {
    vi.stubEnv('CTP_CHECKOUT_APPLICATION_KEY', 'custom-checkout-app');

    expect(resolveCheckoutApplicationKey('DE')).toBe('custom-checkout-app');
    expect(resolveCheckoutApplicationKey('GB')).toBe('custom-checkout-app');
    expect(resolveCheckoutApplicationKey('FR')).toBe('custom-checkout-app');
  });
});
