import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CATALOG_LOCALE,
  DEFAULT_STOREFRONT_COUNTRY,
  DEFAULT_STOREFRONT_CURRENCY,
  DEFAULT_STOREFRONT_LOCALE,
  getCatalogContext,
  getStorefrontContext,
  resolveCheckoutApplicationKey,
} from './storefront-context';

describe('getStorefrontContext', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to en-GB, DE, and EUR for purchase context', () => {
    expect(getStorefrontContext()).toEqual({
      locale: DEFAULT_STOREFRONT_LOCALE,
      currency: DEFAULT_STOREFRONT_CURRENCY,
      country: DEFAULT_STOREFRONT_COUNTRY,
    });
  });

  it('reads overrides from public env vars', () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_LOCALE', 'en-GB');
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_CURRENCY', 'EUR');
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_COUNTRY', 'DE');

    expect(getStorefrontContext()).toEqual({
      locale: 'en-GB',
      currency: 'EUR',
      country: 'DE',
    });
  });
});

describe('getCatalogContext', () => {
  it('uses English catalog locale with storefront currency', () => {
    expect(getCatalogContext()).toEqual({
      locale: CATALOG_LOCALE,
      currency: DEFAULT_STOREFRONT_CURRENCY,
    });
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
