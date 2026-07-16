import 'server-only';

import { cookies } from 'next/headers';

import type { StorefrontCountry } from './storefront-context';

export const MARKET_SESSION_COOKIE = 'ct_storefront_market';

export function parseMarketPreference(
  value: string | undefined,
): StorefrontCountry | null {
  if (value === 'DE' || value === 'GB' || value === 'US') {
    return value;
  }

  return null;
}

export async function getMarketPreference(): Promise<StorefrontCountry | null> {
  try {
    const cookieStore = await cookies();
    return parseMarketPreference(cookieStore.get(MARKET_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function setMarketPreference(
  country: StorefrontCountry,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MARKET_SESSION_COOKIE, country, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
