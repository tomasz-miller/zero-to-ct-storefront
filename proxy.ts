import { NextResponse, type NextRequest } from 'next/server';

import { isUnsafeCrossOriginRequest } from '@/lib/http/proxy/cross-origin';
import { withRefreshedCustomerSession } from '@/lib/http/proxy/customer-session-refresh';

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (isUnsafeCrossOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return withRefreshedCustomerSession(request, NextResponse.next());
}

export const config = {
  matcher: [
    // Every API route runs the proxy (cross-origin guard, token refresh), whatever its last
    // segment looks like: the static-asset exclusion below is only for pages and public files.
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
