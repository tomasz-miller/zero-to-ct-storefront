import 'server-only';

import { createCookieSession } from '@/lib/session/cookie-session';

export const CART_SESSION_COOKIE = 'ct_guest_cart';

export type CartSession = {
  anonymousId: string;
  cartId: string;
};

export function parseCartSession(value: unknown): CartSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as Partial<CartSession>;
  if (typeof parsed.anonymousId === 'string' && typeof parsed.cartId === 'string') {
    return { anonymousId: parsed.anonymousId, cartId: parsed.cartId };
  }

  return null;
}

const cartSessionCookie = createCookieSession<CartSession>({
  name: CART_SESSION_COOKIE,
  maxAge: 60 * 60 * 24 * 30,
  parse: parseCartSession,
});

export function getCartSession(): Promise<CartSession | null> {
  return cartSessionCookie.read();
}

export function setCartSession(session: CartSession): Promise<boolean> {
  return cartSessionCookie.write(session);
}

export function clearCartSession(): Promise<boolean> {
  return cartSessionCookie.clear();
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
