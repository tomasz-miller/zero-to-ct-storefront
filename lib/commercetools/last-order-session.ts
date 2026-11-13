import 'server-only';

import { createCookieSession } from '@/lib/session/cookie-session';

export const LAST_ORDER_COOKIE = 'ct_last_order';

export type LastOrderSession = {
  orderNumber: string;
  cartId: string;
};

export function parseLastOrderSession(value: unknown): LastOrderSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as Partial<LastOrderSession>;
  if (typeof parsed.orderNumber === 'string' && typeof parsed.cartId === 'string') {
    return { orderNumber: parsed.orderNumber, cartId: parsed.cartId };
  }

  return null;
}

const lastOrderCookie = createCookieSession<LastOrderSession>({
  name: LAST_ORDER_COOKIE,
  maxAge: 60 * 60 * 24,
  parse: parseLastOrderSession,
});

export function getLastOrderSession(): Promise<LastOrderSession | null> {
  return lastOrderCookie.read();
}

export function setLastOrderSession(session: LastOrderSession): Promise<boolean> {
  return lastOrderCookie.write(session);
}
