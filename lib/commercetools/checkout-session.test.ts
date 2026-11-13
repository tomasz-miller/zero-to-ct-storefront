/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

vi.mock('./access-token', () => ({
  getClientCredentialsAccessToken: vi.fn(async () => 'tok'),
}));

vi.mock('./storefront-context', () => ({
  resolveCheckoutApplicationKey: vi.fn(() => 'app-de'),
}));

vi.stubGlobal('fetch', fetchMock);

import { createCheckoutSession } from './checkout-session';

describe('createCheckoutSession', () => {
  it('sends the futureOrderNumber in the session metadata', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'sess-1' }), { status: 201 }),
    );

    await expect(
      createCheckoutSession('cart-1', 'DE', 'ZT-20261113-0000ABCD'),
    ).resolves.toBe('sess-1');

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('https://session.example.com/demo-project/sessions');
    expect(JSON.parse(init.body)).toEqual({
      cart: { cartRef: { id: 'cart-1' } },
      metadata: { applicationKey: 'app-de', futureOrderNumber: 'ZT-20261113-0000ABCD' },
    });
  });
});
