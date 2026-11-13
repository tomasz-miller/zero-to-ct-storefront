import 'server-only';

import { createCookieSession } from '@/lib/session/cookie-session';
import { isStorefrontCountry, type StorefrontCountry } from '@/lib/markets';

export const MARKET_SESSION_COOKIE = 'ct_storefront_market';

export function parseMarketPreference(value: unknown): StorefrontCountry | null {
  return isStorefrontCountry(value) ? value : null;
}

const marketSessionCookie = createCookieSession<StorefrontCountry>({
  name: MARKET_SESSION_COOKIE,
  maxAge: 60 * 60 * 24 * 365,
  parse: parseMarketPreference,
});

/** Rethrows Next.js dynamic-usage errors (via the factory) so pages reading the market render per request. */
export function getMarketPreference(): Promise<StorefrontCountry | null> {
  return marketSessionCookie.read();
}

export function setMarketPreference(country: StorefrontCountry): Promise<boolean> {
  return marketSessionCookie.write(country);
}
