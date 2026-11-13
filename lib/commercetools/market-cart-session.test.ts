/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { parseMarketCartMap } from './market-cart-session';

describe('parseMarketCartMap', () => {
  it('parses a valid market cart map', () => {
    expect(
      parseMarketCartMap({ carts: { DE: 'cart-de', GB: 'cart-gb' } }),
    ).toEqual({ carts: { DE: 'cart-de', GB: 'cart-gb' } });
  });

  it('ignores unsupported countries and invalid cart ids', () => {
    expect(parseMarketCartMap({ carts: { DE: 'c1', FR: 'c2', GB: 3 } })).toEqual({
      carts: { DE: 'c1' },
    });
  });

  it('returns null for invalid payloads', () => {
    expect(parseMarketCartMap(undefined)).toBeNull();
    expect(parseMarketCartMap('not-json')).toBeNull();
    expect(parseMarketCartMap({})).toBeNull();
    expect(parseMarketCartMap({ carts: 'DE' })).toBeNull();
  });
});

describe('rememberCartForCountry', () => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
    vi.doMock('next/headers', () => ({
      cookies: async () => cookieStore,
    }));
  });

  afterEach(() => {
    vi.doUnmock('next/headers');
    vi.resetModules();
  });

  it('does not rewrite the cookie when the mapping is unchanged', async () => {
    const { MARKET_CARTS_COOKIE, rememberCartForCountry } = await import(
      './market-cart-session'
    );
    const { parseMarketCartMap: parse } = await import('./market-cart-session');
    const { createCookieSession } = await import('@/lib/session/cookie-session');
    const sealed = createCookieSession({
      name: MARKET_CARTS_COOKIE,
      maxAge: 60 * 60 * 24 * 30,
      parse,
    }).serialize({ carts: { DE: 'cart-de' } });
    cookieStore.get.mockImplementation((name: string) =>
      name === MARKET_CARTS_COOKIE ? { value: sealed } : undefined,
    );

    await rememberCartForCountry('DE', 'cart-de');

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('swallows cookie write failures outside route handlers', async () => {
    cookieStore.get.mockReturnValue(undefined);
    cookieStore.set.mockImplementation(() => {
      throw new Error(
        'Cookies can only be modified in a Server Action or Route Handler.',
      );
    });

    const { rememberCartForCountry } = await import('./market-cart-session');
    await expect(rememberCartForCountry('DE', 'cart-de')).resolves.toBeUndefined();
  });
});
