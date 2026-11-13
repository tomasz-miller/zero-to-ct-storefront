/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

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
import { CheckoutSessionError } from './domain-errors';

describe('createCheckoutSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('throws CheckoutSessionError without the response body', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(
      new Response('{"message":"project key x"}', {
        status: 400,
        headers: { 'x-correlation-id': 'c' },
      }),
    );

    const err = await createCheckoutSession(
      'cart-1',
      'DE',
      'ZT-20261113-0000ABCD',
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CheckoutSessionError);
    expect((err as Error).message).not.toContain('project key');
    expect(log).toHaveBeenCalledWith('[checkout-session]', {
      status: 400,
      ctCorrelationId: 'c',
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('project key');
  });

  // Pins that the error-path rewrite kept 1A T8's success path; Track 5 T1 lists this case as kept.
  it('still sends futureOrderNumber in the session metadata', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'sess-2' }), { status: 201 }),
    );

    await expect(
      createCheckoutSession('cart-1', 'DE', 'ZT-20261113-0000ABCD'),
    ).resolves.toBe('sess-2');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://session.example.com/demo-project/sessions',
      expect.objectContaining({
        body: expect.stringContaining('"futureOrderNumber":"ZT-20261113-0000ABCD"'),
      }),
    );
  });
});
