import 'server-only';

import { cookies } from 'next/headers';

export const WISHLIST_SESSION_COOKIE = 'ct_wishlist';

export type WishlistSession = {
  anonymousId: string;
  shoppingListId: string;
};

export function parseWishlistSession(value: string | undefined): WishlistSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<WishlistSession>;
    if (
      typeof parsed.anonymousId === 'string' &&
      typeof parsed.shoppingListId === 'string'
    ) {
      return { anonymousId: parsed.anonymousId, shoppingListId: parsed.shoppingListId };
    }
  } catch {
    return null;
  }

  return null;
}

export async function getWishlistSession(): Promise<WishlistSession | null> {
  const cookieStore = await cookies();
  return parseWishlistSession(cookieStore.get(WISHLIST_SESSION_COOKIE)?.value);
}

export async function setWishlistSession(session: WishlistSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(WISHLIST_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearWishlistSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(WISHLIST_SESSION_COOKIE);
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
