/**
 * @vitest-environment node
 */
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

  it('exports the static-asset-excluding matcher', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ]);
  });
});
