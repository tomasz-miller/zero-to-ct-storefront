/**
 * @vitest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));
vi.mock('@/lib/commercetools/customer-token', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/commercetools/customer-token')>()),
  refreshCustomerSession: mockRefresh,
}));

import { CtFetchError } from '@/lib/commercetools/ct-errors';
import {
  CUSTOMER_SESSION_COOKIE,
  customerSessionCookie,
  type CustomerSession,
} from '@/lib/commercetools/customer-session';

import { withRefreshedCustomerSession } from './customer-session-refresh';

const near = {
  accessToken: 'a-old',
  refreshToken: 'r-old',
  expiresAt: Date.now() + 30_000,
  customerId: 'cust-1',
};
const requestWith = (s?: CustomerSession) =>
  new NextRequest('http://localhost:3000/account', {
    headers: s
      ? { cookie: `${CUSTOMER_SESSION_COOKIE}=${customerSessionCookie.serialize(s)}` }
      : {},
  });

describe('withRefreshedCustomerSession', () => {
  it('returns the given response when there is no session', async () => {
    const response = NextResponse.next();
    await expect(withRefreshedCustomerSession(requestWith(), response)).resolves.toBe(response);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('returns the given response when the token is not near expiry', async () => {
    const response = NextResponse.next();
    await expect(
      withRefreshedCustomerSession(
        requestWith({ ...near, expiresAt: Date.now() + 3_600_000 }),
        response,
      ),
    ).resolves.toBe(response);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('refreshes a token expiring within 60 s and sets the sealed cookie on request and response', async () => {
    mockRefresh.mockResolvedValueOnce({
      ...near,
      accessToken: 'a-new',
      expiresAt: Date.now() + 172_800_000,
    });
    const request = requestWith(near);
    const result = await withRefreshedCustomerSession(request, NextResponse.next());
    expect(customerSessionCookie.readFrom(result.cookies)?.accessToken).toBe('a-new');
    expect(customerSessionCookie.readFrom(request.cookies)?.accessToken).toBe('a-new');
    expect(result.headers.get('x-middleware-request-cookie')).toContain(
      `${CUSTOMER_SESSION_COOKIE}=`,
    );
  });

  it('deletes the cookie when refresh fails with 401', async () => {
    mockRefresh.mockRejectedValueOnce(new CtFetchError(401, null, null));
    const request = requestWith(near);
    const result = await withRefreshedCustomerSession(request, NextResponse.next());
    expect(result.cookies.get(CUSTOMER_SESSION_COOKIE)?.value).toBe('');
    expect(request.cookies.has(CUSTOMER_SESSION_COOKIE)).toBe(false);
  });

  it('keeps the cookie when refresh fails with 503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRefresh.mockRejectedValueOnce(new CtFetchError(503, null, null));
    const response = NextResponse.next();
    await expect(withRefreshedCustomerSession(requestWith(near), response)).resolves.toBe(response);
  });

  it('keeps the response unchanged when refresh fails with a network error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRefresh.mockRejectedValueOnce(new TypeError('fetch failed'));
    const response = NextResponse.next();
    await expect(withRefreshedCustomerSession(requestWith(near), response)).resolves.toBe(
      response,
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/a-old|r-old/);
  });
});
