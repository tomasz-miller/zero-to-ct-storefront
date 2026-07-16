/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseMarketCartMap } from './market-cart-session';

describe('parseMarketCartMap', () => {
  it('parses a valid market cart map', () => {
    expect(
      parseMarketCartMap(
        JSON.stringify({
          anonymousId: 'anon-1',
          carts: { DE: 'cart-de', GB: 'cart-gb' },
        }),
      ),
    ).toEqual({
      anonymousId: 'anon-1',
      carts: { DE: 'cart-de', GB: 'cart-gb' },
    });
  });

  it('ignores unsupported countries and invalid cart ids', () => {
    expect(
      parseMarketCartMap(
        JSON.stringify({
          anonymousId: 'anon-1',
          carts: { DE: 'cart-de', FR: 'cart-fr', US: 12 },
        }),
      ),
    ).toEqual({
      anonymousId: 'anon-1',
      carts: { DE: 'cart-de' },
    });
  });

  it('returns null for invalid payloads', () => {
    expect(parseMarketCartMap(undefined)).toBeNull();
    expect(parseMarketCartMap('not-json')).toBeNull();
    expect(parseMarketCartMap(JSON.stringify({ carts: {} }))).toBeNull();
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
    cookieStore.get.mockReturnValue({
      value: JSON.stringify({
        anonymousId: 'anon-1',
        carts: { DE: 'cart-de' },
      }),
    });

    const { rememberCartForCountry } = await import('./market-cart-session');
    await rememberCartForCountry('DE', 'cart-de', 'anon-1');

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
    await expect(
      rememberCartForCountry('DE', 'cart-de', 'anon-1'),
    ).resolves.toBeUndefined();
  });
});
