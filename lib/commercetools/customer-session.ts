import 'server-only';

import { createCookieSession } from '@/lib/session/cookie-session';

export const CUSTOMER_SESSION_COOKIE = 'ct_customer_session';

export type CustomerSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  customerId: string;
};

export function parseCustomerSession(value: unknown): CustomerSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as Partial<CustomerSession>;
  if (
    typeof parsed.accessToken === 'string' &&
    typeof parsed.refreshToken === 'string' &&
    typeof parsed.expiresAt === 'number' &&
    typeof parsed.customerId === 'string'
  ) {
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      customerId: parsed.customerId,
    };
  }

  return null;
}

export const customerSessionCookie = createCookieSession<CustomerSession>({
  name: CUSTOMER_SESSION_COOKIE,
  maxAge: 60 * 60 * 24 * 30,
  parse: parseCustomerSession,
});

export function getCustomerSession(): Promise<CustomerSession | null> {
  return customerSessionCookie.read();
}

export function setCustomerSession(session: CustomerSession): Promise<boolean> {
  return customerSessionCookie.write(session);
}

export function clearCustomerSession(): Promise<boolean> {
  return customerSessionCookie.clear();
}
