import 'server-only';

import { cookies } from 'next/headers';

export const CUSTOMER_SESSION_COOKIE = 'ct_customer_session';

export type CustomerSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  customerId: string;
};

export function parseCustomerSession(value: string | undefined): CustomerSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CustomerSession>;
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
  } catch {
    return null;
  }

  return null;
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  return parseCustomerSession(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
}

export async function setCustomerSession(session: CustomerSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}
