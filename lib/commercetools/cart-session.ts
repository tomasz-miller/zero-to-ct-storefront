import 'server-only';

import { cookies } from 'next/headers';

export const CART_SESSION_COOKIE = 'ct_guest_cart';

export type CartSession = {
  anonymousId: string;
  cartId: string;
};

export function parseCartSession(value: string | undefined): CartSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CartSession>;
    if (
      typeof parsed.anonymousId === 'string' &&
      typeof parsed.cartId === 'string'
    ) {
      return { anonymousId: parsed.anonymousId, cartId: parsed.cartId };
    }
  } catch {
    return null;
  }

  return null;
}

export async function getCartSession(): Promise<CartSession | null> {
  const cookieStore = await cookies();
  return parseCartSession(cookieStore.get(CART_SESSION_COOKIE)?.value);
}

export async function setCartSession(session: CartSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CART_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCartSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CART_SESSION_COOKIE);
}

export function createAnonymousId(): string {
  return crypto.randomUUID();
}

/** Rotate anonymousId after CT consumes it during sign-in/sign-up. */
export async function rotateCartSessionAnonymousId(): Promise<void> {
  const session = await getCartSession();
  if (!session) {
    return;
  }

  await setCartSession({
    anonymousId: createAnonymousId(),
    cartId: session.cartId,
  });
}
