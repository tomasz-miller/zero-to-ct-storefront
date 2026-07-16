/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { realignCartForStorefront, setMarketPreference, getStorefrontContext } =
  vi.hoisted(() => ({
    realignCartForStorefront: vi.fn(),
    setMarketPreference: vi.fn(),
    getStorefrontContext: vi.fn(),
  }));

vi.mock('@/lib/commercetools/cart', () => ({
  realignCartForStorefront,
}));

vi.mock('@/lib/commercetools/market-session', () => ({
  setMarketPreference,
}));

vi.mock('@/lib/commercetools/storefront-context', () => ({
  getStorefrontContext,
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/storefront/market', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/storefront/market', () => {
  beforeEach(() => {
    setMarketPreference.mockReset();
    realignCartForStorefront.mockReset();
    getStorefrontContext.mockReset();
    setMarketPreference.mockResolvedValue(undefined);
    realignCartForStorefront.mockResolvedValue({
      cartRecreated: false,
      cartRestored: false,
      itemCount: 0,
      previousHadItems: false,
    });
    getStorefrontContext.mockResolvedValue({
      country: 'GB',
      currency: 'GBP',
      locale: 'en-GB',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when the request body is invalid', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/storefront/market', {
        method: 'POST',
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for an unsupported country', async () => {
    const response = await POST(createRequest({ country: 'FR' }));

    expect(response.status).toBe(400);
  });

  it('persists the market and returns its contextual values', async () => {
    realignCartForStorefront.mockResolvedValue({
      cartRecreated: true,
      cartRestored: false,
      itemCount: 0,
      previousHadItems: true,
    });

    const response = await POST(createRequest({ country: 'GB' }));

    expect(response.status).toBe(200);
    expect(setMarketPreference).toHaveBeenCalledWith('GB');
    expect(realignCartForStorefront).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      country: 'GB',
      currency: 'GBP',
      locale: 'en-GB',
      cartRecreated: true,
      cartRestored: false,
      itemCount: 0,
      previousHadItems: true,
    });
  });

  it('returns 500 when the market cannot be persisted', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setMarketPreference.mockRejectedValue(new Error('Cookie failure'));

    const response = await POST(createRequest({ country: 'US' }));

    expect(response.status).toBe(500);
  });
});
