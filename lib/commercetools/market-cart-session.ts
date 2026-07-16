import 'server-only';

import { cookies } from 'next/headers';

import type { StorefrontCountry } from './storefront-context';

export const MARKET_CARTS_COOKIE = 'ct_market_carts';

export type MarketCartMap = {
  anonymousId: string;
  carts: Partial<Record<StorefrontCountry, string>>;
};

function isStorefrontCountry(value: unknown): value is StorefrontCountry {
  return value === 'DE' || value === 'GB' || value === 'US';
}

export function parseMarketCartMap(
  value: string | undefined,
): MarketCartMap | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<MarketCartMap>;
    if (typeof parsed.anonymousId !== 'string' || !parsed.carts) {
      return null;
    }

    const carts: MarketCartMap['carts'] = {};
    for (const [country, cartId] of Object.entries(parsed.carts)) {
      if (isStorefrontCountry(country) && typeof cartId === 'string') {
        carts[country] = cartId;
      }
    }

    return {
      anonymousId: parsed.anonymousId,
      carts,
    };
  } catch {
    return null;
  }
}

export async function getMarketCartMap(): Promise<MarketCartMap | null> {
  try {
    const cookieStore = await cookies();
    return parseMarketCartMap(cookieStore.get(MARKET_CARTS_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function setMarketCartMap(map: MarketCartMap): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(MARKET_CARTS_COOKIE, JSON.stringify(map), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // Next.js only allows cookie writes in Route Handlers / Server Actions.
    // Cart reads from RSC (e.g. /cart) must not fail when syncing the map.
  }
}

export async function rememberCartForCountry(
  country: StorefrontCountry,
  cartId: string,
  anonymousId: string,
): Promise<void> {
  const existing = await getMarketCartMap();
  if (
    existing?.carts[country] === cartId &&
    (existing.anonymousId === anonymousId || Boolean(existing.anonymousId))
  ) {
    return;
  }

  const carts = { ...(existing?.carts ?? {}) };
  carts[country] = cartId;

  await setMarketCartMap({
    anonymousId: existing?.anonymousId ?? anonymousId,
    carts,
  });
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

  await setMarketCartMap({
    anonymousId: existing.anonymousId,
    carts,
  });
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
