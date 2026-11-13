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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
