import 'server-only';

import { createCookieSession } from '@/lib/session/cookie-session';
import { isStorefrontCountry, type StorefrontCountry } from '@/lib/markets';

export const MARKET_CARTS_COOKIE = 'ct_market_carts';

export type MarketCartMap = {
  carts: Partial<Record<StorefrontCountry, string>>;
};

export function parseMarketCartMap(value: unknown): MarketCartMap | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const rawCarts = (value as { carts?: unknown }).carts;
  if (!rawCarts || typeof rawCarts !== 'object') {
    return null;
  }

  const carts: MarketCartMap['carts'] = {};
  for (const [country, cartId] of Object.entries(rawCarts)) {
    if (isStorefrontCountry(country) && typeof cartId === 'string') {
      carts[country] = cartId;
    }
  }

  return { carts };
}

const marketCartsCookie = createCookieSession<MarketCartMap>({
  name: MARKET_CARTS_COOKIE,
  maxAge: 60 * 60 * 24 * 30,
  parse: parseMarketCartMap,
});

export function getMarketCartMap(): Promise<MarketCartMap | null> {
  return marketCartsCookie.read();
}

export function setMarketCartMap(map: MarketCartMap): Promise<boolean> {
  return marketCartsCookie.write(map);
}

export async function rememberCartForCountry(
  country: StorefrontCountry,
  cartId: string,
): Promise<void> {
  const existing = await getMarketCartMap();
  if (existing?.carts[country] === cartId) {
    return;
  }

  await setMarketCartMap({ carts: { ...(existing?.carts ?? {}), [country]: cartId } });
}

export async function getCartIdForCountry(
  country: StorefrontCountry,
): Promise<string | undefined> {
  const map = await getMarketCartMap();
  return map?.carts[country];
}

export async function forgetCartForCountry(
  country: StorefrontCountry,
): Promise<void> {
  const existing = await getMarketCartMap();
  if (!existing?.carts[country]) {
    return;
  }

  const carts = { ...existing.carts };
  delete carts[country];

  await setMarketCartMap({ carts });
}

export async function listMappedCartIds(): Promise<string[]> {
  const map = await getMarketCartMap();
  if (!map) {
    return [];
  }

  return Object.values(map.carts).filter(
    (cartId): cartId is string => typeof cartId === 'string',
  );
}

export function clearMarketCartMap(): Promise<boolean> {
  return marketCartsCookie.clear();
}
