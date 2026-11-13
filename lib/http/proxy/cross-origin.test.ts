/**
 * @vitest-environment node
 */
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { isUnsafeCrossOriginRequest } from './cross-origin';

describe('isUnsafeCrossOriginRequest', () => {
  it.each([
    ['GET', '/api/cart', { 'sec-fetch-site': 'cross-site' }, false],
    ['POST', '/api/cart/items', { 'sec-fetch-site': 'cross-site' }, true],
    ['POST', '/api/cart/items', { 'sec-fetch-site': 'same-site' }, true],
    ['POST', '/api/cart/items', { 'sec-fetch-site': 'same-origin' }, false],
    ['POST', '/api/cart/items', { origin: 'https://evil.example' }, true],
    ['POST', '/api/cart/items', { origin: 'http://localhost:3000' }, false],
    ['POST', '/api/cart/items', {}, false],
    [
      'DELETE',
      '/api/customer/addresses/a1',
      { 'sec-fetch-site': 'cross-site', 'content-type': 'text/plain' },
      true,
    ],
    ['POST', '/account', { 'sec-fetch-site': 'cross-site' }, false],
  ])('%s %s %o -> %s', (method, path, headers, expected) => {
    expect(
      isUnsafeCrossOriginRequest(
        new NextRequest(`http://localhost:3000${path}`, { method, headers }),
      ),
    ).toBe(expected);
  });
});
