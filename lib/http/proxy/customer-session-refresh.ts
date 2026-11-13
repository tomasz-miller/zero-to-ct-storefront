import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';

import { customerSessionCookie } from '@/lib/commercetools/customer-session';
import {
  CUSTOMER_TOKEN_REFRESH_BUFFER_MS,
  isCustomerSessionRejected,
  refreshCustomerSession,
} from '@/lib/commercetools/customer-token';

/**
 * Refreshes a customer access token that is about to expire. Server Components cannot write
 * cookies, so the proxy does it: the new sealed cookie goes to the browser (response) and to the
 * rest of this request (request headers forwarded upstream).
 * https://docs.commercetools.com/api/authorization.md#refresh-token-flow
 */
export async function withRefreshedCustomerSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const name = customerSessionCookie.name;
  const session = customerSessionCookie.readFrom(request.cookies);
  if (!session || session.expiresAt > Date.now() + CUSTOMER_TOKEN_REFRESH_BUFFER_MS) {
    return response;
  }

  try {
    const refreshed = await refreshCustomerSession(session);
    const value = customerSessionCookie.serialize(refreshed);
    request.cookies.set(name, value);
    const next = NextResponse.next({ request: { headers: request.headers } });
    next.cookies.set(name, value, customerSessionCookie.cookieOptions);
    return next;
  } catch (error) {
    if (isCustomerSessionRejected(error)) {
      request.cookies.delete(name);
      const next = NextResponse.next({ request: { headers: request.headers } });
      next.cookies.delete(name);
      return next;
    }
    const status =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode: unknown }).statusCode
        : undefined;
    console.error('[proxy] customer token refresh failed', { status });
    return response;
  }
}
