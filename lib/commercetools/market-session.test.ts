/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCookies } = vi.hoisted(() => ({ mockCookies: vi.fn() }));

vi.mock('next/headers', () => ({ cookies: mockCookies }));

import { getMarketPreference, parseMarketPreference } from './market-session';

describe('parseMarketPreference', () => {
  it('parses supported storefront countries', () => {
    expect(parseMarketPreference('DE')).toBe('DE');
    expect(parseMarketPreference('GB')).toBe('GB');
    expect(parseMarketPreference('US')).toBe('US');
  });

  it('returns null for missing or unsupported values', () => {
    expect(parseMarketPreference(undefined)).toBeNull();
    expect(parseMarketPreference('FR')).toBeNull();
  });
});

describe('getMarketPreference', () => {
  beforeEach(() => {
    mockCookies.mockReset();
  });

  it('reads the market cookie', async () => {
    mockCookies.mockResolvedValueOnce({ get: () => ({ value: 'GB' }) });
    await expect(getMarketPreference()).resolves.toBe('GB');
  });

  it('rethrows Next.js dynamic-usage errors so the route renders per request', async () => {
    const error = Object.assign(new Error('Dynamic server usage: cookies'), {
      digest: 'DYNAMIC_SERVER_USAGE',
    });
    mockCookies.mockRejectedValueOnce(error);
    await expect(getMarketPreference()).rejects.toBe(error);
  });

  it('returns null outside a request scope', async () => {
    mockCookies.mockRejectedValueOnce(new Error('outside request scope'));
    await expect(getMarketPreference()).resolves.toBeNull();
  });
});
