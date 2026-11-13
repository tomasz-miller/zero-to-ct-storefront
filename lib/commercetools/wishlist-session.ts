import 'server-only';

import { createCookieSession } from '@/lib/session/cookie-session';

export const WISHLIST_SESSION_COOKIE = 'ct_wishlist';

export type WishlistSession = {
  anonymousId: string;
  shoppingListId: string;
};

export function parseWishlistSession(value: unknown): WishlistSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as Partial<WishlistSession>;
  if (
    typeof parsed.anonymousId === 'string' &&
    typeof parsed.shoppingListId === 'string'
  ) {
    return { anonymousId: parsed.anonymousId, shoppingListId: parsed.shoppingListId };
  }

  return null;
}

const wishlistSessionCookie = createCookieSession<WishlistSession>({
  name: WISHLIST_SESSION_COOKIE,
  maxAge: 60 * 60 * 24 * 30,
  parse: parseWishlistSession,
});

export function getWishlistSession(): Promise<WishlistSession | null> {
  return wishlistSessionCookie.read();
}

export function setWishlistSession(session: WishlistSession): Promise<boolean> {
  return wishlistSessionCookie.write(session);
}

export function clearWishlistSession(): Promise<boolean> {
  return wishlistSessionCookie.clear();
}

export function createWishlistAnonymousId(): string {
  return crypto.randomUUID();
}

/** Rotate anonymousId after CT associates the list with a customer. */
export async function rotateWishlistSessionAnonymousId(): Promise<void> {
  const session = await getWishlistSession();
  if (!session) {
    return;
  }

  await setWishlistSession({
    anonymousId: createWishlistAnonymousId(),
    shoppingListId: session.shoppingListId,
  });
}
