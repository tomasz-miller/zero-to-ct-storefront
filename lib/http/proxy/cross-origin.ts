import type { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * True for a state-changing request to /api/* that a browser reports as cross-origin.
 * Sec-Fetch-Site wins when present; browsers without it fall back to the Origin header.
 * Clients that send neither (curl, server-to-server) cannot carry a victim's cookies, so they pass.
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
 */
export function isUnsafeCrossOriginRequest(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  if (!request.nextUrl.pathname.startsWith('/api/')) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null) return fetchSite !== 'same-origin';

  const origin = request.headers.get('origin');
  if (origin !== null) return origin !== request.nextUrl.origin;

  return false;
}
