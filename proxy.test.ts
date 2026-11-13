/**
 * @vitest-environment node
 */
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { config, proxy } from './proxy';

describe('proxy', () => {
  it('rejects a cross-site POST to /api with 403', async () => {
    const res = await proxy(
      new NextRequest('http://localhost:3000/api/cart/items', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'cross-site' },
      }),
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('passes a same-origin GET through', async () => {
    const res = await proxy(
      new NextRequest('http://localhost:3000/', {
        headers: { 'sec-fetch-site': 'same-origin' },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('exports the static-asset-excluding matcher after the explicit api entry', () => {
    expect(config.matcher).toEqual([
      '/api/:path*',
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ]);
  });

  describe('matcher as compiled by Next', () => {
    // Next's own matcher compiler (documented in proxy.md, "Unit testing (experimental)").
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

    it.each([
      '/api/cart',
      '/api/cart/items/abc.svg',
      '/api/customer/addresses/abc.png',
      '/api/customer/addresses/abc.jpg',
      '/api/customer/addresses/abc.jpeg',
      '/api/wishlist/items/abc.gif',
      '/api/wishlist/items/abc.webp',
      '/api/cart/items/abc.ico',
    ])('runs the proxy on %s', (pathname) => {
      expect(matches(pathname)).toBe(true);
    });

    it.each(['/', '/account', '/products/shirt'])('runs the proxy on page %s', (pathname) => {
      expect(matches(pathname)).toBe(true);
    });

    it.each(['/logo.svg', '/images/hero.png', '/favicon.ico', '/_next/static/chunks/a.js'])(
      'skips the static asset %s',
      (pathname) => {
        expect(matches(pathname)).toBe(false);
      },
    );
  });
});
